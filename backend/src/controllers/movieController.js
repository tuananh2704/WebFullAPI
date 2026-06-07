const movieService = require("../services/movieService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { requireFields, toPositiveInt } = require("../utils/validators");

const getMovies = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 10), 50);
  const data = await movieService.getMovies({
    page,
    limit,
    search: req.query.search,
    genre: req.query.genre,
    status: req.query.status,
  });

  return successResponse(res, "Get movies successfully", data);
});

const getMovieDetail = asyncHandler(async (req, res) => {
  const movie = await movieService.getMovieById(req.params.id);
  return successResponse(res, "Get movie detail successfully", movie);
});

const createMovie = asyncHandler(async (req, res) => {
  requireFields(req.body, [
    "title",
    "description",
    "director",
    "duration",
    "release_date",
    "poster_url",
    "trailer_url",
    "language",
    "age_rating",
    "rating",
    "status",
    "genres",
  ]);
  const movie = await movieService.createMovie(req.body);
  return successResponse(res, "Create movie successfully", movie, 201);
});

const updateMovie = asyncHandler(async (req, res) => {
  const movie = await movieService.updateMovie(req.params.id, req.body);
  return successResponse(res, "Update movie successfully", movie);
});

const deleteMovie = asyncHandler(async (req, res) => {
  await movieService.deleteMovie(req.params.id);
  return successResponse(res, "Delete movie successfully");
});

const getMovieTrailers = asyncHandler(async (_req, res) => {
  const trailers = await movieService.getTrailerMovies();
  return successResponse(res, "Get movie trailers successfully", trailers);
});

const getMovieRatings = asyncHandler(async (req, res) => {
  const data = await movieService.getMovieRatings(req.params.movieId);
  return successResponse(res, "Get movie ratings successfully", data);
});

const getCanRateMovie = asyncHandler(async (req, res) => {
  const data = await movieService.getCanRateMovie(req.params.movieId, req.user.id);
  return successResponse(res, "Check movie rating permission successfully", data);
});

const createMovieRating = asyncHandler(async (req, res) => {
  requireFields(req.body, ["bookingId", "rating"]);
  const data = await movieService.createMovieRating({
    movieId: req.params.movieId,
    userId: req.user.id,
    bookingId: req.body.bookingId,
    rating: req.body.rating,
    comment: req.body.comment || "",
  });
  return successResponse(res, "Create movie rating successfully", data, 201);
});

module.exports = {
  getMovies,
  getMovieDetail,
  createMovie,
  updateMovie,
  deleteMovie,
  getMovieTrailers,
  getMovieRatings,
  getCanRateMovie,
  createMovieRating,
};
