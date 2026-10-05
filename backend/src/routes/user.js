import express from "express";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { DIGITS_ONLY_PATTERN, UPDATE_FIELDS } from "../../constants.js";
import { sendError, sendSuccess } from "../utils/response.js";
import ConnectionRequest from "../models/connectionRequest.js";
import mongoose from "mongoose";

const userRouter = express.Router();

// Get incoming connection requests that are awaiting review.
userRouter.get("/user/requests", authenticateUser, async (req, res) => {
  const loggedInUserId = req.user._id;

  try {
    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUserId,
      status: "interested",
    }).populate("fromUserId", [
      "firstName",
      "lastName",
      "photoUrl",
      "bio",
      "skills",
      "interests",
      "location",
      "age",
      "gender",
    ]);

    return sendSuccess(
      res,
      200,
      "Connection requests fetched successfully.",
      connectionRequests,
    );
  } catch (error) {
    console.error("Error fetching connection requests:", error);
    return sendError(res, 500, "Error fetching connection requests.");
  }
});

userRouter.get("/user/requests/sent", authenticateUser, async (req, res) => {
  try {
    const sentRequests = await ConnectionRequest.find({
      fromUserId: req.user._id,
      status: { $in: ["interested", "accepted", "rejected"] },
    })
      .populate(
        "toUserId",
        "firstName lastName photoUrl bio skills interests location age gender",
      )
      .sort({ updatedAt: -1 });

    return sendSuccess(
      res,
      200,
      "Sent connection requests fetched successfully.",
      sentRequests,
    );
  } catch (error) {
    console.error("Error fetching sent connection requests:", error);
    return sendError(res, 500, "Error fetching sent connection requests.");
  }
});

userRouter.get("/user/connections", authenticateUser, async (req, res) => {
  const loggedInUserId = req.user._id;

  try {
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUserId, status: "accepted" },
        { toUserId: loggedInUserId, status: "accepted" },
      ],
    })
      .populate(
        "fromUserId",
        "firstName lastName photoUrl bio skills interests location age gender",
      )
      .populate(
        "toUserId",
        "firstName lastName photoUrl bio skills interests location age gender",
      );

    const connections = connectionRequests.map((request) => {
      const otherUser =
        request.fromUserId?._id?.toString() === loggedInUserId.toString()
          ? request.toUserId
          : request.fromUserId;

      return {
        requestId: request._id,
        connectedAt: request.updatedAt,
        user: otherUser,
      };
    });

    return sendSuccess(
      res,
      200,
      "All connections fetched successfully.",
      connections,
    );
  } catch (error) {
    console.error("Error fetching user connections:", error);
    return sendError(res, 500, "Error fetching user connections.");
  }
});

userRouter.get("/feed", authenticateUser, async (req, res) => {
  const loggedInUserId = req.user._id;

  const parsePositiveInteger = (value, defaultValue) => {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value !== "string" || !DIGITS_ONLY_PATTERN.test(value)) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isSafeInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : null;
  };

  const page = parsePositiveInteger(req.query.page, 1);
  let limit = parsePositiveInteger(req.query.limit, 10);

  if (page === null || limit === null) {
    return sendError(res, 400, "Page and limit must be positive integers.");
  }

  limit = limit > 50 ? 50 : limit;

  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    return sendError(res, 400, "Page is too large.");
  }

  // Logged in user should see all cards on his feed except -
  // 1 - His own cards
  // 2 - His connections/matches
  // 3 - Already ignored/sent connection requests

  try {
    const connectionRequest = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUserId }, { toUserId: loggedInUserId }],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set();

    connectionRequest.forEach((request) => {
      hideUsersFromFeed.add(request.fromUserId.toString());
      hideUsersFromFeed.add(request.toUserId.toString());
    });

    const users = await User.aggregate([
      {
        $match: {
          _id: {
            $nin: Array.from(
              hideUsersFromFeed,
              (userId) => new mongoose.Types.ObjectId(userId),
            ),
            $ne: loggedInUserId,
          },
        },
      },
      {
        $addFields: {
          isElite: {
            $and: [
              { $eq: ["$usagePlan", "Elite"] },
              { $gt: ["$eliteSubscriptionExpiresAt", new Date()] },
            ],
          },
        },
      },
      { $sort: { isElite: -1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          photoUrl: 1,
          bio: 1,
          skills: 1,
          interests: 1,
          location: 1,
          age: 1,
          gender: 1,
          isElite: 1,
        },
      },
    ]);

    return sendSuccess(res, 200, "Feed fetched successfully.", users);
  } catch (error) {
    return sendError(res, 500, "Error fetching feed for the user.");
  }
});
export default userRouter;
