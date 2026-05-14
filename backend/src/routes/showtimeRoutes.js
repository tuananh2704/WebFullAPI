const express = require("express");
const showtimeController = require("../controllers/showtimeController");

const router = express.Router();

router.get("/", showtimeController.getShowtimes);
router.get("/movie/:movieId", showtimeController.getShowtimesByMovie);

module.exports = router;
