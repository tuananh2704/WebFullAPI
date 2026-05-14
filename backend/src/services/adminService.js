const pool = require("../configs/db");

const getDashboardStatistics = async () => {
  const [[movieStats]] = await pool.execute("SELECT COUNT(*) AS total_movies FROM movies");
  const [[bookingStats]] = await pool.execute("SELECT COUNT(*) AS total_bookings FROM bookings");
  const [[userStats]] = await pool.execute("SELECT COUNT(*) AS total_users FROM users");
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

  return {
    total_movies: movieStats.total_movies,
    total_bookings: bookingStats.total_bookings,
    total_users: userStats.total_users,
    total_revenue: revenueStats.total_revenue,
    top_movies: topMovies,
  };
};

module.exports = {
  getDashboardStatistics,
};
