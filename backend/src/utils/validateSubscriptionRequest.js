import validator from "validator";

export const sanitizeSubscriptionRequest = (data) => {
  if (
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    (Object.getPrototypeOf(data) !== Object.prototype &&
      Object.getPrototypeOf(data) !== null)
  ) {
    return null;
  }

  const allowedFields = ["firstName", "lastName", "email", "usagePlan"];
  if (
    Object.keys(data).length !== allowedFields.length ||
    Object.keys(data).some((field) => !allowedFields.includes(field))
  ) {
    return null;
  }

  const { firstName, lastName, email, usagePlan } = data;
  if (
    typeof firstName !== "string" ||
    firstName.trim().length < 3 ||
    firstName.trim().length > 100 ||
    typeof lastName !== "string" ||
    lastName.trim().length < 3 ||
    lastName.trim().length > 100 ||
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !validator.isEmail(email.trim()) ||
    usagePlan !== "Elite"
  ) {
    return null;
  }

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    usagePlan,
  };
};
