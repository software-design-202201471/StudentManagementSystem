// models/Feedback.js
import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ["grade", "behavior", "attitude", "attendance"],
      required: true,
    },
    content: { type: String, required: true },
    isVisibleToParent: { type: Boolean, default: false },
    isVisibleToStudent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
