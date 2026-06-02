import mongoose from 'mongoose';
import {
  encryptString,
  decryptString,
  encryptUpdateFields,
} from '@/lib/crypto';

/**
 * 피드백
 * - 교사가 학생에 대해 작성하는 코멘트
 * - 공개 범위는 isVisibleToStudent / isVisibleToParent 플래그로 제어
 * - content 필드는 AES-256-GCM으로 자동 암복호화 (ENCRYPTION_KEY 설정 시)
 */
const FeedbackSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: {
        values: ['grade', 'behavior', 'attitude', 'attendance'],
        message: '유효하지 않은 카테고리입니다.',
      },
      required: [true, '카테고리는 필수입니다.'],
    },
    content: {
      type: String,
      required: [true, '내용은 필수입니다.'],
      trim: true,
      // 길이 제한은 클라이언트 UI maxLength={5000}로 통제.
      // 모델 maxlength는 암호문 길이까지 검증해 불일치 → 제거.
      set: encryptString,
      get: decryptString,
    },
    isVisibleToStudent: { type: Boolean, default: false },
    isVisibleToParent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
  }
);

// findOneAndUpdate 시 update 객체의 content 자동 암호화
FeedbackSchema.pre('findOneAndUpdate', function (next) {
  encryptUpdateFields(this.getUpdate(), ['content']);
  next();
});

FeedbackSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });
FeedbackSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });

export default mongoose.models.Feedback ||
  mongoose.model('Feedback', FeedbackSchema);
