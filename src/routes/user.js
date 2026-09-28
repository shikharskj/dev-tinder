import express from "express";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { UPDATE_FIELDS } from "../../constants.js";
import { isValidUserId, sanitizeUserData } from "../../utils/validation.js";
import { sendError, sendSuccess } from "../../utils/response.js";

const userRouter = express.Router();

userRouter.get("/api/user", async (req, res) => {
  const userEmail =
    typeof req.query.email === "string"
      ? req.query.email.trim().toLowerCase()
      : "";

  if (!userEmail || userEmail.length > 254) {
    return sendError(res, 400, "A valid email is required!");
  }

  try {
    const user = await User.findOne({ email: userEmail }).select(
      "-password -connectionRequests",
    );

    if (!user) {
      return sendError(res, 404, `No user found with email ${userEmail}`);
    }

    return sendSuccess(res, 200, "User fetched successfully.", user);
  } catch (error) {
    console.error(`Error fetching the user with email ${userEmail}:`, error);
    return sendError(res, 500, "Error fetching the user.");
  }
});

userRouter.patch("/api/user/:id", authenticateUser, async (req, res) => {
  const userId = req.params?.id;

  if (!isValidUserId(userId)) {
    return sendError(res, 400, "Invalid user ID!");
  }

  if (req.user._id.toString() !== userId) {
    return sendError(res, 403, "You can only update your own account.");
  }

  try {
    const updatedData = sanitizeUserData(req.body?.data, UPDATE_FIELDS);

    if (!updatedData || Object.keys(updatedData).length === 0) {
      return sendError(res, 400, "Invalid updates!");
    }

    if (updatedData.password) {
      updatedData.password = await bcrypt.hash(updatedData.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return sendError(res, 404, `No user found with ID ${userId}`);
    }

    return sendSuccess(res, 200, "User updated successfully.", updatedUser);
  } catch (error) {
    console.error(`Error updating the user with ID ${userId}:`, error);
    return sendError(res, 500, "Error updating the user.");
  }
});

userRouter.delete("/api/user", authenticateUser, async (req, res) => {
  const userId = req.body?.id;

  if (typeof userId !== "string" || !isValidUserId(userId)) {
    return sendError(res, 400, "Invalid user ID!");
  }

  if (req.user._id.toString() !== userId) {
    return sendError(res, 403, "You can only delete your own account.");
  }

  try {
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return sendError(res, 404, `No user found with ID ${userId}`);
    }

    return sendSuccess(res, 200, "User deleted successfully.", { userId });
  } catch (error) {
    console.error(`Error deleting the user with ID ${userId}:`, error);
    return sendError(res, 500, "Error deleting the user.");
  }
});

userRouter.get("/api/feed", async (req, res) => {
  try {
    const users = await User.find().select("-password -connectionRequests");
    return sendSuccess(res, 200, "Feed fetched successfully.", users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return sendError(res, 500, "Error fetching users.");
  }
});

export default userRouter;
