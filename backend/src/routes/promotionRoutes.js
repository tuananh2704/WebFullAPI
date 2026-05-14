const express = require("express");
const promotionController = require("../controllers/promotionController");

const router = express.Router();

router.post("/apply", promotionController.applyPromotionCode);

module.exports = router;
