const cinemaService = require("../services/cinemaService");
const showtimeService = require("../services/showtimeService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getAll = asyncHandler(async (req, res) => {
  const { city, brand } = req.query;
  const cinemas = await cinemaService.getAll({ city, brand });
  return successResponse(res, "Get cinemas successfully", cinemas);
});

const getById = asyncHandler(async (req, res) => {
  const cinema = await cinemaService.getById(req.params.id);
  return successResponse(res, "Get cinema successfully", cinema);
});

const getRoomsByCinema = asyncHandler(async (req, res) => {
  const rooms = await cinemaService.getRoomsByCinema(req.params.id);
  return successResponse(res, "Get rooms successfully", rooms);
});

const getShowtimesByCinema = asyncHandler(async (req, res) => {
  const { movie_id, date, week } = req.query;
  const showtimes = await showtimeService.getShowtimesByCinema(req.params.id, {
    movie_id,
    date,
    week,
  });
  return successResponse(res, "Get showtimes by cinema successfully", showtimes);
});

module.exports = {
  getAll,
  getById,
  getRoomsByCinema,
  getShowtimesByCinema,
};
