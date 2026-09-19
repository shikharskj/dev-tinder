import express from "express";
import connectDB from "./config/database.js";
import User from "./models/user.js";
import { isValidUserId, sanitizeUserData } from "../utils/validation.js";
import { SIGNUP_FIELDS, UPDATE_FIELDS } from "../constants.js";
import bcrypt from "bcrypt";

const app = express();
// express.json() middleware is used to parse incoming JSON requests and make the data available in req.body
app.use(express.json());

app.post("/api/signup", async (req, res) => {
  const signupData = sanitizeUserData(req.body, SIGNUP_FIELDS);
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "password",
    "age",
    "gender",
    "location",
  ];

  if (
    !signupData ||
    requiredFields.some((field) => signupData[field] === undefined)
  ) {
    return res.status(400).json({ error: "Invalid signup data!" });
  }

  const hashedPassword = await bcrypt.hash(signupData.password, 10);
  signupData.password = hashedPassword;

  const user = new User(signupData);

  try {
    await user.save();
    res
      .status(201)
      .send("Account created successfully. Please log in to continue.");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Error creating user. Please try again later.");
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required!" });
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res
        .status(401)
        .json({ error: "Email not registered! Please sign up first." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password!" });
    }

    res.status(200).json({ message: "Login successful!" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Error during login. Please try again later.");
  }
});

app.get("/api/user", async (req, res) => {
  const userEmail =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!userEmail || userEmail.length > 254) {
    return res.status(400).json({ error: "A valid email is required!" });
  }

  try {
    const user = await User.findOne({ email: userEmail }).select("-password");

    if (!user) {
      res.status(404).send(`No user found with email ${userEmail}`);
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(`Error fetching the user with email ${userEmail}:`, error);
    res.status(500).send(`Error fetching the user with email ${userEmail}`);
  }
});

app.patch("/api/user/:id", async (req, res) => {
  const userId = req.params?.id;

  if (!isValidUserId(userId)) {
    return res.status(400).json({ error: "Invalid user ID!" });
  }

  try {
    const updatedData = sanitizeUserData(req.body?.data, UPDATE_FIELDS);

    if (!updatedData || Object.keys(updatedData).length === 0) {
      return res.status(400).json({ error: "Invalid updates!" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      res.status(404).send(`No user found with ID ${userId}`);
      return;
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Error updating the user with ID ${userId}:`, error);
    res.status(500).send(`Error updating the user with ID ${userId}`);
  }
});

app.delete("/api/user", async (req, res) => {
  const userId = req.body?.id;

  if (typeof userId !== "string" || !isValidUserId(userId)) {
    return res.status(400).json({ error: "Invalid user ID!" });
  }

  try {
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      res.status(404).send(`No user found with ID ${userId}`);
      return;
    }

    res.status(200).send(`User with ID ${userId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting the user with ID ${userId}:`, error);
    res.status(500).send(`Error deleting the user with ID ${userId}`);
  }
});

app.get("/api/feed", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error fetching users");
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
