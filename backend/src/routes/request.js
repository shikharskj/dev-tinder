import express from "express";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { isValidUserId } from "../utils/validation.js";
import { sendError, sendSuccess } from "../utils/response.js";
import ConnectionRequest from "../models/connectionRequest.js";
import {
  dispatchPendingEmails,
  enqueueEmail,
} from "../utils/emailNotifications.js";

const sendConnectionRequestAllowedStatuses = ["ignored", "interested"];
const reviewConnectionRequestAllowedStatuses = ["accepted", "rejected"];

const requestRouter = express.Router();

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

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });
      let connectionRequestData;

      await ConnectionRequest.db.transaction(async (session) => {
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

      return sendSuccess(
        res,
        200,
        `${req.user.firstName} ${req.user.lastName} has been ${status} successfully!`,
        connectionRequestData,
      );
    } catch (error) {
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
