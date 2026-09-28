import express from "express";
import User from "../models/user.js";
import authenticateUser from "../middlewares/auth.js";
import { isValidUserId } from "../../utils/validation.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import ConnectionRequest from "../models/connectionRequest.js";

const allowedStatuses = ["ignored", "interested"];

const requestRouter = express.Router();

requestRouter.post(
  `/api/request/send/:status/:toUserId`,
  authenticateUser,
  async (req, res) => {
    const { toUserId, status } = req.params;
    const fromUserId = req.user._id;

    if (!isValidUserId(toUserId)) {
      return sendError(res, 400, "Invalid target user ID!");
    }

    if (!allowedStatuses.includes(status)) {
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

export default requestRouter;
