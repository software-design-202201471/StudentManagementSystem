import mongoose from 'mongoose';

/**
 * 학생 활성화 코드 — 회사가 학교 요청 수량만큼 발급.
 * - 학생이 코드 입력 시 자신의 학년/반/번호를 이 코드 값으로 설정하고 활성화.
 * - studentId: 활성화한 학생 _id 기록 (학생 활성화는 1회용).
 * - 부모는 동일 코드를 재사용해 studentId를 parentOf에 연결 (다회 허용).
 */
const StudentCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, '코드는 필수입니다.'],
      unique: true,
      trim: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, '학교 ID는 필수입니다.'],
    },
    grade: { type: Number, min: 1 },
    classNumber: { type: Number, min: 1 },
    studentNumber: { type: Number, min: 1 },
    // 활성화한 학생 (null이면 미사용). 학생 활성화 1회용 가드.
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// 학교별 코드 조회
StudentCodeSchema.index({ schoolId: 1 });

export default mongoose.models.StudentCode ||
  mongoose.model('StudentCode', StudentCodeSchema);
