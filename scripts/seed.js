// scripts/seed.js
// 실제 환경 모사 시드 — 테스트중학교 1개에:
//  · 교사 3명 (국어/영어/수학)
//  · 학생 10명 (2학년 1반·2반 각 5명) + 학부모 10명 (자동 자녀 연결)
//  · 각 학생 × 3과목 성적(등급 자동 계산) + 학생부 출결 + 피드백·상담 더미
// 재실행 시 해당 학교 운영 데이터(성적/학생부/피드백/상담/분석)를 초기화 후 재생성.
// (계정은 email upsert로 유지 — 로그인 호환)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { calculateGrade } from '../src/lib/gradeConstants.js';

dotenv.config({ path: '.env.local' });

const OID = mongoose.Schema.Types.ObjectId;

// ── 모델 인라인 정의 (scripts는 @/ alias 미적용) ──
const School = mongoose.models.School || mongoose.model('School',
  new mongoose.Schema({
    name: String, code: { type: String, unique: true },
    teacherCode: { type: String, unique: true }, status: String,
    studentCodeQuota: Number, studentCodesIssued: Number,
  }, { timestamps: true }));

const User = mongoose.models.User || mongoose.model('User',
  new mongoose.Schema({
    name: String, email: { type: String, unique: true }, passwordHash: String,
    role: String, grade: Number, classNumber: Number, studentNumber: Number,
    parentOf: [OID], schoolId: OID, status: String,
  }, { timestamps: true }));

const Grade = mongoose.models.Grade || mongoose.model('Grade',
  new mongoose.Schema({
    schoolId: OID, studentId: OID, teacherId: OID, semester: String,
    subject: String, score: Number, totalScore: Number,
    percentage: Number, grade: String,
  }, { timestamps: true }));

const Record = mongoose.models.Record || mongoose.model('Record',
  new mongoose.Schema({
    schoolId: OID, studentId: OID,
    attendance: { absent: Number, late: Number, early: Number },
    specialNotes: String, customFields: [{ label: String, value: String }],
  }, { timestamps: true }));

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback',
  new mongoose.Schema({
    schoolId: OID, studentId: OID, teacherId: OID, category: String,
    content: String, isVisibleToStudent: Boolean, isVisibleToParent: Boolean,
  }, { timestamps: true }));

const Counseling = mongoose.models.Counseling || mongoose.model('Counseling',
  new mongoose.Schema({
    schoolId: OID, studentId: OID, teacherId: OID, date: Date,
    content: String, nextPlan: String, isShared: Boolean,
    isVisibleToParent: Boolean,
  }, { timestamps: true }));

// ── 데이터 정의 ──
const SUBJECTS = ['국어', '영어', '수학'];
const SEMESTER = '2025-1';
const FB_CATEGORIES = ['grade', 'behavior', 'attitude', 'attendance'];

// 결정적 점수 (재현 가능)
function scoreFor(studentIdx, subjIdx) {
  return 55 + ((studentIdx * 13 + subjIdx * 17 + 7) % 46); // 55~100
}

async function upsertUser(fields) {
  const passwordHash = await bcrypt.hash(process.env.PW, 12);
  return User.findOneAndUpdate(
    { email: fields.email },
    { ...fields, passwordHash, status: 'active' },
    { upsert: true, returnDocument: 'after' }
  );
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB 연결 완료');

  // 1) 학교
  const school = await School.findOneAndUpdate(
    { code: 'SCH-TEST01' },
    {
      name: '테스트중학교', code: 'SCH-TEST01', teacherCode: 'TCH-TEST01',
      status: 'active', studentCodeQuota: 100,
    },
    { upsert: true, returnDocument: 'after' }
  );
  const schoolId = school._id;
  console.log(`✅ 학교: ${school.name} (${school.code} / 교사코드 ${school.teacherCode})`);

  // 2) 교사 3명 (과목별)
  const teacherDefs = [
    { name: '김국어', email: 'teacher@test.com', subject: '국어' },
    { name: '이영어', email: 'teacher2@test.com', subject: '영어' },
    { name: '박수학', email: 'teacher3@test.com', subject: '수학' },
  ];
  const teachers = {};
  for (const t of teacherDefs) {
    const doc = await upsertUser({
      name: t.name, email: t.email, role: 'teacher', schoolId,
    });
    teachers[t.subject] = doc._id;
  }
  console.log(`✅ 교사 ${teacherDefs.length}명 (국어/영어/수학)`);

  // 3) 학생 10명 (2학년 1반·2반 각 5명)
  const students = [];
  for (let i = 0; i < 10; i += 1) {
    const classNumber = i < 5 ? 1 : 2;
    const studentNumber = (i % 5) + 1;
    const email = i === 0 ? 'student@test.com' : `student${String(i + 1).padStart(2, '0')}@test.com`;
    const name = i === 0 ? '이학생' : `학생${String(i + 1).padStart(2, '0')}`;
    const doc = await upsertUser({
      name, email, role: 'student', schoolId,
      grade: 2, classNumber, studentNumber,
    });
    students.push(doc);
  }
  console.log(`✅ 학생 ${students.length}명 (2-1반 5, 2-2반 5)`);

  // 4) 학부모 10명 (자동 자녀 연결)
  for (let i = 0; i < 10; i += 1) {
    const email = i === 0 ? 'parent@test.com' : `parent${String(i + 1).padStart(2, '0')}@test.com`;
    const name = i === 0 ? '박학부모' : `학부모${String(i + 1).padStart(2, '0')}`;
    const doc = await upsertUser({ name, email, role: 'parent', schoolId });
    await User.updateOne({ _id: doc._id }, { $set: { parentOf: [students[i]._id] } });
  }
  console.log('✅ 학부모 10명 + 자녀 자동 연결');

  // 5) 운영 데이터 초기화 (재시드 누적 방지)
  await Promise.all([
    Grade.deleteMany({ schoolId }),
    Record.deleteMany({ schoolId }),
    Feedback.deleteMany({ schoolId }),
    Counseling.deleteMany({ schoolId }),
  ]);

  // 6) 성적 (학생 × 3과목)
  const gradeDocs = [];
  students.forEach((s, si) => {
    SUBJECTS.forEach((subject, sj) => {
      const score = scoreFor(si, sj);
      const { percentage, grade } = calculateGrade(score, 100);
      gradeDocs.push({
        schoolId, studentId: s._id, teacherId: teachers[subject],
        semester: SEMESTER, subject, score, totalScore: 100, percentage, grade,
      });
    });
  });
  await Grade.insertMany(gradeDocs);
  console.log(`✅ 성적 ${gradeDocs.length}건 (학생 10 × 3과목)`);

  // 7) 학생부 (출결 + 특이사항)
  const recordDocs = students.map((s, i) => ({
    schoolId, studentId: s._id,
    attendance: { absent: i % 3, late: (i + 1) % 2, early: i % 2 },
    specialNotes: i % 4 === 0 ? '성실하며 학습 태도가 우수함.' : '',
    customFields: i % 5 === 0 ? [{ label: '진로희망', value: '교사' }] : [],
  }));
  await Record.insertMany(recordDocs);
  console.log(`✅ 학생부 ${recordDocs.length}건`);

  // 8) 피드백 (앞 6명, 교사별 1건씩 순환)
  const feedbackDocs = [];
  for (let i = 0; i < 6; i += 1) {
    const subject = SUBJECTS[i % 3];
    feedbackDocs.push({
      schoolId, studentId: students[i]._id, teacherId: teachers[subject],
      category: FB_CATEGORIES[i % FB_CATEGORIES.length],
      content: `${students[i].name} 학생은 ${subject} 수업에서 적극적으로 참여합니다.`,
      isVisibleToStudent: i % 2 === 0,
      isVisibleToParent: i % 3 === 0,
    });
  }
  await Feedback.insertMany(feedbackDocs);
  console.log(`✅ 피드백 ${feedbackDocs.length}건`);

  // 9) 상담 (학생 0,2,4 — 담임=국어교사 가정)
  const counselingDocs = [];
  [0, 2, 4].forEach((i, k) => {
    counselingDocs.push({
      schoolId, studentId: students[i]._id, teacherId: teachers['국어'],
      date: new Date(`2025-0${4 + k}-15`),
      content: `${students[i].name} 학생 진로 상담을 진행함.`,
      nextPlan: '다음 학기 학습 계획 수립 예정.',
      isShared: k % 2 === 0,
      isVisibleToParent: k === 0,
    });
  });
  await Counseling.insertMany(counselingDocs);
  console.log(`✅ 상담 ${counselingDocs.length}건`);

  await mongoose.disconnect();
  console.log('\n시드 완료 — 분석 대시보드에서 "지금 재집계"를 실행하세요.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
