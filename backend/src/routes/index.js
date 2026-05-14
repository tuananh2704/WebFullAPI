const express = require("express");
const authRoutes = require("./authRoutes");
const movieRoutes = require("./movieRoutes");
const showtimeRoutes = require("./showtimeRoutes");
const seatRoutes = require("./seatRoutes");
const bookingRoutes = require("./bookingRoutes");
const paymentRoutes = require("./paymentRoutes");
const foodRoutes = require("./foodRoutes");
const promotionRoutes = require("./promotionRoutes");
const adminRoutes = require("./adminRoutes");
const { successResponse } = require("../utils/apiResponse");

const router = express.Router();

router.get("/", (req, res) => {
  return successResponse(res, "Cinema Booking API is running", {
    docs: "/api/docs",
  });
});

router.get("/docs", (req, res) => {
  return successResponse(res, "Sample API endpoints", {
    auth: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/profile",
    ],
    movies: [
      "GET /api/movies?page=1&limit=10",
      "GET /api/movies/search?search=avengers",
      "GET /api/movies?genre=Action",
      "GET /api/movies/:id",
    ],
    showtimes: ["GET /api/showtimes/movie/:movieId"],
    seats: ["GET /api/seats/showtime/:showtimeId", "GET /api/seats/room/:roomId"],
    bookings: [
      "POST /api/bookings",
      "GET /api/bookings/history",
      "GET /api/bookings/:id",
    ],
    payments: ["POST /api/payments"],
    foods: ["GET /api/foods", "GET /api/foods/sizes?food_id=1"],
    promotions: ["POST /api/promotions/apply"],
    admin: [
      "GET /api/admin/dashboard",
      "POST /api/admin/movies",
      "GET /api/admin/movies",
      "GET /api/admin/movies/:id",
      "PUT /api/admin/movies/:id",
      "DELETE /api/admin/movies/:id",
      "GET /api/admin/showtimes",
      "POST /api/admin/showtimes",
      "PUT /api/admin/showtimes/:id",
      "DELETE /api/admin/showtimes/:id",
    ],
  });
});

router.use("/auth", authRoutes);
router.use("/movies", movieRoutes);
router.use("/showtimes", showtimeRoutes);
router.use("/seats", seatRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/foods", foodRoutes);
router.use("/promotions", promotionRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
