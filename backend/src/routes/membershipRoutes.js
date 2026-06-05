const express = require("express");
const membershipController = require("../controllers/membershipController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public — xem tất cả tiers (trang giới thiệu VIP)
router.get("/tiers", membershipController.getAllTiers);

// Protected — cần đăng nhập
router.use(authMiddleware);
router.get("/me", membershipController.getMembership);
router.get("/history", membershipController.getTierHistory);
router.get("/benefits/usage", membershipController.getBenefitUsage);
router.get("/vouchers", membershipController.getUserVouchers);
router.post("/vouchers/exchange", membershipController.exchangePointsForVoucher);

module.exports = router;
