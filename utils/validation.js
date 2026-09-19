export const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isValidUserId = (userId) =>
  mongoose.Types.ObjectId.isValid(userId);

export const sanitizeUserData = (data, allowedFields) => {
  if (!isPlainObject(data)) return null;

  const keys = Object.keys(data);
  if (keys.some((key) => !allowedFields.includes(key))) return null;

  const sanitizedData = {};
  for (const key of keys) {
    const value = data[key];

    if (key === "age") {
      if (!Number.isInteger(value) || value < 18 || value > 50) return null;
      sanitizedData[key] = value;
      continue;
    }

    if (["interests", "skills"].includes(key)) {
      if (
        !Array.isArray(value) ||
        value.length > (key === "skills" ? 5 : 20) ||
        value.some(
          (item) => typeof item !== "string" || item.trim().length > 50,
        )
      ) {
        return null;
      }
      sanitizedData[key] = value.map((item) => item.trim());
      continue;
    }

    if (typeof value !== "string" || value.trim().length === 0) return null;
    const sanitizedValue = value.trim();
    if (key === "password" && sanitizedValue.length < 8) return null;
    const maxLength = key === "password" ? 128 : key === "bio" ? 1000 : 100;
    if (sanitizedValue.length > maxLength) return null;
    sanitizedData[key] =
      key === "email" ? sanitizedValue.toLowerCase() : sanitizedValue;
  }

  return sanitizedData;
};
