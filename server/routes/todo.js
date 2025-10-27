import express from "express";
import { body, validationResult } from "express-validator";
import Todo from "../models/Todo.js";
import { authenticate, authorizeRole } from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticate);

// GET /api/todos
router.get("/", async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const todos = await Todo.find()
        .populate("user", "username email")
        .sort({ createdAt: -1 });
      return res.json(todos);
    } else {
      const todos = await Todo.find({ user: req.user.id }).sort({
        createdAt: -1,
      });
      return res.json(todos);
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/todos
router.post(
  "/",
  [
    body("title").isLength({ min: 1, max: 100 }),
    body("description").optional().isLength({ max: 500 }),
    body("category").optional().isIn(["Urgent", "Non-Urgent"]),
    body("dueDate").optional().isISO8601().toDate(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { title, description, dueDate, category } = req.body;
      const todo = await Todo.create({
        title,
        description,
        dueDate,
        category,
        user: req.user.id,
      });
      res.status(201).json(todo);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/todos/:id
router.put(
  "/:id",
  [
    body("title").optional().isLength({ min: 1, max: 100 }),
    body("description").optional().isLength({ max: 500 }),
    body("category").optional().isIn(["Urgent", "Non-Urgent"]),
    body("dueDate").optional().isISO8601().toDate(),
    body("completed").optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const todo = await Todo.findById(req.params.id);
      if (!todo) return res.status(404).json({ message: "Todo not found" });

      // authorization: owner or admin
      if (req.user.role !== "admin" && todo.user.toString() !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      Object.assign(todo, req.body);
      await todo.save();
      res.json(todo);
    } catch (err) {
      next(err);
    }
  }
);

////////////////////////////////////////////////////////////////

// // DELETE /api/todos/:id
// router.delete("/:id", async (req, res, next) => {
//   try {
//     const todo = await Todo.findById(req.params.id);
//     if (!todo) return res.status(404).json({ message: "Todo not found" });

//     if (req.user.role !== "admin" && todo.user.toString() !== req.user.id) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     await todo.remove();
//     res.json({ message: "Deleted" });
//   } catch (err) {
//     next(err);
//   }
// });

////////////////////////////////////////////////////////////////

// DELETE /api/todos/:id
router.delete("/:id", async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Try to delete where id matches AND user owns it (or admin bypass below)
    const query = { _id: req.params.id };
    if (req.user.role !== "admin") query.user = req.user.id;

    const deleted = await Todo.findOneAndDelete(query);

    if (!deleted) {
      // Could be not found OR user not owner
      return res
        .status(404)
        .json({ message: "Todo not found or access denied" });
    }

    return res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

///////////////////////////////////////////////////////////////////

export default router;
