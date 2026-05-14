const seatService = require("../services/seatService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getSeatsByShowtime = asyncHandler(async (req, res) => {
  const seats = await seatService.getSeatsByShowtime(req.params.showtimeId);
  return successResponse(res, "Get seats successfully", seats);
});

const getSeatsByRoom = asyncHandler(async (req, res) => {
  const seats = await seatService.getSeatsByRoom(req.params.roomId);
  return successResponse(res, "Get room seats successfully", seats);
});

module.exports = {
  getSeatsByShowtime,
  getSeatsByRoom,
};
