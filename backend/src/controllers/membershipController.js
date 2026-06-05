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

const getUserVouchers = asyncHandler(async (req, res) => {
  const vouchers = await membershipService.getUserVouchers(req.user.id);
  return successResponse(res, "Get user vouchers successfully", vouchers);
});

const exchangePointsForVoucher = asyncHandler(async (req, res) => {
  const voucher = await membershipService.exchangePointsForVoucher(
    req.user.id,
    req.body.discount_amount
  );
  return successResponse(res, "Exchange points for voucher successfully", voucher, 201);
});

module.exports = {
  getMembership,
  getAllTiers,
  getTierHistory,
  getBenefitUsage,
  getUserVouchers,
  exchangePointsForVoucher,
};
