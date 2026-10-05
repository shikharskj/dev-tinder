import jwt from "jsonwebtoken";
import { isAfter } from "date-fns";
import User from "../models/user.js";
import Payment from "../models/payment.js";
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

    const now = new Date();
    if (
      user.usagePlan === "Elite" &&
      user.eliteSubscriptionExpiresAt &&
      !isAfter(user.eliteSubscriptionExpiresAt, now)
    ) {
      const subscriptionId = user.razorpaySubscriptionId;
      const expiryUpdate = await User.updateOne(
        {
          _id: user._id,
          usagePlan: "Elite",
          razorpaySubscriptionId: subscriptionId,
          eliteSubscriptionExpiresAt: { $lte: now },
        },
        {
          $set: { usagePlan: "Basic" },
          $unset: {
            razorpaySubscriptionId: 1,
            eliteSubscriptionExpiresAt: 1,
          },
        },
      );
      if (expiryUpdate.modifiedCount === 1) {
        await Payment.updateOne(
          {
            razorpaySubscriptionId: subscriptionId,
            subscriptionStatus: "active",
          },
          { $set: { subscriptionStatus: "expired", accessGranted: false } },
        );
        user.usagePlan = "Basic";
        user.razorpaySubscriptionId = null;
        user.eliteSubscriptionExpiresAt = null;
      } else {
        const refreshedUser = await User.findById(userId).select("-password");
        if (refreshedUser) {
          req.user = refreshedUser;
          return next();
        }
      }
    }

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
