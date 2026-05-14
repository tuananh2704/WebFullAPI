const paymentService = require("../services/paymentService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { requireFields } = require("../utils/validators");

const createPayment = asyncHandler(async (req, res) => {
  requireFields(req.body, ["booking_id", "payment_method"]);
  const payment = await paymentService.createPayment(req.body);
  return successResponse(res, "Create payment successfully", payment, 201);
});

module.exports = {
  createPayment,
};
