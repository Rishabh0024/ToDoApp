import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";
import User from "../models/User.js";

describe("Auth endpoints", () => {
  beforeAll(async () => {
    // connect to test DB
    const uri =
      process.env.MONGO_URI_TEST || "mongodb://localhost:27017/todo-app-test";
    await mongoose.connect(uri);
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("registers a user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      username: "tester",
      password: "password123",
    });

    expect(res.statusCode).toBe(201);
    const user = await User.findOne({ email: "test@example.com" });
    expect(user).toBeTruthy();
    expect(user.role).toBe("user");
  });
});
