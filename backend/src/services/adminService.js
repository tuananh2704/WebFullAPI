const pool = require("../configs/db");

const getDashboardStatistics = async () => {
  const [[movieStats]] = await pool.execute("SELECT COUNT(*) AS total_movies FROM movies");
  const [[bookingStats]] = await pool.execute("SELECT COUNT(*) AS total_bookings FROM bookings");
  const [[userStats]] = await pool.execute("SELECT COUNT(*) AS total_users FROM users");
  const [[pendingBookingStats]] = await pool.execute(
    "SELECT COUNT(*) AS pending_bookings FROM bookings WHERE booking_status = 'PENDING'"
  );
  const [[revenueStats]] = await pool.execute(
    `
    SELECT COALESCE(SUM(amount), 0) AS total_revenue
    FROM payments
    WHERE payment_status = 'SUCCESS'
    `
  );
  const [topMovies] = await pool.execute(
    `
    SELECT m.id, m.title, COUNT(b.id) AS total_bookings
    FROM movies m
    LEFT JOIN showtimes s ON s.movie_id = m.id
    LEFT JOIN bookings b ON b.showtime_id = s.id
    GROUP BY m.id
    ORDER BY total_bookings DESC
    LIMIT 5
    `
  );
  const [bookingStatus] = await pool.execute(
    `
    SELECT booking_status AS status, COUNT(*) AS total
    FROM bookings
    GROUP BY booking_status
    ORDER BY booking_status
    `
  );
  const [monthlyRevenue] = await pool.execute(
    `
    SELECT DATE_FORMAT(s.start_time, '%Y-%m') AS month, COALESCE(SUM(p.amount), 0) AS revenue
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN showtimes s ON s.id = b.showtime_id
    WHERE p.payment_status = 'SUCCESS'
    GROUP BY DATE_FORMAT(s.start_time, '%Y-%m')
    ORDER BY month DESC
    LIMIT 6
    `
  );

  return {
    total_movies: movieStats.total_movies,
    total_bookings: bookingStats.total_bookings,
    pending_bookings: pendingBookingStats.pending_bookings,
    total_users: userStats.total_users,
    total_revenue: revenueStats.total_revenue,
    top_movies: topMovies,
    booking_status: bookingStatus,
    monthly_revenue: monthlyRevenue.reverse(),
  };
};

const getAdminBookings = async () => {
  const [rows] = await pool.execute(
    `
    SELECT
      b.id, b.booking_code, b.total_amount, b.booking_status,
      b.showtime_id, s.start_time, m.title AS movie_title,
      u.full_name AS customer_name, u.email AS customer_email,
      COALESCE(p.payment_method, 'CASH') AS payment_method,
      COALESCE(p.payment_status, 'PENDING') AS payment_status
    FROM bookings b
    JOIN showtimes s ON s.id = b.showtime_id
    JOIN movies m ON m.id = s.movie_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN payments p ON p.booking_id = b.id
    ORDER BY b.id DESC
    LIMIT 50
    `
  );

  return rows;
};

const updateBookingStatus = async (bookingId, status) => {
  const allowedStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
  if (!allowedStatuses.includes(status)) {
    const AppError = require("../utils/AppError");
    throw new AppError("Invalid booking status", 400);
  }

  await pool.execute("UPDATE bookings SET booking_status = ? WHERE id = ?", [status, bookingId]);
  const [rows] = await pool.execute("SELECT * FROM bookings WHERE id = ? LIMIT 1", [bookingId]);
  return rows[0];
};

module.exports = {
  getDashboardStatistics,
  getAdminBookings,
  updateBookingStatus,
};
