import express from "express";
import connectDB from "./config/database.js";
import User from "./models/user.js";

const app = express();

app.post("/api/signup", async (req, res) => {
  // Handle signup logic here
  const userData = {
    firstName: "Shikhar",
    lastName: "Jaiswal",
    email: "shikhar.jaiswal@example.com",
    password: "password123",
    age: 25,
    gender: "Male",
    location: "New York",
  };

  const user = new User(userData);

  try {
    await user.save();
    res.status(201).send("User created successfully");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Error creating user");
  }
});

const startServer = async () => {
  await connectDB();

  app.listen(7777, () => {
    console.log("Server is running on port 7777");
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
