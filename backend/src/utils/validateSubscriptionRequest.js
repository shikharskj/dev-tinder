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

  if (
    Object.keys(data).length !== 1 ||
    Object.keys(data)[0] !== "usagePlan" ||
    data.usagePlan !== "Elite"
  ) {
    return null;
  }

  return { usagePlan: "Elite" };
};
