import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now, index: true },
    patientName: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    contact: { type: String, default: "", trim: true },
    ageSex: { type: String, default: "", trim: true },
    newPatients: { type: String, default: "", trim: true },
    followupPatients: { type: String, default: "", trim: true },
    diagnosis: { type: String, default: "", trim: true },
    amount: { type: Number, default: 0, min: 0 },
    remarks: { type: String, default: "", trim: true },
    consultant: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.FollowUp ||
  mongoose.model("FollowUp", followUpSchema);
