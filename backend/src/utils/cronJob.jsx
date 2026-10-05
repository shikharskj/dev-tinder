import cron from "node-cron";
import ConnectionRequest from "../models/connectionRequest";
import { endOfDay, startOfDay, subDays } from "date-fns";

// Just for learning cron concept; not currently being used in the project
// This job will run at 08:00 AM every day
export const cronJob = () => {
  cron.schedule("0 8 * * *", async () => {
    try {
      const yesterday = subDays(new Date(), 1);
      const startOfYesterday = startOfDay(yesterday);
      const endOfYesterday = endOfDay(yesterday);

      const pendingRequests = await ConnectionRequest.find({
        status: "interested",
        createdAt: {
          $gte: startOfYesterday,
          $lt: endOfYesterday,
        },
      }).populate("fromUserId toUserId", "name email");

      const listOfEmails = pendingRequests.map((request) => ({
        senderEmail: request.fromUserId.email,
        receiverEmail: request.toUserId.email,
      }));

      const emailData = {
        subject: "New Connection Request",
        text: "A new connection request has been received. Please login to your account to view the request.",
        listOfEmails,
      };

      await sendEmail(emailData);
    } catch (error) {
      console.error("Error executing cron job:", error);
    }
  });
};
