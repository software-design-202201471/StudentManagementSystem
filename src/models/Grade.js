import mongoose from 'mongoose';
import { encryptString, decryptString } from '@/lib/crypto';

/**
 * 성적 정보는 AES-256-GCM으로 저장 시 암호화 (ENCRYPTION_KEY 설정 시).
 * - score / totalScore / percentage : 숫자 → 문자열 직렬화 후 암호화
 * - grade : 문자열 그대로 암호화
 * 키 미설정 시 평문 그대로 저장/조회 (graceful skip, crypto.js 참고).
 * 기존 평문 데이터는 prefix가 없어 복호화 시 그대로 반환되므로 읽기 호환 유지.
 */

// 숫자 필드 암복호화 래퍼.
function encNumber(v) {
  if (v === null || v === undefined || v === '') return v;
  return encryptString(String(v));
}
function decNumber(v) {
  const s = decryptString(v);
  if (s === null || s === undefined || s === '') return s;
  const n = Number(s);
  return Number.isNaN(n) ? s : n;
}

const GradeSchema = new mongoose.Schema(
  {
    // 테넌트(학교) 스코프
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, '학교 ID는 필수입니다.'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '학생 ID는 필수입니다.'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '교사 ID는 필수입니다.'],
    },
    semester: {
      type: String,
      required: [true, '학기는 필수입니다.'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, '과목은 필수입니다.'],
      trim: true,
    },
    // 점수·만점·백분율은 암호화 저장. 숫자 검증은 API 단(/api/grades)에서 수행.
    score: {
      type: String,
      required: [true, '점수는 필수입니다.'],
      set: encNumber,
      get: decNumber,
    },
    totalScore: {
      type: String,
      required: [true, '만점은 필수입니다.'],
      default: 100,
      set: encNumber,
      get: decNumber,
    },
    percentage: {
      type: String,
      set: encNumber,
      get: decNumber,
    },
    grade: {
      type: String,
      set: encryptString,
      get: decryptString,
    },
    // 작성 시점 학적 스냅샷 — 진급으로 학년/반/번호가 바뀌어도 당시 맥락 보존.
    // 비암호화(집계·필터·정렬용, User와 동일하게 평문 저장).
    gradeLevel: { type: Number },
    classNumber: { type: Number },
    studentNumber: { type: Number },
  },
  {
    timestamps: true,
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
  }
);

// findOneAndUpdate 시 update 객체의 성적 필드 자동 암호화 (숫자/문자 모두 처리).
// crypto.js가 이미 암호문(enc: prefix)이면 재암호화하지 않으므로 idempotent.
GradeSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && typeof update === 'object') {
    const apply = (target) => {
      if (!target) return;
      for (const f of ['score', 'totalScore', 'percentage']) {
        if (target[f] !== undefined && target[f] !== null) {
          target[f] = encNumber(target[f]);
        }
      }
      if (target.grade !== undefined && target.grade !== null) {
        target.grade = encryptString(String(target.grade));
      }
    };
    apply(update);
    apply(update.$set);
  }
  next();
});

// 동일 학생의 같은 학기·과목 중복 방지 인덱스 (학교 스코프 포함)
GradeSchema.index(
  { schoolId: 1, studentId: 1, semester: 1, subject: 1 },
  { unique: true }
);

// 학교·교사별 조회 성능을 위한 인덱스
GradeSchema.index({ schoolId: 1, teacherId: 1 });

export default mongoose.models.Grade || mongoose.model('Grade', GradeSchema);
