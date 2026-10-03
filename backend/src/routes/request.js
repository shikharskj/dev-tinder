import express from "express";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { isValidUserId } from "../../utils/validation.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import ConnectionRequest from "../models/connectionRequest.js";

import { run as sendEmail } from "../../utils/sendEmail.js";

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
        fromUserId: fromUserId,
        toUserId: toUserId,
        status: status,
      });

      const connectionRequestData = await connectionRequest.save();

      if (status === "interested") {
        try {
          // Temporary override for sandbox testing.
          // Confirm the actual email field in your User schema.
          const toAddress =
            process.env.SES_TEST_TO || targetUser.emailId;
      
          if (!toAddress) {
            throw new Error("Recipient email is missing");
          }
      
          const senderName = [
            req.user.firstName,
            req.user.lastName,
          ]
            .filter(Boolean)
            .join(" ");
      
            await sendEmail({
              toAddress: process.env.SES_TEST_TO || targetUser.emailId,
              senderName: [req.user.firstName, req.user.lastName]
                .filter(Boolean)
                .join(" "),
              recipientName: targetUser.firstName,
            });
      
          console.log("SES accepted email:", emailResponse.MessageId);
        } catch (emailError) {
          console.error("Connection saved, but notification failed:", {
            name: emailError.name,
            message: emailError.message,
          });
        }
      }

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
      const updatedRequest = await ConnectionRequest.findOneAndUpdate(
        {
          _id: requestId,
          toUserId: loggedInUserId,
          status: "interested",
        },
        { $set: { status } },
        { new: true, runValidators: true },
      );

      if (!updatedRequest) {
        return sendError(
          res,
          404,
          "Connection request not found or already reviewed.",
        );
      }

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
