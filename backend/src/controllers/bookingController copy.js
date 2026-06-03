const bookingService = require("../services/bookingService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { requireFields } = require("../utils/validators");

const createBooking = asyncHandler(async (req, res) => {
  requireFields(req.body, ["showtime_id", "seat_ids"]);
  const booking = await bookingService.createBooking({
    ...req.body,
    userId: req.user.id,
  });

  return successResponse(res, "Create booking successfully", booking, 201);
});

const getBookingHistory = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getBookingHistory(req.user.id);
  return successResponse(res, "Get booking history successfully", bookings);
});

const getBookingDetail = asyncHandler(async (req, res) => {
  const isAdmin = req.user.roles?.includes("ADMIN") || req.user.roles?.includes("EMPLOYEE");
  const booking = await bookingService.getBookingDetail(req.params.id, req.user.id, isAdmin);
  return successResponse(res, "Get booking detail successfully", booking);
});

module.exports = {
  createBooking,
  getBookingHistory,
  getBookingDetail,
};
