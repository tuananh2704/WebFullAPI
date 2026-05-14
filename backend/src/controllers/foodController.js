const foodService = require("../services/foodService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getFoods = asyncHandler(async (req, res) => {
  const foods = await foodService.getFoods();
  return successResponse(res, "Get foods successfully", foods);
});

const getFoodSizes = asyncHandler(async (req, res) => {
  const sizes = await foodService.getFoodSizes(req.query.food_id);
  return successResponse(res, "Get food sizes successfully", sizes);
});

module.exports = {
  getFoods,
  getFoodSizes,
};
