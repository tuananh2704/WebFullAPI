const express = require("express");
const foodController = require("../controllers/foodController");

const router = express.Router();

router.get("/", foodController.getFoods);
router.get("/sizes", foodController.getFoodSizes);

module.exports = router;
