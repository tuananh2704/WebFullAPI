const notificationService = require("../services/notificationService");
const { successResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getUserNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getUserNotifications(req.user.id);
  return successResponse(res, "Get notifications successfully", notifications);
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markNotificationRead(req.user.id, req.params.id);
  return successResponse(res, "Mark notification read successfully", result);
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user.id);
  return successResponse(res, "Mark all notifications read successfully", result);
});

module.exports = {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
