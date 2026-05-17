import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now, index: true },
    category: { type: String, default: "Other", trim: true, index: true },
    description: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "Cash", trim: true },
    vendor: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });

export default mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema);
