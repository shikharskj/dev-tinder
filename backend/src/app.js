import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/database.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import requestRouter from "./routes/request.js";
import userRouter from "./routes/user.js";

const app = express({
  origin: "http://localhost:5174",
  credentials: true,
});
app.use(cors());
app.use(cookieParser());
// express.json() middleware is used to parse incoming JSON requests and make the data available in req.body
app.use(express.json());

app.use(authRouter);
app.use(profileRouter);
app.use(requestRouter);
app.use(userRouter);

const startServer = async () => {
  await connectDB();

  app.listen(7777, () => {
    console.log("Server is running on port 7777");
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
