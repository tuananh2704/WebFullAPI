const authService = require("../services/authService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { requireFields } = require("../utils/validators");

const register = asyncHandler(async (req, res) => {
  requireFields(req.body, ["full_name", "email", "password"]);
  const data = await authService.register(req.body);
  return successResponse(res, "Register successfully", data, 201);
});

const login = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email", "password"]);
  const data = await authService.login(req.body);
  return successResponse(res, "Login successfully", data);
});

const profile = asyncHandler(async (req, res) => {
  const user = await authService.findUserById(req.user.id);
  return successResponse(res, "Get profile successfully", user);
});

module.exports = {
  register,
  login,
  profile,
};
