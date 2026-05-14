const express = require("express");
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, paymentController.createPayment);

module.exports = router;
