const express = require("express");
const promotionController = require("../controllers/promotionController");
const { verifyToken } = require("../utils/jwt");

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(authHeader.split(" ")[1]);
    } catch {
      req.user = null;
    }
  }
  next();
};

router.post("/apply", optionalAuth, promotionController.applyPromotionCode);

module.exports = router;
