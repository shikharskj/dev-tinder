import express from "express";
import connectDB from "./config/database.js";
import User from "./models/user.js";

const app = express();
// express.json() middleware is used to parse incoming JSON requests and make the data available in req.body
app.use(express.json());

app.post("/api/signup", async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    res
      .status(201)
      .send("Account created successfully. Please log in to continue.");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Error creating user. Please try again later.");
  }
});

app.get("/api/user", async (req, res) => {
  try {
    const userEmail = req.body.email;
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      res.status(404).send(`No user found with email ${userEmail}`);
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(`Error fetching the user with email ${userEmail}:`, error);
    res.status(500).send(`Error fetching the user with email ${userEmail}`);
  }
});

app.patch("/api/user", async (req, res) => {
  try {
    const userId = req.body.id;
    const updatedData = req.body.data;

    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    if (!updatedUser) {
      res.status(404).send(`No user found with ID ${userId}`);
      return;
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Error updating the user with ID ${userId}:`, error);
    res.status(500).send(`Error updating the user with ID ${userId}`);
  }
});

app.delete("/api/user", async (req, res) => {
  try {
    const userId = req.body.id;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      res.status(404).send(`No user found with ID ${userId}`);
      return;
    }

    res.status(200).send(`User with ID ${userId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting the user with ID ${userId}:`, error);
    res.status(500).send(`Error deleting the user with ID ${userId}`);
  }
});

app.get("/api/feed", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error fetching users");
  }
});

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
