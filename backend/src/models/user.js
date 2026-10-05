import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  BCRYPT_HASH_PATTERN,
  EMAIL_PATTERN,
  HTTP_URL_PATTERN,
} from "../../constants.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true, // mongodb automatically creates a unique index for this field
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, "Please provide a valid email address"],
    },
    usagePlan: {
      type: String,
      enum: ["Basic", "Elite"],
      default: "Basic",
      required: true,
    },
    razorpaySubscriptionId: {
      type: String,
      default: null,
    },
    eliteSubscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    subscriptionCreationKey: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
      select: false,
      validate: {
        validator: function (value) {
          return (
            BCRYPT_HASH_PATTERN.test(value) ||
            validator.isStrongPassword(value, {
              minLength: 8,
              minLowercase: 1,
              minUppercase: 1,
              minNumbers: 1,
              minSymbols: 1,
            })
          );
        },
        message:
          "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one symbol.",
      },
    },
    age: {
      type: Number,
      required: true,
      min: 18,
      max: 50,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    gender: {
      type: String,
      required: true,
      trim: true,
      enum: ["Male", "Female", "Other"],
      message: "Gender must be either 'Male', 'Female', or 'Other'",
    },
    location: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    photoUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2048,
      default:
        "https://i.pinimg.com/1200x/0b/97/6f/0b976f0a7aa1aa43870e1812eee5a55d.jpg",
      validate: {
        validator: (value) => HTTP_URL_PATTERN.test(value),
        message: "photoUrl must be a valid HTTP or HTTPS URL",
      },
    },
    bio: {
      type: String,
      required: false,
      trim: true,
      maxlength: 1000,
      default:
        "This is my bio. I am a passionate individual who loves to learn and grow. I am always looking for new opportunities to challenge myself and expand my horizons.",
    },
    interests: {
      type: [String],
      required: false,
      validate: [
        {
          validator: (value) => value.length <= 20,
          message: "You can have a maximum of 20 interests",
        },
        {
          validator: (value) =>
            value.every((item) => item.trim().length > 0 && item.length <= 50),
          message: "Each interest must be between 1 and 50 characters",
        },
      ],
    },
    skills: {
      type: [String],
      required: false,
      validate: [
        {
          validator: (value) => value.length <= 5,
          message: "You can have a maximum of 5 skills",
        },
        {
          validator: (value) =>
            value.every((item) => item.trim().length > 0 && item.length <= 50),
          message: "Each skill must be between 1 and 50 characters",
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || BCRYPT_HASH_PATTERN.test(this.password)) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.getJWT = function () {
  const user = this;

  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "30d",
    issuer: "dev-tinder",
    audience: "dev-tinder-client",
  });
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  return bcrypt.compare(passwordInputByUser, passwordHash);
};

const User = mongoose.model("User", userSchema);

export default User;
