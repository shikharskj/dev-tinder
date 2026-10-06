import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import connectDB from "./config/database.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import requestRouter from "./routes/request.js";
import userRouter from "./routes/user.js";
import paymentRouter from "./routes/payment.js";
import chatRouter from "./routes/chat.js";
import { startEmailWorker } from "./utils/emailNotifications.js";
import initializeSocket from "./utils/socket.js";

const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5174";
const port = Number(process.env.PORT || 7777);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const app = express();

const server = http.createServer(app);

const io = initializeSocket(server);
app.set("io", io);

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(
  "/payment/webhook",
  express.raw({ type: "application/json", limit: "100kb" }),
);
app.use(express.json({ limit: "32kb" }));

app.use(authRouter);
app.use(profileRouter);
app.use(requestRouter);
app.use(userRouter);
app.use(paymentRouter);
app.use(chatRouter);

const startServer = async () => {
  await connectDB();
  startEmailWorker();

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
