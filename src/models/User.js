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
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
