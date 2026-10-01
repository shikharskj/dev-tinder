import express from "express";
import User from "../models/user.js";
import { SIGNUP_FIELDS } from "../../constants.js";
import { sanitizeUserData } from "../../utils/validation.js";
import { sendError, sendSuccess } from "../../utils/response.js";

const authRouter = express.Router();

authRouter.post("/api/signup", async (req, res) => {
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
    return sendError(res, 400, "Invalid signup data!");
  }

  const user = new User(signupData);

  try {
    await user.save();
    const userData = user.toObject();
    delete userData.password;

    return sendSuccess(
      res,
      201,
      "Account created successfully. Please log in to continue.",
      userData,
    );
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return sendError(res, 409, "Email is already registered.");
    }

    return sendError(res, 500, "Error creating user. Please try again later.");
  }
});

authRouter.post("/api/login", async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return sendError(res, 500, "Authentication service is not configured.");
  }

  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 128
  ) {
    return sendError(res, 400, "Email and password are required!");
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return sendError(res, 401, "Invalid email or password!");
    }

    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      return sendError(res, 401, "Invalid email or password!");
    }

    const token = await user.getJWT();

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userData = user.toObject();
    delete userData.password;

    return sendSuccess(res, 200, "Login successful!", userData);
  } catch (error) {
    console.error("Error during login:", error);
    return sendError(res, 500, "Error during login. Please try again later.");
  }
});

authRouter.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  return sendSuccess(res, 200, "Logout successful!");
});

authRouter.patch("/api/changePassword", async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  if (
    typeof email !== "string" ||
    typeof oldPassword !== "string" ||
    typeof newPassword !== "string" ||
    email.length > 254 ||
    oldPassword.length > 128 ||
    newPassword.length > 128
  ) {
    return sendError(
      res,
      400,
      "Email, old password, and new password are required!",
    );
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return sendError(res, 404, "User not found!");
    }

    const isOldPasswordValid = await user.validatePassword(oldPassword);

    if (!isOldPasswordValid) {
      return sendError(res, 401, "Invalid old password!");
    }

    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 200, "Password changed successfully!");
  } catch (error) {
    console.error("Error changing password:", error);
    return sendError(
      res,
      500,
      "Error changing password. Please try again later.",
    );
  }
});

authRouter.post("/api/forgotPassword", async (req, res) => {
  const { email } = req.body;

  if (typeof email !== "string" || email.length > 254) {
    return sendError(res, 400, "A valid email is required!");
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return sendError(res, 404, "User not found!");
    }

    // Here you would typically generate a password reset token and send it via email.
    // For simplicity, we'll just return a success message.

    return sendSuccess(
      res,
      200,
      "Password reset instructions sent to your email.",
    );
  } catch (error) {
    console.error("Error during forgot password:", error);
    return sendError(
      res,
      500,
      "Error during forgot password. Please try again later.",
    );
  }
});

export default authRouter;
