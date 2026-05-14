const { errorResponse } = require("../utils/apiResponse");

const notFoundMiddleware = (req, res) => {
  return errorResponse(res, `Route not found: ${req.originalUrl}`, 404);
};

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  return errorResponse(res, message, statusCode);
};

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};
