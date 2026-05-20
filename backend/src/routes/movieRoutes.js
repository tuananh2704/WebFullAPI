const express = require("express");
const movieController = require("../controllers/movieController");

const router = express.Router();

router.get("/", movieController.getMovies);
router.get("/search", movieController.getMovies);
router.get("/trailers", movieController.getMovieTrailers);
router.get("/:id", movieController.getMovieDetail);

module.exports = router;
