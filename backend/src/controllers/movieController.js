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
  requireFields(req.body, ["title"]);
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

module.exports = {
  getMovies,
  getMovieDetail,
  createMovie,
  updateMovie,
  deleteMovie,
};
