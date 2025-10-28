import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate, authorizeRole } from "../middlewares/auth.js";
import User from "../models/User.js";
import Todo from "../models/Todo.js";

const router = express.Router();
const STANDARD_ADMIN_EMAIL = process.env.STANDARD_ADMIN_EMAIL;

// ✅ Apply auth middleware for admin routes
router.use(authenticate, authorizeRole("admin"));

/* ------------------------------------
   🧍‍♂️ USER MANAGEMENT ROUTES
------------------------------------ */

// ✅ GET /api/admin/users — List all users
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ✅ PATCH /api/admin/users/:id/role — Change role (user/admin)
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

      if (user.email === STANDARD_ADMIN_EMAIL)
        return res
          .status(403)
          .json({ message: "Super admin role cannot be changed" });

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

// ✅ PATCH /api/admin/users/:id/freeze — Freeze/unfreeze user account
router.patch("/users/:id/freeze", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.email === STANDARD_ADMIN_EMAIL)
      return res.status(403).json({ message: "Super admin cannot be frozen" });

    user.frozen = !user.frozen;
    await user.save();

    res.json({
      message: `User ${user.frozen ? "frozen" : "unfrozen"} successfully`,
    });
  } catch (err) {
    next(err);
  }
});

// ✅ DELETE /api/admin/users/:id — Delete user + cascade delete todos
router.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.email === STANDARD_ADMIN_EMAIL)
      return res.status(403).json({ message: "Super admin cannot be deleted" });

    await Todo.deleteMany({ user: user._id }); // cascade delete
    await user.deleteOne();

    res.json({ message: "User and their todos deleted successfully" });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------
   ✅ TODO MANAGEMENT (ADMIN FULL CONTROL)
------------------------------------ */

// ✅ GET /api/admin/todos — Search/filter all todos
router.get("/todos", async (req, res, next) => {
  try {
    const { search, category, completed } = req.query;
    const query = {};

    if (search) query.title = { $regex: search, $options: "i" };
    if (category && ["Urgent", "Non-Urgent"].includes(category))
      query.category = category;
    if (completed !== undefined)
      query.completed = completed === "true" ? true : false;

    const todos = await Todo.find(query)
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json(todos);
  } catch (err) {
    next(err);
  }
});

// ✅ GET /api/admin/todos/:id — Get single todo
router.get("/todos/:id", async (req, res, next) => {
  try {
    const todo = await Todo.findById(req.params.id).populate(
      "user",
      "username email"
    );
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

// ✅ POST /api/admin/todos — Create a new todo for a user
router.post(
  "/todos",
  [
    body("title").isLength({ min: 1, max: 100 }),
    body("description").optional().isLength({ max: 500 }),
    body("category").optional().isIn(["Urgent", "Non-Urgent"]),
    body("dueDate").optional().isISO8601().toDate(),
    body("user").notEmpty().withMessage("User ID is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { title, description, category, dueDate, user } = req.body;
      const foundUser = await User.findById(user);
      if (!foundUser)
        return res.status(404).json({ message: "User not found" });

      const todo = await Todo.create({
        title,
        description,
        category,
        dueDate,
        user,
      });

      res.status(201).json(todo);
    } catch (err) {
      next(err);
    }
  }
);

// ✅ PUT /api/admin/todos/:id — Update any todo
router.put(
  "/todos/:id",
  [
    body("title").optional().isLength({ min: 1, max: 100 }),
    body("description").optional().isLength({ max: 500 }),
    body("category").optional().isIn(["Urgent", "Non-Urgent"]),
    body("completed").optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const todo = await Todo.findById(req.params.id);
      if (!todo) return res.status(404).json({ message: "Todo not found" });

      Object.assign(todo, req.body);
      await todo.save();

      res.json(todo);
    } catch (err) {
      next(err);
    }
  }
);

// ✅ DELETE /api/admin/todos/:id — Delete any todo
router.delete("/todos/:id", async (req, res, next) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });

    await todo.deleteOne();
    res.json({ message: "Todo deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
