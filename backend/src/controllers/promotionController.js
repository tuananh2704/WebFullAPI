const promotionService = require("../services/promotionService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { requireFields } = require("../utils/validators");

const applyPromotionCode = asyncHandler(async (req, res) => {
  requireFields(req.body, ["code", "total_amount"]);
  const promotion = await promotionService.applyPromotionCode(req.body);
  return successResponse(res, "Apply promotion successfully", promotion);
});

module.exports = {
  applyPromotionCode,
};
