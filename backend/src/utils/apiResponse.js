const successResponse = (res, message = "", data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = "Server error", statusCode = 500, data = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
