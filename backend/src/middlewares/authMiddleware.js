const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/jwt");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication token is required", 401));
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  req.user = decoded;
  next();
};

module.exports = authMiddleware;
