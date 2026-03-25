import mongoose from "mongoose";

const GradeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    semester: { type: String, required: true },
    subject: { type: String, required: true },
    score: { type: Number, required: true },
    totalScore: { type: Number },
    average: { type: Number },
    grade: { type: String },
  },
  { timestamps: true },
);

export default mongoose.models.Grade || mongoose.model("Grade", GradeSchema);
