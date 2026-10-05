import jwt from "jsonwebtoken";
import { effectiveUsagePlan } from "../utils/subscription.js";
import User from "../models/user.js";
import { sendError } from "../utils/response.js";

const authenticateUser = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return sendError(res, 401, "Access denied. No token provided.");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return sendError(res, 401, "Invalid token.");
  }

  try {
    const { userId } = decoded;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    // Request-local access decision. Never expire the provider subscription here.
    user.usagePlan = effectiveUsagePlan(user);

    req.user = user;
    return next();
  } catch (error) {
    console.error(
      "Error authenticating user:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return sendError(res, 500, "Unable to authenticate user.");
  }
};

export default authenticateUser;
