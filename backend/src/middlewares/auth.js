import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { sendError } from "../../utils/response.js";

const authenticateUser = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return sendError(res, 401, "Access denied. No token provided.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId } = decoded;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, "Invalid token.");
  }
};

export default authenticateUser;
