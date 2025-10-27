import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";

const router = express.Router();

// ✅ Register Route
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email"),
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { email, username, password } = req.body;
      const existing = await User.findOne({ $or: [{ email }, { username }] });

      if (existing)
        return res
          .status(400)
          .json({ message: "Email or username already taken" });

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const user = await User.create({ email, username, password: hash }); // role defaults to 'user'

      return res.status(201).json({ message: "User registered", id: user._id });
    } catch (err) {
      next(err);
    }
  }
);

// ✅ Login Route (Email OR Username)
router.post(
  "/login",
  [body("identifier").notEmpty(), body("password").notEmpty()],
  async (req, res, next) => {
    try {
      const { identifier, password } = req.body; // identifier = email or username
      const user = await User.findOne({
        $or: [{ email: identifier }, { username: identifier }],
      });

      if (!user)
        return res.status(401).json({ message: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(401).json({ message: "Invalid credentials" });

      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "8h",
      });

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
