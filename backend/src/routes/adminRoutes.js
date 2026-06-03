const express = require("express");
const adminController = require("../controllers/adminController");
const movieController = require("../controllers/movieController");
const showtimeController = require("../controllers/showtimeController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "EMPLOYEE"));

router.get("/dashboard", adminController.getDashboardStatistics);
router.get("/bookings", adminController.getAdminBookings);
router.patch("/bookings/:id/status", adminController.updateBookingStatus);

router.get("/export/bookings", adminController.exportBookings);
router.get("/export/revenue", adminController.exportRevenue);

router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserDetail);
router.patch("/users/:id/role", adminController.updateUserRole);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.delete("/users/:id", adminController.deleteUser);

router.get("/movies", movieController.getMovies);
router.get("/movies/:id", movieController.getMovieDetail);
router.post("/movies", roleMiddleware("ADMIN"), movieController.createMovie);
router.put("/movies/:id", roleMiddleware("ADMIN"), movieController.updateMovie);
router.delete("/movies/:id", roleMiddleware("ADMIN"), movieController.deleteMovie);

router.get("/showtimes", showtimeController.getShowtimes);
router.post("/showtimes", showtimeController.createShowtime);
router.put("/showtimes/:id", showtimeController.updateShowtime);
router.delete("/showtimes/:id", roleMiddleware("ADMIN"), showtimeController.deleteShowtime);

router.get("/foods", adminController.getAdminFoods);
router.post("/foods", roleMiddleware("ADMIN"), adminController.createAdminFood);
router.put("/foods/:id", roleMiddleware("ADMIN"), adminController.updateAdminFood);
router.delete("/foods/:id", roleMiddleware("ADMIN"), adminController.deleteAdminFood);
router.post("/foods/:id/sizes", roleMiddleware("ADMIN"), adminController.createAdminFoodSize);
router.put("/food-sizes/:id", roleMiddleware("ADMIN"), adminController.updateAdminFoodSize);
router.delete("/food-sizes/:id", roleMiddleware("ADMIN"), adminController.deleteAdminFoodSize);

module.exports = router;
