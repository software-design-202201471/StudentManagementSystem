import mongoose from "mongoose";

const CounselingSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    content: { type: String, required: true },
    nextPlan: { type: String, default: "" },
    isShared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CounselingSchema.index({ studentId: 1, date: -1 });

export default mongoose.models.Counseling || mongoose.model("Counseling", CounselingSchema);
