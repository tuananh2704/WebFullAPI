const express = require("express");
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", notificationController.getUserNotifications);
router.patch("/:id/read", notificationController.markNotificationRead);
router.patch("/read-all", notificationController.markAllNotificationsRead);

module.exports = router;
