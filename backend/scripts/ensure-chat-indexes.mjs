import "dotenv/config";
import mongoose from "mongoose";
import ChatBlock from "../src/models/chatBlock.js";
import ChatPreference from "../src/models/chatPreference.js";
import ChatPresence from "../src/models/chatPresence.js";
import ChatReport from "../src/models/chatReport.js";
import Conversation from "../src/models/conversation.js";
import Message from "../src/models/message.js";

const uri = process.env.DB_CONNECTION_STRING;
if (!uri) {
  throw new Error("DB_CONNECTION_STRING must be configured.");
}

try {
  await mongoose.connect(uri);
  const models = [
    Conversation,
    Message,
    ChatBlock,
    ChatPreference,
    ChatPresence,
    ChatReport,
  ];
  for (const model of models) {
    await model.createIndexes();
    const indexes = await model.collection.indexes();
    console.log(
      `${model.collection.collectionName}: ${indexes
        .map((index) => index.name)
        .join(", ")}`,
    );
  }
} finally {
  await mongoose.disconnect();
}
