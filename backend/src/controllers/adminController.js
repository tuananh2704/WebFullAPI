const adminService = require("../services/adminService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getDashboardStatistics = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStatistics();
  return successResponse(res, "Get dashboard statistics successfully", stats);
});

const getAdminBookings = asyncHandler(async (req, res) => {
  const { search, status, date_from, date_to, page, limit } = req.query;
  const bookings = await adminService.getAdminBookings({
    search,
    status,
    date_from,
    date_to,
    page,
    limit,
  });
  return successResponse(res, "Get admin bookings successfully", bookings);
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await adminService.updateBookingStatus(req.params.id, req.body.status);
  return successResponse(res, "Update booking status successfully", booking);
});

const approvePendingBookings = asyncHandler(async (req, res) => {
  const result = await adminService.approvePendingBookings(req.body || {});
  return successResponse(res, "Approve pending bookings successfully", result);
});

const getUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const users = await adminService.getUsers({ role, search });
  return successResponse(res, "Get users successfully", users);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const result = await adminService.updateUserRole(req.params.id, role);
  return successResponse(res, "Update user role successfully", result);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const result = await adminService.updateUserStatus(req.params.id, status);
  return successResponse(res, "Update user status successfully", result);
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await adminService.deleteUser(req.params.id);
  return successResponse(res, "Delete user successfully", result);
});

const getUserDetail = asyncHandler(async (req, res) => {
  const user = await adminService.getUserDetail(req.params.id);
  if (!user) {
    const AppError = require("../utils/AppError");
    throw new AppError("User not found", 404);
  }
  return successResponse(res, "Get user detail successfully", user);
});

const createUserVoucher = asyncHandler(async (req, res) => {
  const voucher = await adminService.createUserVoucher(req.params.id, req.body || {});
  return successResponse(res, "Create user voucher successfully", voucher, 201);
});

const createBulkUserVoucher = asyncHandler(async (req, res) => {
  const voucher = await adminService.createBulkUserVoucher(req.body || {});
  return successResponse(res, "Create bulk user voucher successfully", voucher, 201);
});

const getAdminFoods = asyncHandler(async (req, res) => {
  const foods = await adminService.getAdminFoods();
  return successResponse(res, "Get foods successfully", foods);
});

const createAdminFood = asyncHandler(async (req, res) => {
  const { name, description, image_url, category_id } = req.body;
  const food = await adminService.createAdminFood({
    name,
    description,
    image_url,
    category_id,
  });
  return successResponse(res, "Create food successfully", food);
});

const updateAdminFood = asyncHandler(async (req, res) => {
  const { name, description, image_url, category_id } = req.body;
  const food = await adminService.updateAdminFood(req.params.id, {
    name,
    description,
    image_url,
    category_id,
  });
  return successResponse(res, "Update food successfully", food);
});

const deleteAdminFood = asyncHandler(async (req, res) => {
  const result = await adminService.deleteAdminFood(req.params.id);
  return successResponse(res, "Delete food successfully", result);
});

const createAdminFoodSize = asyncHandler(async (req, res) => {
  const size = await adminService.createAdminFoodSize({
    food_id: req.params.id,
    size_name: req.body.size_name,
    price: req.body.price,
  });
  return successResponse(res, "Create food size successfully", size);
});

const updateAdminFoodSize = asyncHandler(async (req, res) => {
  const size = await adminService.updateAdminFoodSize(req.params.id, {
    size_name: req.body.size_name,
    price: req.body.price,
  });
  return successResponse(res, "Update food size successfully", size);
});

const deleteAdminFoodSize = asyncHandler(async (req, res) => {
  const result = await adminService.deleteAdminFoodSize(req.params.id);
  return successResponse(res, "Delete food size successfully", result);
});

const exportBookings = asyncHandler(async (req, res) => {
  const { status, date_from, date_to } = req.query;
  const data = await adminService.exportBookings({
    status,
    date_from,
    date_to,
  });

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="bookings_${dateStr}.csv"`);
  res.send(data);
});

const exportRevenue = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const safeYear = year || new Date().getFullYear();
  const data = await adminService.exportRevenue(safeYear);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="revenue-report-${safeYear}.csv"`
  );
  res.send(data);
});

module.exports = {
  getDashboardStatistics,
  getAdminBookings,
  updateBookingStatus,
  approvePendingBookings,
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getUserDetail,
  createUserVoucher,
  createBulkUserVoucher,
  getAdminFoods,
  createAdminFood,
  updateAdminFood,
  deleteAdminFood,
  createAdminFoodSize,
  updateAdminFoodSize,
  deleteAdminFoodSize,
  exportBookings,
  exportRevenue,
};
