const adminService = require("../services/adminService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getDashboardStatistics = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStatistics();
  return successResponse(res, "Get dashboard statistics successfully", stats);
});

module.exports = {
  getDashboardStatistics,
};
