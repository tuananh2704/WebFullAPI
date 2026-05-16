const express = require("express");
const cinemaController = require("../controllers/cinemaController");

const router = express.Router();

// GET /api/cinemas?city=hanoi&brand=CGV
router.get("/", cinemaController.getAll);

// GET /api/cinemas/:id — chi tiết rạp + rooms
router.get("/:id", cinemaController.getById);

// GET /api/cinemas/:id/rooms — rooms của rạp
router.get("/:id/rooms", cinemaController.getRoomsByCinema);

// GET /api/cinemas/:id/showtimes?movie_id=&date=YYYY-MM-DD&week=1
router.get("/:id/showtimes", cinemaController.getShowtimesByCinema);

module.exports = router;
