import mongoose from 'mongoose';

const GradeSchema = new mongoose.Schema(
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
    score: {
      type: Number,
      required: [true, '점수는 필수입니다.'],
      min: [0, '점수는 0 이상이어야 합니다.'],
    },
    totalScore: {
      type: Number,
      required: [true, '만점은 필수입니다.'],
      min: [1, '만점은 1 이상이어야 합니다.'],
      default: 100,
    },
    percentage: {
      type: Number,
    },
    grade: {
      type: String,
    },
  },
  { timestamps: true }
);

// 동일 학생의 같은 학기·과목 중복 방지 인덱스
GradeSchema.index({ studentId: 1, semester: 1, subject: 1 }, { unique: true });

// 교사별 조회 성능을 위한 인덱스
GradeSchema.index({ teacherId: 1 });

export default mongoose.models.Grade || mongoose.model('Grade', GradeSchema);