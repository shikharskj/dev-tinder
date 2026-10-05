import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema(
  {
    pairKey: {
      type: String,
      trim: true,
      select: false,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // reference to the User collection
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

connectionRequestSchema.index({ fromUserId: 1 });
connectionRequestSchema.index({ toUserId: 1 });
connectionRequestSchema.index({ pairKey: 1 }, { unique: true, sparse: true });

connectionRequestSchema.pre("save", async function () {
  const connectionRequest = this;

  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new Error("Cannot send a connection request to yourself.");
  }
});

const ConnectionRequest = mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema,
);

export default ConnectionRequest;
