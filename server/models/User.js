import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    frozen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-delete todos when a user is deleted
userSchema.pre("findOneAndDelete", async function (next) {
  const user = await this.model.findOne(this.getFilter());
  if (user) await Todo.deleteMany({ user: user._id });
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
