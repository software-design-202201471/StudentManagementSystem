// scripts/seed.js
// 실제 환경 모사 시드 — 테스트중학교 1개에:
//  · 교사 3명 (국어/영어/수학)
//  · 학생 10명 (2학년 1반·2반 각 5명) + 학부모 10명 (자동 자녀 연결)
//  · 각 학생 × 3과목 성적(등급 자동 계산) + 학생부 출결 + 피드백·상담 더미
//
// ⚠️ 이 스크립트는 연결된 DB를 통째로 초기화(dropDatabase) 후 재생성한다.
//    테스트 DB 전용. 운영 DB에 절대 실행하지 말 것.
//
// 보안: name/email/성적/상담·피드백 내용은 src/lib/crypto.js로 직접 암호화하여
//       저장하고, 로그인용 emailHash(blind index)를 함께 기록한다.
//       → 실제 모델의 getter가 그대로 복호화하므로 앱과 100% 호환.
//       (scripts는 @/ alias 미적용이라 모델은 인라인 정의하되, crypto는 상대경로 import)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { calculateGrade } from '../src/lib/gradeConstants.js';
import { encryptString, emailHash } from '../src/lib/crypto.js';

dotenv.config({ path: '.env.local' });

const OID = mongoose.Schema.Types.ObjectId;

// 암호화 헬퍼 — 실제 모델의 set 로직과 동일하게 ciphertext 생성.
const enc = (v) => encryptString(v); // 문자열
const encNum = (v) => encryptString(String(v)); // 숫자 → 문자열 직렬화 후 암호화

// ── 모델 인라인 정의 (scripts는 @/ alias 미적용) ──
// 암호화 필드는 ciphertext 문자열을 담으므로 모두 String 타입으로 둔다.
const School = mongoose.models.School || mongoose.model('School',
  new mongoose.Schema({
    name: String, code: { type: String, unique: true },
    teacherCode: { type: String, unique: true }, status: String,
    studentCodeQuota: Number, studentCodesIssued: Number,
  }, { timestamps: true }));

// email은 unique 미선언 (암호문은 IV마다 달라 무의미 — emailHash로 보장).
const User = mongoose.models.User || mongoose.model('User',
  new mongoose.Schema({
    name: String, email: String, emailHash: String, passwordHash: String,
    role: String, grade: Number, classNumber: Number, studentNumber: Number,
    parentOf: [OID], schoolId: OID, status: String,
  }, { timestamps: true }));

const Grade = mongoose.models.Grade || mongoose.model('Grade',
  new mongoose.Schema({
    schoolId: OID, studentId: OID, teacherId: OID, semester: String,
    subject: String, score: String, totalScore: String,
    percentage: String, grade: String,
    gradeLevel: Number, classNumber: Number, studentNumber: Number,
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
    gradeLevel: Number, classNumber: Number, studentNumber: Number,
  }, { timestamps: true }));

// ── 데이터 정의 ──
const SUBJECTS = ['국어', '영어', '수학'];
const SEMESTERS = ['2025-1', '2025-2', '2026-1'];
// 학기별 대표 상담 일자 (해당 학기 범위 내)
const SEMESTER_DATES = {
  '2025-1': '2025-05-15',
  '2025-2': '2025-10-20',
  '2026-1': '2026-05-12',
};
const FB_CATEGORIES = ['grade', 'behavior', 'attitude', 'attendance'];
const CAREERS = [
  '교사', '의사', '프로그래머', '운동선수', '예술가',
  '과학자', '요리사', '변호사', '간호사', '기자',
];

// 학생 성향: 0=성장형(+), 1=하락형(-), 2=안정형(0) — 학기 진행에 따른 점수 증감.
function trendDelta(studentIdx) {
  const m = studentIdx % 3;
  if (m === 0) return 6;
  if (m === 1) return -5;
  return 0;
}

// 결정적·다양한 점수 (학생/과목/학기별). 40~100 클램프.
function scoreFor(studentIdx, subjIdx, semIdx) {
  const base = 58 + ((studentIdx * 7 + subjIdx * 11) % 36); // 58~93
  const subjBias = ((studentIdx + subjIdx) % 3) * 4 - 4; // -4~+4 과목 편차
  const s = base + subjBias + trendDelta(studentIdx) * semIdx;
  return Math.max(40, Math.min(100, Math.round(s)));
}

// 학생별 누적 출결 (다양화 — 일부 학생은 출결 불량).
function attendanceFor(studentIdx) {
  return {
    absent: (studentIdx * 2) % 7, // 0~6
    late: (studentIdx * 3 + 1) % 5, // 0~4
    early: studentIdx % 3, // 0~2
  };
}

// 학적(진급) — 2025학년도 2학년 → 2026학년도 3학년. 학년이 바뀌면 반/번호도 재편성.
// 운영 레코드(성적·상담)에는 작성 시점(해당 학기 학년도)의 학적을 스냅샷한다.
const BASE_YEAR = 2025;
const LATEST_YEAR = 2026;
function academicYearOf(semester) {
  return Number(semester.split('-')[0]);
}
function enrollmentFor(studentIdx, year) {
  if (year <= BASE_YEAR) {
    return {
      gradeLevel: 2,
      classNumber: studentIdx < 5 ? 1 : 2,
      studentNumber: (studentIdx % 5) + 1,
    };
  }
  // 2026학년도: 진급(3학년) + 반 재편성
  return {
    gradeLevel: 3,
    classNumber: (studentIdx % 2) + 1,
    studentNumber: Math.floor(studentIdx / 2) + 1,
  };
}

const avgOf = (arr) =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

// 성적 평균 + 출결에 따른 학생부 특이사항 생성 (성적·출결에 따라 상이).
function specialNoteFor(avg, att) {
  let note;
  if (avg >= 85) note = '전 과목 성취도가 우수하며 학습 태도가 모범적임.';
  else if (avg >= 70) note = '전반적으로 성실하며 꾸준한 향상이 기대됨.';
  else note = '기초 학습 보강이 필요하며 개별 맞춤 지도를 권장함.';
  if (att.absent >= 4 || att.late >= 3) {
    note += ' 결석·지각이 잦아 출결 관리 지도가 필요함.';
  }
  return note;
}

// 평문 name/email을 받아 암호화 + emailHash 기록하여 생성.
async function createUser(fields) {
  const { name, email, ...rest } = fields;
  const passwordHash = await bcrypt.hash(process.env.PW, 12);
  return User.create({
    ...rest,
    name: enc(name),
    email: enc(email),
    emailHash: emailHash(email),
    passwordHash,
    status: 'active',
  });
}

async function seed() {
  if (!process.env.PW) {
    throw new Error('환경변수 PW(시드 계정 비밀번호)가 설정되지 않았습니다 (.env.local).');
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.warn(
      '⚠️ ENCRYPTION_KEY 미설정 — 데이터가 평문으로 시드됩니다. ' +
      '암호화를 검증하려면 .env.local에 32바이트 키를 설정 후 다시 실행하세요.'
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB 연결 완료');

  // 0) 초기화 — DB 전체 drop (컬렉션 + 인덱스 모두 제거, stale email unique 인덱스 포함)
  await mongoose.connection.dropDatabase();
  console.log('🗑️  DB 초기화 완료 (dropDatabase)');

  // 1) 학교
  const school = await School.create({
    name: '테스트중학교', code: 'SCH-TEST01', teacherCode: 'TCH-TEST01',
    status: 'active', studentCodeQuota: 100, studentCodesIssued: 0,
  });
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
    const doc = await createUser({
      name: t.name, email: t.email, role: 'teacher', schoolId,
    });
    teachers[t.subject] = doc._id;
  }
  console.log(`✅ 교사 ${teacherDefs.length}명 (국어/영어/수학)`);

  // 3) 학생 10명 (2학년 1반·2반 각 5명)
  const students = [];
  for (let i = 0; i < 10; i += 1) {
    // 현재(최신 학년도=2026) 학적을 User에 저장 — 과거 학적은 레코드 스냅샷에 보존.
    const cur = enrollmentFor(i, LATEST_YEAR);
    const email = i === 0 ? 'student@test.com' : `student${String(i + 1).padStart(2, '0')}@test.com`;
    const name = i === 0 ? '이학생' : `학생${String(i + 1).padStart(2, '0')}`;
    const doc = await createUser({
      name, email, role: 'student', schoolId,
      grade: cur.gradeLevel,
      classNumber: cur.classNumber,
      studentNumber: cur.studentNumber,
    });
    // name은 암호화 저장되므로, 이후 더미 텍스트 생성을 위해 평문 이름을 보관.
    students.push({ _id: doc._id, plainName: name });
  }
  console.log(`✅ 학생 ${students.length}명 (현재 3학년, 2025년엔 2학년)`);

  // 4) 학부모 10명 (자동 자녀 연결)
  for (let i = 0; i < 10; i += 1) {
    const email = i === 0 ? 'parent@test.com' : `parent${String(i + 1).padStart(2, '0')}@test.com`;
    const name = i === 0 ? '박학부모' : `학부모${String(i + 1).padStart(2, '0')}`;
    const doc = await createUser({ name, email, role: 'parent', schoolId });
    await User.updateOne({ _id: doc._id }, { $set: { parentOf: [students[i]._id] } });
  }
  console.log('✅ 학부모 10명 + 자녀 자동 연결');

  // 5) 성적 (학생 × 3과목 × 3학기) — 점수/백분율/등급 암호화 저장
  const gradeDocs = [];
  const studentScores = students.map(() => []); // si -> 전체 점수
  const studentSemScores = students.map(() => ({})); // si -> { sem: [점수] }
  students.forEach((s, si) => {
    SEMESTERS.forEach((semester, semIdx) => {
      studentSemScores[si][semester] = [];
      const enr = enrollmentFor(si, academicYearOf(semester)); // 당시 학적
      SUBJECTS.forEach((subject, sj) => {
        const score = scoreFor(si, sj, semIdx);
        const { percentage, grade } = calculateGrade(score, 100);
        studentScores[si].push(score);
        studentSemScores[si][semester].push(score);
        gradeDocs.push({
          schoolId, studentId: s._id, teacherId: teachers[subject],
          semester, subject,
          score: encNum(score), totalScore: encNum(100),
          percentage: encNum(percentage), grade: enc(grade),
          gradeLevel: enr.gradeLevel,
          classNumber: enr.classNumber,
          studentNumber: enr.studentNumber,
        });
      });
    });
  });
  await Grade.insertMany(gradeDocs);
  console.log(
    `✅ 성적 ${gradeDocs.length}건 (학생 ${students.length} × ${SUBJECTS.length}과목 × ${SEMESTERS.length}학기, 암호화)`
  );

  // 학생별 통계 — 학생부·피드백·상담 내용 다양화에 사용
  const stats = students.map((s, si) => ({
    att: attendanceFor(si),
    overallAvg: avgOf(studentScores[si]),
    semAvg: SEMESTERS.map((sem) => avgOf(studentSemScores[si][sem])),
    trend: trendDelta(si),
  }));

  // 6) 학생부 (출결 + 특이사항) — 출결·성적에 따라 특이사항/추가항목 다양화
  const recordDocs = students.map((s, si) => {
    const { att, overallAvg } = stats[si];
    const customFields = [
      { label: '진로희망', value: CAREERS[si % CAREERS.length] },
    ];
    if (overallAvg >= 85) {
      customFields.push({ label: '특기', value: '교내 학력 우수상 수상' });
    }
    if (att.absent >= 4) {
      customFields.push({ label: '비고', value: '출결 상담 진행 이력 있음' });
    }
    return {
      schoolId, studentId: s._id,
      attendance: att,
      specialNotes: specialNoteFor(overallAvg, att),
      customFields,
    };
  });
  await Record.insertMany(recordDocs);
  console.log(`✅ 학생부 ${recordDocs.length}건 (출결·성적 기반 특이사항 다양화)`);

  // 7) 피드백 — 카테고리·성적·출결 기반 다양한 내용 (content 암호화)
  const fbText = {
    grade: (name, avg) =>
      avg >= 80
        ? `${name} 학생은 성적이 꾸준히 우수하여 칭찬합니다.`
        : `${name} 학생은 성적 향상을 위해 추가 학습이 필요합니다.`,
    behavior: (name) =>
      `${name} 학생은 교우 관계가 원만하고 수업 태도가 바릅니다.`,
    attitude: (name, avg) =>
      avg >= 70
        ? `${name} 학생은 학습 의욕이 높고 수업에 적극적입니다.`
        : `${name} 학생은 수업 집중력 향상이 필요합니다.`,
    attendance: (name, _avg, att) =>
      att.absent + att.late >= 4
        ? `${name} 학생은 출결 관리에 주의가 필요합니다.`
        : `${name} 학생은 출결이 양호합니다.`,
  };
  const feedbackDocs = students.slice(0, 8).map((s, i) => {
    const category = FB_CATEGORIES[i % FB_CATEGORIES.length];
    const subject = SUBJECTS[i % SUBJECTS.length];
    const text = fbText[category](s.plainName, stats[i].overallAvg, stats[i].att);
    return {
      schoolId, studentId: s._id, teacherId: teachers[subject],
      category,
      content: enc(text),
      isVisibleToStudent: i % 2 === 0,
      isVisibleToParent: i % 3 === 0,
    };
  });
  await Feedback.insertMany(feedbackDocs);
  console.log(`✅ 피드백 ${feedbackDocs.length}건 (카테고리·성적 기반, 암호화)`);

  // 8) 상담 (3학기에 걸쳐, 성적 추세·출결 기반 다양한 내용) — content/nextPlan 암호화
  const homeroom = teachers['국어']; // 담임=국어교사 가정
  const counselingDocs = [];
  SEMESTERS.forEach((semester, semIdx) => {
    students.forEach((s, si) => {
      // 학기마다 다른 약 절반의 학생만 상담 (다양화)
      if ((si + semIdx) % 2 !== 0) return;
      const st = stats[si];
      const semAvg = st.semAvg[semIdx];
      let content;
      let nextPlan;
      if (st.att.absent >= 4 || st.att.late >= 3) {
        content = `${s.plainName} 학생의 잦은 결석·지각에 대해 상담함. 생활 습관 개선을 독려함.`;
        nextPlan = '주간 출결 점검 및 보호자 연계 지도.';
      } else if (st.trend < 0 && semIdx > 0) {
        content = `${s.plainName} 학생의 최근 성적 하락(평균 ${semAvg}%) 원인을 분석하고 학습 전략을 상담함.`;
        nextPlan = '취약 과목 보충 학습 계획 수립.';
      } else if (st.overallAvg >= 85) {
        content = `${s.plainName} 학생의 우수한 학업 성취를 격려하고 심화 학습·진로를 상담함.`;
        nextPlan = '희망 진로 관련 심화 활동 안내.';
      } else {
        content = `${s.plainName} 학생의 학습 현황(평균 ${semAvg}%)과 교우 관계를 점검하는 정기 상담을 진행함.`;
        nextPlan = '다음 학기 학습 목표 설정.';
      }
      const enr = enrollmentFor(si, academicYearOf(semester)); // 당시 학적
      counselingDocs.push({
        schoolId, studentId: s._id, teacherId: homeroom,
        date: new Date(SEMESTER_DATES[semester]),
        content: enc(content),
        nextPlan: enc(nextPlan),
        isShared: si % 2 === 0,
        isVisibleToParent: si % 3 === 0,
        gradeLevel: enr.gradeLevel,
        classNumber: enr.classNumber,
        studentNumber: enr.studentNumber,
      });
    });
  });
  await Counseling.insertMany(counselingDocs);
  console.log(
    `✅ 상담 ${counselingDocs.length}건 (${SEMESTERS.length}학기, 성적·출결 기반 다양화, 암호화)`
  );

  await mongoose.disconnect();
  console.log('\n시드 완료 — 분석 대시보드에서 "지금 재집계"를 실행하세요.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
