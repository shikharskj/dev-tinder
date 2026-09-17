import express from "express";
import connectDB from "./config/database.js";
import User from "./models/user.js";

const app = express();
// express.json() middleware is used to parse incoming JSON requests and make the data available in req.body
app.use(express.json());

app.post("/api/signup", async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    res
      .status(201)
      .send("Account created successfully. Please log in to continue.");
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
