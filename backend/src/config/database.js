const uri =
  "mongodb+srv://shikharnitsri_db_user:qFOkVH6LejxVNkVu@nodejs-practice.jar12sr.mongodb.net/devTinder";

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
