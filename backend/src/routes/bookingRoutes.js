const express = require("express");
const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.post("/", bookingController.createBooking);
router.get("/history", bookingController.getBookingHistory);
router.get("/:id", bookingController.getBookingDetail);

module.exports = router;
