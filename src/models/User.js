import mongoose from "mongoose";
import {
  encryptString,
  decryptString,
  encryptUpdateFields,
} from "@/lib/crypto";

const UserSchema = new mongoose.Schema(
  {
    // 개인정보: 이름은 AES-256-GCM으로 저장 시 암호화 (ENCRYPTION_KEY 설정 시).
    // 키 미설정 시 평문 그대로 저장/조회 (graceful skip). 기존 평문도 읽기 호환.
    name: {
      type: String,
      required: true,
      set: encryptString,
      get: decryptString,
    },
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
  {
    timestamps: true,
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
  },
);

// findOneAndUpdate 시 name이 갱신되면 자동 암호화 (idempotent — 이미 암호문이면 skip)
UserSchema.pre("findOneAndUpdate", function (next) {
  encryptUpdateFields(this.getUpdate(), ["name"]);
  next();
});

// 학교별 사용자 조회 (테넌트 스코프)
UserSchema.index({ schoolId: 1, role: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
