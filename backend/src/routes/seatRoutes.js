const express = require("express");
const seatController = require("../controllers/seatController");

const router = express.Router();

router.get("/showtime/:showtimeId", seatController.getSeatsByShowtime);
router.get("/room/:roomId", seatController.getSeatsByRoom);

module.exports = router;
