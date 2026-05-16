import mongoose from 'mongoose';

/**
 * 교사 상담 기록.
 * - isShared=true 이면 다른 교사도 조회 가능 (CRUD는 본인만)
 * - 학생당 여러 건, 시간순 정렬이 기본 사용 패턴
 */
const CounselingSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: [true, '상담 일자는 필수입니다.'],
    },
    content: {
      type: String,
      required: [true, '내용은 필수입니다.'],
      trim: true,
      maxlength: [5000, '내용은 5000자 이내로 입력해주세요.'],
    },
    nextPlan: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, '향후 계획은 2000자 이내로 입력해주세요.'],
    },
    isShared: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// 학생별 상담 시간순 조회 (인수인계 명시 인덱스)
CounselingSchema.index({ studentId: 1, date: -1 });

// 교사 본인이 작성한 상담 시간순 조회 (Feedback과 동일 보조 인덱스)
CounselingSchema.index({ teacherId: 1, date: -1 });

export default mongoose.models.Counseling ||
  mongoose.model('Counseling', CounselingSchema);
