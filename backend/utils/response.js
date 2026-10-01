export const sendSuccess = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({ message, data });
};

export const sendError = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({ message, data });
};
