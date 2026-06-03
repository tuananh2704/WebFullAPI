const authService = require("../services/authService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { requireFields } = require("../utils/validators");

const register = asyncHandler(async (req, res) => {
  requireFields(req.body, ["full_name", "email", "birth_date", "password"]);
  const data = await authService.register(req.body);
  return successResponse(res, "OTP created successfully", data, 201);
});

const verifyRegister = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email", "verification_code"]);
  const data = await authService.verifyRegister(req.body);
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

const requestPasswordChange = asyncHandler(async (req, res) => {
  requireFields(req.body, ["new_password"]);
  const data = await authService.requestPasswordChange({
    userId: req.user.id,
    new_password: req.body.new_password,
  });
  return successResponse(res, "Password change OTP sent successfully", data);
});

const verifyPasswordChange = asyncHandler(async (req, res) => {
  requireFields(req.body, ["verification_code"]);
  const data = await authService.verifyPasswordChange({
    userId: req.user.id,
    verification_code: req.body.verification_code,
  });
  return successResponse(res, "Password changed successfully", data);
});

const requestForgotPassword = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email"]);
  const data = await authService.requestForgotPassword(req.body);
  return successResponse(res, "Forgot password OTP sent successfully", data);
});

const verifyForgotPasswordCode = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email", "verification_code"]);
  const data = await authService.verifyForgotPasswordCode(req.body);
  return successResponse(res, "Forgot password OTP verified successfully", data);
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  requireFields(req.body, ["email", "verification_code", "new_password"]);
  const data = await authService.resetForgotPassword(req.body);
  return successResponse(res, "Password reset successfully", data);
});

module.exports = {
  register,
  verifyRegister,
  login,
  profile,
  requestPasswordChange,
  verifyPasswordChange,
  requestForgotPassword,
  verifyForgotPasswordCode,
  resetForgotPassword,
};
