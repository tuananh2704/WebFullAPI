const showtimeService = require("../services/showtimeService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { requireFields } = require("../utils/validators");

const getShowtimesByMovie = asyncHandler(async (req, res) => {
  const showtimes = await showtimeService.getShowtimesByMovie(req.params.movieId);
  return successResponse(res, "Get showtimes successfully", showtimes);
});

const getShowtimes = asyncHandler(async (req, res) => {
  const showtimes = await showtimeService.getShowtimes(req.query);
  return successResponse(res, "Get showtimes successfully", showtimes);
});

const createShowtime = asyncHandler(async (req, res) => {
  requireFields(req.body, ["movie_id", "room_id", "start_time", "end_time"]);
  const showtime = await showtimeService.createShowtime(req.body);
  return successResponse(res, "Create showtime successfully", showtime, 201);
});

const updateShowtime = asyncHandler(async (req, res) => {
  const showtime = await showtimeService.updateShowtime(req.params.id, req.body);
  return successResponse(res, "Update showtime successfully", showtime);
});

const deleteShowtime = asyncHandler(async (req, res) => {
  await showtimeService.deleteShowtime(req.params.id);
  return successResponse(res, "Delete showtime successfully");
});

module.exports = {
  getShowtimes,
  getShowtimesByMovie,
  createShowtime,
  updateShowtime,
  deleteShowtime,
};
