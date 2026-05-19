const membershipService = require("../services/membershipService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getMembership = asyncHandler(async (req, res) => {
  const membership = await membershipService.getMembership(req.user.id);
  return successResponse(res, "Get membership successfully", membership);
});

const getAllTiers = asyncHandler(async (req, res) => {
  const tiers = await membershipService.getAllTiers();
  return successResponse(res, "Get all tiers successfully", tiers);
});

const getTierHistory = asyncHandler(async (req, res) => {
  const history = await membershipService.getTierHistory(req.user.id);
  return successResponse(res, "Get tier history successfully", history);
});

const getBenefitUsage = asyncHandler(async (req, res) => {
  const usage = await membershipService.getBenefitUsage(req.user.id);
  return successResponse(res, "Get benefit usage successfully", usage);
});

module.exports = {
  getMembership,
  getAllTiers,
  getTierHistory,
  getBenefitUsage,
};
