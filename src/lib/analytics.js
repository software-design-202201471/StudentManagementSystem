import { connectDB } from '@/lib/mongoose';
import { GRADE_SCALE } from '@/lib/gradeConstants';
import User from '@/models/User';
import Grade from '@/models/Grade';
import Record from '@/models/Record';
import Feedback from '@/models/Feedback';
import Counseling from '@/models/Counseling';
import AnalyticsStudent from '@/models/AnalyticsStudent';
import AnalyticsSubject from '@/models/AnalyticsSubject';

/** 정수 평균 (빈 배열 → 0) */
function avg(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** semester 오름차순 그룹 통계 [{semester, count, averagePercentage}] */
function buildSemesterStats(grades) {
  const map = new Map();
  for (const g of grades) {
    if (!map.has(g.semester)) map.set(g.semester, []);
    map.get(g.semester).push(g.percentage || 0);
  }
  return Array.from(map, ([semester, ps]) => ({
    semester,
    count: ps.length,
    averagePercentage: avg(ps),
  })).sort((a, b) => a.semester.localeCompare(b.semester));
}

/**
 * 학생 1명의 운영 데이터를 집계해 AnalyticsStudent를 upsert.
 * 학생이 아니거나 없으면 분석 문서 삭제(정합성).
 * @returns {object|null} 집계 결과 (없으면 null)
 */
export async function aggregateStudent(studentId) {
  await connectDB();

  const student = await User.findById(studentId).select(
    'name grade classNumber studentNumber role'
  );
  if (!student || student.role !== 'student') {
    await AnalyticsStudent.deleteOne({ studentId });
    return null;
  }

  const [grades, record, feedbacks, counselings] = await Promise.all([
    Grade.find({ studentId }).lean(),
    Record.findOne({ studentId }).lean(),
    Feedback.find({ studentId }).lean(),
    Counseling.find({ studentId }).lean(),
  ]);

  // 성적
  const percentages = grades.map((g) => g.percentage || 0);
  const semesterStats = buildSemesterStats(grades);

  // 과목별 통계
  const subjMap = new Map();
  for (const g of grades) {
    if (!subjMap.has(g.subject)) subjMap.set(g.subject, []);
    subjMap.get(g.subject).push(g);
  }
  const subjectStats = Array.from(subjMap, ([subject, gs]) => {
    const ps = gs.map((g) => g.percentage || 0);
    const latest = gs.reduce((a, b) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b
    );
    return {
      subject,
      count: gs.length,
      averagePercentage: avg(ps),
      latestGrade: latest.grade || '',
    };
  }).sort((a, b) => a.subject.localeCompare(b.subject));

  // 출결
  const att = record?.attendance || {};
  const attendance = {
    absent: att.absent || 0,
    late: att.late || 0,
    early: att.early || 0,
  };

  // 피드백 (content 미사용 → lean 그대로, category만 집계)
  const feedbackByCategory = { grade: 0, behavior: 0, attitude: 0, attendance: 0 };
  for (const f of feedbacks) {
    if (feedbackByCategory[f.category] !== undefined) {
      feedbackByCategory[f.category] += 1;
    }
  }

  // 상담
  const lastCounselingDate = counselings.length
    ? counselings.reduce((a, b) =>
        new Date(a.date) > new Date(b.date) ? a : b
      ).date
    : null;

  const doc = {
    studentId,
    name: student.name || '',
    grade: student.grade ?? null,
    classNumber: student.classNumber ?? null,
    studentNumber: student.studentNumber ?? null,
    gradeCount: grades.length,
    averagePercentage: avg(percentages),
    semesterStats,
    subjectStats,
    attendance,
    feedbackCount: feedbacks.length,
    feedbackByCategory,
    counselingCount: counselings.length,
    lastCounselingDate,
    lastAggregatedAt: new Date(),
  };

  await AnalyticsStudent.findOneAndUpdate(
    { studentId },
    { $set: doc },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return doc;
}

/**
 * 과목 1개의 성적을 집계해 AnalyticsSubject를 upsert.
 * 해당 과목 성적이 0건이면 분석 문서 삭제(정합성).
 * @returns {object|null}
 */
export async function aggregateSubject(subject) {
  await connectDB();

  const grades = await Grade.find({ subject }).lean();
  if (grades.length === 0) {
    await AnalyticsSubject.deleteOne({ subject });
    return null;
  }

  const percentages = grades.map((g) => g.percentage || 0);
  const studentIds = new Set(grades.map((g) => g.studentId.toString()));

  // 등급 분포 (GRADE_SCALE 순서 보존)
  const distMap = new Map(GRADE_SCALE.map((g) => [g.grade, 0]));
  for (const g of grades) {
    if (distMap.has(g.grade)) distMap.set(g.grade, distMap.get(g.grade) + 1);
  }
  const gradeDistribution = GRADE_SCALE.map((g) => ({
    grade: g.grade,
    count: distMap.get(g.grade),
  }));

  const doc = {
    subject,
    gradeCount: grades.length,
    studentCount: studentIds.size,
    averagePercentage: avg(percentages),
    maxPercentage: Math.max(...percentages),
    minPercentage: Math.min(...percentages),
    gradeDistribution,
    semesterStats: buildSemesterStats(grades),
    lastAggregatedAt: new Date(),
  };

  await AnalyticsSubject.findOneAndUpdate(
    { subject },
    { $set: doc },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return doc;
}

/**
 * 전체 재집계: 모든 학생 + 모든 과목.
 * orphan(삭제된 학생/과목)의 분석 문서도 정리.
 * @returns {{ studentsProcessed: number, subjectsProcessed: number }}
 */
export async function aggregateAll() {
  await connectDB();

  const students = await User.find({ role: 'student' })
    .select('_id')
    .lean();
  const studentIds = students.map((s) => s._id);
  const subjects = await Grade.distinct('subject');

  // orphan 정리 — 현재 운영 데이터에 없는 분석 문서 제거
  await AnalyticsStudent.deleteMany({ studentId: { $nin: studentIds } });
  await AnalyticsSubject.deleteMany({ subject: { $nin: subjects } });

  let studentsProcessed = 0;
  for (const id of studentIds) {
    await aggregateStudent(id);
    studentsProcessed += 1;
  }

  let subjectsProcessed = 0;
  for (const subject of subjects) {
    await aggregateSubject(subject);
    subjectsProcessed += 1;
  }

  return { studentsProcessed, subjectsProcessed };
}
