const AppError = require("./AppError");

const requireFields = (body, fields) => {
  const missingFields = fields.filter((field) => !body[field]);
  if (missingFields.length > 0) {
    throw new AppError(`Missing fields: ${missingFields.join(", ")}`, 400);
  }
};

const toPositiveInt = (value, defaultValue) => {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number) || number < 1) {
    return defaultValue;
  }
  return number;
};

module.exports = {
  requireFields,
  toPositiveInt,
};
