const adminService = require("../services/adminService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getDashboardStatistics = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStatistics();
  return successResponse(res, "Get dashboard statistics successfully", stats);
});

const getAdminBookings = asyncHandler(async (req, res) => {
  const bookings = await adminService.getAdminBookings();
  return successResponse(res, "Get admin bookings successfully", bookings);
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await adminService.updateBookingStatus(req.params.id, req.body.status);
  return successResponse(res, "Update booking status successfully", booking);
});

module.exports = {
  getDashboardStatistics,
  getAdminBookings,
  updateBookingStatus,
};
