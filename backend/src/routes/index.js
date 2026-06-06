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
const cinemaRoutes = require("./cinemaRoutes");
const membershipRoutes = require("./membershipRoutes");
const notificationRoutes = require("./notificationRoutes");
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
      "POST /api/auth/verify-register",
      "POST /api/auth/login",
      "GET /api/auth/profile",
    ],
    movies: [
      "GET /api/movies?page=1&limit=10",
      "GET /api/movies?search=avengers&genre=Action&status=NOW_SHOWING",
      "GET /api/movies?director=nolan&language=English",
      "GET /api/movies?duration_min=90&duration_max=180",
      "GET /api/movies?rating_min=8&release_from=2023-01-01&release_to=2024-12-31",
      "GET /api/movies?sort=rating_desc",
      "GET /api/movies/:id",
    ],
    cinemas: [
      "GET /api/cinemas",
      "GET /api/cinemas?city=Ha Noi&brand=CGV",
      "GET /api/cinemas/:id",
      "GET /api/cinemas/:id/rooms",
      "GET /api/cinemas/:id/showtimes",
      "GET /api/cinemas/:id/showtimes?movie_id=1&date=2026-05-20",
      "GET /api/cinemas/:id/showtimes?week=0",
    ],
    showtimes: [
      "GET /api/showtimes/movie/:movieId",
      "GET /api/showtimes?movie_id=1&status=OPEN",
    ],
    seats: ["GET /api/seats/showtime/:showtimeId", "GET /api/seats/room/:roomId"],
    bookings: [
      "POST /api/bookings",
      "GET /api/bookings/history",
      "GET /api/bookings/:id",
    ],
    payments: ["POST /api/payments"],
    foods: ["GET /api/foods", "GET /api/foods/sizes?food_id=1"],
    promotions: ["POST /api/promotions/apply"],
    membership: [
      "GET /api/membership/tiers",
      "GET /api/membership/me",
      "GET /api/membership/history",
      "GET /api/membership/benefits/usage",
    ],
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
      "GET /api/admin/foods",
      "POST /api/admin/foods",
      "PUT /api/admin/foods/:id",
      "DELETE /api/admin/foods/:id",
      "POST /api/admin/foods/:id/sizes",
      "PUT /api/admin/food-sizes/:id",
      "DELETE /api/admin/food-sizes/:id",
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
router.use("/cinemas", cinemaRoutes);
router.use("/membership", membershipRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
