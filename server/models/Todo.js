import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    dueDate: { type: Date },
    category: {
      type: String,
      enum: ["Urgent", "Non-Urgent"],
      default: "Non-Urgent",
    },
    completed: { type: Boolean, default: false },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

todoSchema.virtual("isOverdue").get(function () {
  return this.dueDate && this.dueDate < new Date() && !this.completed;
});

const todo = mongoose.model("Todo", todoSchema);
export default todo;
