import express from "express";
import authenticateUser from "../middlewares/auth.js";
import User from "../models/user.js";
import { validateProfileData } from "../../utils/validateProfileData.js";
import { sendError, sendSuccess } from "../../utils/response.js";

const profileRouter = express.Router();

profileRouter.get("/profile", authenticateUser, async (req, res) => {
  try {
    const user = req.user;

    return sendSuccess(res, 200, "Profile fetched successfully.", user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return sendError(res, 401, "Invalid token.");
  }
});

profileRouter.patch("/profile/edit", authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const {
      firstName,
      lastName,
      age,
      gender,
      photoUrl,
      skills,
      interests,
      location,
      bio,
    } = req.body;

    const editableFields = {
      firstName,
      lastName,
      age,
      gender,
      photoUrl,
      skills,
      interests,
      location,
      bio,
    };
    const clearPhoto = photoUrl === null;

    const updateFields = Object.fromEntries(
      Object.entries(editableFields).filter(
        ([field, value]) =>
          value !== undefined && !(field === "photoUrl" && value === null),
      ),
    );

    const sanitizedFields = validateProfileData({
      ...updateFields,
      ...(clearPhoto ? { photoUrl: null } : {}),
    });

    if (sanitizedFields) {
      return sendError(res, 400, "Invalid profile data.", sanitizedFields);
    }

    const update = { $set: updateFields };
    if (clearPhoto) update.$unset = { photoUrl: 1 };

    const updatedUser = await User.findByIdAndUpdate(user._id, update, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return sendError(res, 404, "User not found.");
    }

    return sendSuccess(res, 200, "Profile updated successfully.", updatedUser);
  } catch (error) {
    console.error("Error fetching profile for edit:", error);
    return sendError(res, 401, "Invalid token.");
  }
});

export default profileRouter;
