import mongoose from 'mongoose';

/**
 * 학교(테넌트) — 멀티테넌시의 최상위 격리 단위.
 * - code: 학교 식별 코드 (회사 내부용)
 * - teacherCode: 교사 활성화용 코드 (재사용형, 여러 교사가 동일 코드 입력)
 * - studentCodeQuota: 회사가 허용한 학생코드 발급 수량
 */
const SchoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, '학교명은 필수입니다.'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, '학교 코드는 필수입니다.'],
      unique: true,
      trim: true,
    },
    teacherCode: {
      type: String,
      required: [true, '교사 활성화 코드는 필수입니다.'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    studentCodeQuota: {
      type: Number,
      default: 0,
      min: [0, '발급 수량은 0 이상이어야 합니다.'],
    },
    studentCodesIssued: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.School ||
  mongoose.model('School', SchoolSchema);
