import mongoose from 'mongoose';

/**
 * 피드백
 * - 교사가 학생에 대해 작성하는 코멘트
 * - 공개 범위는 isVisibleToStudent / isVisibleToParent 플래그로 제어
 */
const FeedbackSchema = new mongoose.Schema(
  {
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
      maxlength: [5000, '내용은 5000자 이내로 입력해주세요.'],
    },
    isVisibleToStudent: {
      type: Boolean,
      default: false,
    },
    isVisibleToParent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// 학생/학부모가 본인·자녀 피드백을 시간순으로 조회할 때 사용
FeedbackSchema.index({ studentId: 1, createdAt: -1 });

// 교사가 본인이 작성한 피드백을 시간순으로 조회할 때 사용
FeedbackSchema.index({ teacherId: 1, createdAt: -1 });

export default mongoose.models.Feedback ||
  mongoose.model('Feedback', FeedbackSchema);
