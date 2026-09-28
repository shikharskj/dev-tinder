import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["ignored", "interested", "accepted", "rejected"],
      message:
        "Status must be either 'ignored', 'interested', 'accepted', or 'rejected'",
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

connectionRequestSchema.pre("save", async function (next) {
  const connectionRequest = this;

  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new Error("Cannot send a connection request to yourself.");
  }

  next();
});

const ConnectionRequest = mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema,
);

export default ConnectionRequest;
