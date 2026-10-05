const allowedEditFields = new Set([
  "firstName",
  "lastName",
  "age",
  "gender",
  "photoUrl",
  "skills",
  "interests",
  "location",
  "bio",
]);

const urlRegex = /^https?:\/\/\S+$/i;

export const validateProfileData = (data) => {
  const errors = {};

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { profile: "Profile data must be an object." };
  }

  for (const field of Object.keys(data)) {
    if (!allowedEditFields.has(field)) {
      errors[field] = "This field cannot be edited.";
    }
  }

  if (Object.hasOwn(data, "firstName")) {
    if (
      typeof data.firstName !== "string" ||
      data.firstName.trim().length < 3
    ) {
      errors.firstName = "First name must be at least 3 characters long.";
    } else if (data.firstName.trim().length > 100) {
      errors.firstName = "First name cannot exceed 100 characters.";
    }
  }

  if (Object.hasOwn(data, "lastName")) {
    if (typeof data.lastName !== "string" || data.lastName.trim().length < 3) {
      errors.lastName = "Last name must be at least 3 characters long.";
    } else if (data.lastName.trim().length > 100) {
      errors.lastName = "Last name cannot exceed 100 characters.";
    }
  }

  if (Object.hasOwn(data, "age")) {
    if (!Number.isInteger(data.age) || data.age < 18 || data.age > 50) {
      errors.age = "Age must be an integer between 18 and 50.";
    }
  }

  if (Object.hasOwn(data, "gender")) {
    if (!["Male", "Female", "Other"].includes(data.gender)) {
      errors.gender = "Gender must be 'Male', 'Female', or 'Other'.";
    }
  }

  if (Object.hasOwn(data, "photoUrl") && data.photoUrl !== null) {
    if (
      typeof data.photoUrl !== "string" ||
      !urlRegex.test(data.photoUrl.trim())
    ) {
      errors.photoUrl = "Photo URL must be a valid HTTP or HTTPS URL.";
    } else if (data.photoUrl.trim().length > 2048) {
      errors.photoUrl = "Photo URL cannot exceed 2048 characters.";
    }
  }

  for (const field of ["skills", "interests"]) {
    if (!Object.hasOwn(data, field)) continue;

    const value = data[field];
    const maximum = field === "skills" ? 5 : 20;
    if (!Array.isArray(value)) {
      errors[field] = `${field} must be an array of strings.`;
      continue;
    }

    if (value.length > maximum) {
      errors[field] = `${field} cannot contain more than ${maximum} items.`;
      continue;
    }

    if (
      value.some(
        (item) =>
          typeof item !== "string" ||
          item.trim().length === 0 ||
          item.trim().length > 50,
      )
    ) {
      errors[field] =
        `Each ${field.slice(0, -1)} must contain between 1 and 50 characters.`;
    }
  }

  if (Object.hasOwn(data, "location")) {
    if (typeof data.location !== "string" || data.location.trim().length < 2) {
      errors.location = "Location must be at least 2 characters long.";
    } else if (data.location.trim().length > 100) {
      errors.location = "Location cannot exceed 100 characters.";
    }
  }

  if (Object.hasOwn(data, "bio")) {
    if (typeof data.bio !== "string") {
      errors.bio = "Bio must be a string.";
    } else if (data.bio.trim().length > 1000) {
      errors.bio = "Bio cannot exceed 1000 characters.";
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
};
