const AppError = require("../utils/AppError");

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasPermission = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      return next(new AppError("You do not have permission to access this resource", 403));
    }

    next();
  };
};

module.exports = roleMiddleware;
