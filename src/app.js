import express from "express";
import connectDB from "./config/database.js";
import User from "./models/user.js";
import mongoose from "mongoose";

const app = express();
// express.json() middleware is used to parse incoming JSON requests and make the data available in req.body
app.use(express.json());

const SIGNUP_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "password",
  "age",
  "gender",
  "location",
  "photoUrl",
  "bio",
  "interests",
  "skills",
];

const UPDATE_FIELDS = [
  "password",
  "age",
  "gender",
  "location",
  "photoUrl",
  "bio",
  "interests",
  "skills",
];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isValidUserId = (userId) => mongoose.Types.ObjectId.isValid(userId);

const sanitizeUserData = (data, allowedFields) => {
  if (!isPlainObject(data)) return null;

  const keys = Object.keys(data);
  if (keys.some((key) => !allowedFields.includes(key))) return null;

  const sanitizedData = {};
  for (const key of keys) {
    const value = data[key];

    if (key === "age") {
      if (!Number.isInteger(value) || value < 18 || value > 50) return null;
      sanitizedData[key] = value;
      continue;
    }

    if (["interests", "skills"].includes(key)) {
      if (
        !Array.isArray(value) ||
        value.length > (key === "skills" ? 5 : 20) ||
        value.some(
          (item) => typeof item !== "string" || item.trim().length > 50,
        )
      ) {
        return null;
      }
      sanitizedData[key] = value.map((item) => item.trim());
      continue;
    }

    if (typeof value !== "string" || value.trim().length === 0) return null;
    const sanitizedValue = value.trim();
    if (key === "password" && sanitizedValue.length < 8) return null;
    const maxLength = key === "password" ? 128 : key === "bio" ? 1000 : 100;
    if (sanitizedValue.length > maxLength) return null;
    sanitizedData[key] =
      key === "email" ? sanitizedValue.toLowerCase() : sanitizedValue;
  }

  return sanitizedData;
};

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
