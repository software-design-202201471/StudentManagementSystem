import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["teacher", "student", "parent"],
      required: true,
    },
    grade: { type: Number, min: 1 },
    classNumber: { type: Number, min: 1 },
    studentNumber: { type: Number, min: 1 },
    parentOf: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // 멀티테넌시: 소속 학교 (null = 미활성). 활성화 시 코드로 연결.
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
    // 계정 상태: 가입 직후 pending → 코드 활성화 시 active
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// 학교별 사용자 조회 (테넌트 스코프)
UserSchema.index({ schoolId: 1, role: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
