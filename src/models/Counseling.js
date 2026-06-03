import mongoose from 'mongoose';
import {
  encryptString,
  decryptString,
  encryptUpdateFields,
} from '@/lib/crypto';

/**
 * 교사 상담 기록.
 * - isShared=true 이면 다른 교사도 조회 가능 (CRUD는 본인만)
 * - 학생당 여러 건, 시간순 정렬이 기본 사용 패턴
 * - content / nextPlan 은 AES-256-GCM으로 자동 암복호화 (ENCRYPTION_KEY 설정 시)
 */
const CounselingSchema = new mongoose.Schema(
  {
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
    date: {
      type: Date,
      required: [true, '상담 일자는 필수입니다.'],
    },
    content: {
      type: String,
      required: [true, '내용은 필수입니다.'],
      trim: true,
      // 길이 제한은 클라이언트 UI maxLength로 통제. 암호문 길이 충돌 회피.
      set: encryptString,
      get: decryptString,
    },
    nextPlan: {
      type: String,
      default: '',
      trim: true,
      set: encryptString,
      get: decryptString,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    // 학부모 공개 여부 (교사가 상담별로 선택). 기본 비공개 — 민감성 보호.
    isVisibleToParent: {
      type: Boolean,
      default: false,
    },
    // 학생 본인 공개 여부 (교사가 상담별로 선택). 기본 비공개.
    isVisibleToStudent: {
      type: Boolean,
      default: false,
    },
    // 작성 시점 학적 스냅샷 — 진급으로 학년/반/번호가 바뀌어도 당시 맥락 보존.
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

// findOneAndUpdate 시 update 객체의 content/nextPlan 자동 암호화
CounselingSchema.pre('findOneAndUpdate', function (next) {
  encryptUpdateFields(this.getUpdate(), ['content', 'nextPlan']);
  next();
});

CounselingSchema.index({ schoolId: 1, studentId: 1, date: -1 });
CounselingSchema.index({ schoolId: 1, teacherId: 1, date: -1 });

export default mongoose.models.Counseling ||
  mongoose.model('Counseling', CounselingSchema);
