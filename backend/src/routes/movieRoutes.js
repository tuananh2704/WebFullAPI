const express = require("express");
const movieController = require("../controllers/movieController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", movieController.getMovies);
router.get("/search", movieController.getMovies);
router.get("/trailers", movieController.getMovieTrailers);
router.get("/:movieId/ratings", movieController.getMovieRatings);
router.get("/:movieId/can-rate", authMiddleware, movieController.getCanRateMovie);
router.post("/:movieId/ratings", authMiddleware, movieController.createMovieRating);
router.get("/:id", movieController.getMovieDetail);

module.exports = router;
