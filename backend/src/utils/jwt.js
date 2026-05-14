const jwt = require("jsonwebtoken");

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || "dev_secret", {
    expiresIn: "7d",
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
};

module.exports = {
  signToken,
  verifyToken,
};
