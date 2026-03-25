import mongoose from "mongoose";

const RecordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attendance: {
      absent: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
      early: { type: Number, default: 0 },
    },
    specialNotes: { type: String, default: "" },
    customFields: [
      {
        label: { type: String, required: true },
        value: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Record || mongoose.model("Record", RecordSchema);
