import express from "express";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { isValidUserId } from "../utils/validation.js";
import { sendError, sendSuccess } from "../utils/response.js";
import ConnectionRequest from "../models/connectionRequest.js";
import DailyConnectionQuota from "../models/dailyConnectionQuota.js";
import { addSeconds, fromUnixTime, getUnixTime } from "date-fns";
import {
  dispatchPendingEmails,
  enqueueEmail,
} from "../utils/emailNotifications.js";

const sendConnectionRequestAllowedStatuses = ["ignored", "interested"];
const reviewConnectionRequestAllowedStatuses = ["accepted", "rejected"];
const BASIC_DAILY_REQUEST_LIMIT = 20;
const SECONDS_PER_DAY = 24 * 60 * 60;

const requestRouter = express.Router();

class DailyLimitError extends Error {
  constructor(resetAt) {
    super("You’ve reached today’s 20 connection request limit.");
    this.resetAt = resetAt;
  }
}

function getUtcDayWindow(now = new Date()) {
  const dayStart = fromUnixTime(
    Math.floor(getUnixTime(now) / SECONDS_PER_DAY) * SECONDS_PER_DAY,
  );
  return { dayStart, resetAt: addSeconds(dayStart, SECONDS_PER_DAY) };
}

async function ensureDailyQuota(userId, dayStart) {
  try {
    await DailyConnectionQuota.updateOne(
      { userId, dayStart },
      { $setOnInsert: { requestsUsed: 0 } },
      { upsert: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
}

async function getQuotaStatus(user, now = new Date()) {
  const isElite = user.usagePlan === "Elite";
  const { dayStart, resetAt } = getUtcDayWindow(now);

  if (isElite) {
    return {
      usagePlan: "Elite",
      isElite: true,
      limit: null,
      used: null,
      remaining: null,
      resetAt: null,
    };
  }

  const quota = await DailyConnectionQuota.findOne({
    userId: user._id,
    dayStart,
  }).lean();
  const used = quota?.requestsUsed ?? 0;

  return {
    usagePlan: "Basic",
    isElite: false,
    limit: BASIC_DAILY_REQUEST_LIMIT,
    used,
    remaining: Math.max(0, BASIC_DAILY_REQUEST_LIMIT - used),
    resetAt,
  };
}

requestRouter.get("/request/quota", authenticateUser, async (req, res) => {
  try {
    return sendSuccess(
      res,
      200,
      "Daily connection request allowance fetched.",
      await getQuotaStatus(req.user),
    );
  } catch (error) {
    console.error("Error fetching daily connection request allowance:", error);
    return sendError(res, 500, "Unable to fetch your daily request allowance.");
  }
});

requestRouter.post(
  `/request/send/:status/:toUserId`,
  authenticateUser,
  async (req, res) => {
    const { toUserId, status } = req.params;
    const fromUserId = req.user._id;

    if (!isValidUserId(toUserId)) {
      return sendError(res, 400, "Invalid target user ID!");
    }

    if (!sendConnectionRequestAllowedStatuses.includes(status)) {
      return sendError(res, 400, "Invalid request status!");
    }

    try {
      const targetUser = await User.findById(toUserId);

      if (!targetUser) {
        return sendError(res, 404, "Target user not found!");
      }

      // Check if a request already exists between the two users
      const existingRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });

      if (existingRequest) {
        return sendError(
          res,
          400,
          "A request already exists between these users!",
        );
      }

      const pairKey = [String(fromUserId), String(toUserId)].sort().join(":");
      const connectionRequest = new ConnectionRequest({
        pairKey,
        fromUserId,
        toUserId,
        status,
      });
      let connectionRequestData;
      let quotaUsage;
      const quotaWindow = getUtcDayWindow();

      if (status === "interested" && req.user.usagePlan !== "Elite") {
        await ensureDailyQuota(fromUserId, quotaWindow.dayStart);
      }

      await ConnectionRequest.db.transaction(async (session) => {
        if (status === "interested" && req.user.usagePlan !== "Elite") {
          quotaUsage = await DailyConnectionQuota.findOneAndUpdate(
            {
              userId: fromUserId,
              dayStart: quotaWindow.dayStart,
              requestsUsed: { $lt: BASIC_DAILY_REQUEST_LIMIT },
            },
            { $inc: { requestsUsed: 1 } },
            { returnDocument: "after", session },
          );

          if (!quotaUsage) throw new DailyLimitError(quotaWindow.resetAt);
        }

        connectionRequestData = await connectionRequest.save({ session });

        if (status === "interested") {
          await enqueueEmail(
            {
              eventKey: `connection-request:${connectionRequest._id}`,
              template: "connection-request",
              toAddress: targetUser.email,
              data: {
                recipientName: targetUser.firstName,
                senderName: [req.user.firstName, req.user.lastName]
                  .filter(Boolean)
                  .join(" "),
              },
            },
            { session },
          );
        }
      });
      if (status === "interested") void dispatchPendingEmails();

      const quota = await getQuotaStatus(req.user);
      const requestResponse = connectionRequestData.toObject();
      delete requestResponse.pairKey;
      requestResponse.quota = quota;
      return sendSuccess(
        res,
        200,
        `${req.user.firstName} ${req.user.lastName} has been ${status} successfully!`,
        requestResponse,
      );
    } catch (error) {
      if (error instanceof DailyLimitError) {
        return sendError(res, 429, error.message, {
          usagePlan: "Basic",
          isElite: false,
          limit: BASIC_DAILY_REQUEST_LIMIT,
          used: BASIC_DAILY_REQUEST_LIMIT,
          remaining: 0,
          resetAt: error.resetAt,
        });
      }
      if (error?.code === 11000 && error?.keyPattern?.pairKey) {
        return sendError(
          res,
          400,
          "A request already exists between these users!",
        );
      }
      console.error("Error sending request:", error);
      return sendError(res, 500, "Error sending request.");
    }
  },
);

requestRouter.post(
  "/request/review/:status/:requestId",
  authenticateUser,
  async (req, res) => {
    const { requestId, status } = req.params;
    const loggedInUserId = req.user._id;

    if (!reviewConnectionRequestAllowedStatuses.includes(status)) {
      return sendError(res, 400, "Invalid request status!");
    }

    if (!isValidUserId(requestId)) {
      return sendError(res, 400, "Invalid request ID!");
    }

    try {
      let requester;
      const updatedRequest = await ConnectionRequest.db.transaction(
        async (session) => {
          const request = await ConnectionRequest.findOneAndUpdate(
            {
              _id: requestId,
              toUserId: loggedInUserId,
              status: "interested",
            },
            { $set: { status } },
            { returnDocument: "after", runValidators: true, session },
          );

          if (!request) return null;

          requester = await User.findById(request.fromUserId)
            .select("firstName email")
            .session(session);

          if (requester) {
            const template =
              status === "accepted"
                ? "connection-accepted"
                : "connection-declined";
            const data =
              status === "accepted"
                ? {
                    recipientName: requester.firstName,
                    senderName: [req.user.firstName, req.user.lastName]
                      .filter(Boolean)
                      .join(" "),
                  }
                : { recipientName: requester.firstName };

            await enqueueEmail(
              {
                eventKey: `connection-${status}:${request._id}`,
                template,
                toAddress: requester.email,
                data,
              },
              { session },
            );
          }

          return request;
        },
      );

      if (!updatedRequest) {
        return sendError(
          res,
          404,
          "Connection request not found or already reviewed.",
        );
      }
      if (requester) void dispatchPendingEmails();

      return sendSuccess(
        res,
        200,
        `Connection request has been ${status} successfully!`,
        updatedRequest,
      );
    } catch (error) {
      return sendError(res, 500, "Error reviewing request.");
    }
  },
);

export default requestRouter;
