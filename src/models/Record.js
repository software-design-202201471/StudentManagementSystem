import mongoose from 'mongoose';

/**
 * 학생부 커스텀 필드
 * - label: 항목명 (예: "진로희망", "특기사항")
 * - value: 내용
 */
const CustomFieldSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, '항목명은 필수입니다.'],
      trim: true,
    },
    value: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const RecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '학생 ID는 필수입니다.'],
      unique: true, // 학생 1명당 학생부 1개
    },
    attendance: {
      absent: {
        type: Number,
        default: 0,
        min: [0, '결석 횟수는 0 이상이어야 합니다.'],
      },
      late: {
        type: Number,
        default: 0,
        min: [0, '지각 횟수는 0 이상이어야 합니다.'],
      },
      early: {
        type: Number,
        default: 0,
        min: [0, '조퇴 횟수는 0 이상이어야 합니다.'],
      },
    },
    specialNotes: {
      type: String,
      default: '',
      trim: true,
    },
    customFields: {
      type: [CustomFieldSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Record || mongoose.model('Record', RecordSchema);
