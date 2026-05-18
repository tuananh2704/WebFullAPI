const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/verify-register", authController.verifyRegister);
router.post("/login", authController.login);
router.get("/profile", authMiddleware, authController.profile);
router.post("/password-change/request", authMiddleware, authController.requestPasswordChange);
router.post("/password-change/verify", authMiddleware, authController.verifyPasswordChange);

module.exports = router;
