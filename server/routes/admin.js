import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate, authorizeRole } from "../middlewares/auth.js";
import User from "../models/User.js";
import Todo from "../models/Todo.js";

const router = express.Router();

// ✅ Apply authentication & admin authorization middleware
router.use(authenticate, authorizeRole("admin"));

// ✅ GET /api/admin/users — Get all users
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ✅ PATCH /api/admin/users/:id/role — Update user role
router.patch(
  "/users/:id/role",
  [body("role").isIn(["user", "admin"])],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.role = req.body.role;
      await user.save();

      res.json({
        message: "Role updated successfully",
        user: { id: user._id, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ✅ GET /api/admin/todos — Get all todos
router.get("/todos", async (req, res, next) => {
  try {
    const todos = await Todo.find().populate("user", "username email");
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

export default router;
