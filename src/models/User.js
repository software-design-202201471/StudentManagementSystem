import mongoose from "mongoose";
import {
  encryptString,
  decryptString,
  encryptUpdateFields,
  emailHash,
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
    // 개인정보: 이메일은 암호화 저장. 조회/유니크는 emailHash(blind index)로 수행.
    // unique 제거 — 암호문은 IV마다 달라 유니크가 무의미 (emailHash가 대신 보장).
    email: {
      type: String,
      required: true,
      set: encryptString,
      get: decryptString,
    },
    // 이메일 blind index — 로그인/중복검사용 결정적 해시.
    // sparse: 기존 평문 계정(emailHash 없음)은 마이그레이션 전까지 인덱스 제외.
    emailHash: {
      type: String,
      required: true,
      index: { unique: true, sparse: true },
    },
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

// 저장(save/create) 전 emailHash 동기화. validate 단계에서 설정해야
// required 검증을 통과한다(pre('save')는 검증 이후 실행되기 때문).
// this.email getter는 평문을 반환하므로 그 평문으로 해시를 만든다.
UserSchema.pre("validate", function (next) {
  if (this.isNew || this.isModified("email")) {
    this.emailHash = emailHash(this.email);
  }
  next();
});

// findOneAndUpdate 시 name/email 자동 암호화 + emailHash 동기화
// (idempotent — 이미 암호문이면 skip). 현재 email 갱신 경로는 없으나 방어적으로 처리.
UserSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  encryptUpdateFields(update, ["name"]);
  if (update) {
    const rawEmail =
      (typeof update.email === "string" ? update.email : undefined) ??
      (update.$set && typeof update.$set.email === "string"
        ? update.$set.email
        : undefined);
    if (rawEmail !== undefined && !rawEmail.startsWith("enc:")) {
      const h = emailHash(rawEmail);
      const enc = encryptString(rawEmail);
      if (update.email !== undefined) update.email = enc;
      if (update.$set && update.$set.email !== undefined) {
        update.$set.email = enc;
      }
      if (update.$set) update.$set.emailHash = h;
      else update.emailHash = h;
    }
  }
  next();
});

// 학교별 사용자 조회 (테넌트 스코프)
UserSchema.index({ schoolId: 1, role: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
