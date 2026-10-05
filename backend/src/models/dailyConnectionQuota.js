import mongoose from "mongoose";

const dailyConnectionQuotaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dayStart: {
      type: Date,
      required: true,
    },
    requestsUsed: {
      type: Number,
      default: 0,
      min: 0,
      max: 20,
      required: true,
    },
  },
  { timestamps: true },
);

dailyConnectionQuotaSchema.index(
  { userId: 1, dayStart: 1 },
  { unique: true },
);

const DailyConnectionQuota = mongoose.model(
  "DailyConnectionQuota",
  dailyConnectionQuotaSchema,
);

export default DailyConnectionQuota;
