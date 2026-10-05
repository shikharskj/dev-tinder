import express from "express";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { UPDATE_FIELDS } from "../../constants.js";
import { isValidUserId, sanitizeUserData } from "../utils/validation.js";
import { sendError, sendSuccess } from "../utils/response.js";
import ConnectionRequest from "../models/connectionRequest.js";

const userRouter = express.Router();

// userRouter.get("/user", async (req, res) => {
//   const userEmail =
//     typeof req.query.email === "string"
//       ? req.query.email.trim().toLowerCase()
//       : "";

//   if (!userEmail || userEmail.length > 254) {
//     return sendError(res, 400, "A valid email is required!");
//   }

//   try {
//     const user = await User.findOne({ email: userEmail }).select(
//       "-password -connectionRequests",
//     );

//     if (!user) {
//       return sendError(res, 404, `No user found with email ${userEmail}`);
//     }

//     return sendSuccess(res, 200, "User fetched successfully.", user);
//   } catch (error) {
//     console.error(`Error fetching the user with email ${userEmail}:`, error);
//     return sendError(res, 500, "Error fetching the user.");
//   }
// });

// userRouter.patch("/user/:id", authenticateUser, async (req, res) => {
//   const userId = req.params?.id;

//   if (!isValidUserId(userId)) {
//     return sendError(res, 400, "Invalid user ID!");
//   }

//   if (req.user._id.toString() !== userId) {
//     return sendError(res, 403, "You can only update your own account.");
//   }

//   try {
//     const updatedData = sanitizeUserData(req.body?.data, UPDATE_FIELDS);

//     if (!updatedData || Object.keys(updatedData).length === 0) {
//       return sendError(res, 400, "Invalid updates!");
//     }

//     if (updatedData.password) {
//       updatedData.password = await bcrypt.hash(updatedData.password, 10);
//     }

//     const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
//       new: true,
//       runValidators: true,
//     }).select("-password");

//     if (!updatedUser) {
//       return sendError(res, 404, `No user found with ID ${userId}`);
//     }

//     return sendSuccess(res, 200, "User updated successfully.", updatedUser);
//   } catch (error) {
//     console.error(`Error updating the user with ID ${userId}:`, error);
//     return sendError(res, 500, "Error updating the user.");
//   }
// });

// userRouter.delete("/user", authenticateUser, async (req, res) => {
//   const userId = req.body?.id;

//   if (typeof userId !== "string" || !isValidUserId(userId)) {
//     return sendError(res, 400, "Invalid user ID!");
//   }

//   if (req.user._id.toString() !== userId) {
//     return sendError(res, 403, "You can only delete your own account.");
//   }

//   try {
//     const deletedUser = await User.findByIdAndDelete(userId);

//     if (!deletedUser) {
//       return sendError(res, 404, `No user found with ID ${userId}`);
//     }

//     return sendSuccess(res, 200, "User deleted successfully.", { userId });
//   } catch (error) {
//     console.error(`Error deleting the user with ID ${userId}:`, error);
//     return sendError(res, 500, "Error deleting the user.");
//   }
// });

// userRouter.get("/feed", async (req, res) => {
//   try {
//     const users = await User.find().select("-password -connectionRequests");
//     return sendSuccess(res, 200, "Feed fetched successfully.", users);
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     return sendError(res, 500, "Error fetching users.");
//   }
// });

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

    if (typeof value !== "string" || !/^\d+$/.test(value)) {
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

    const users = await User.find({
      $and: [
        { _id: { $nin: Array.from(hideUsersFromFeed) } },
        { _id: { $ne: loggedInUserId } },
      ],
    })
      .select(
        "firstName lastName photoUrl bio skills interests location age gender",
      )
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(res, 200, "Feed fetched successfully.", users);
  } catch (error) {
    return sendError(res, 500, "Error fetching feed for the user.");
  }
});
export default userRouter;
