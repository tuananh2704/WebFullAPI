const pool = require("../configs/db");
const AppError = require("../utils/AppError");

/**
 * Lấy danh sách tất cả rạp, hỗ trợ filter ?city=&brand=
 */
const getAll = async ({ city, brand } = {}) => {
  const where = ["c.status = 'ACTIVE'"];
  const params = [];

  if (city) {
    where.push("c.city = ?");
    params.push(city);
  }

  if (brand) {
    where.push("c.brand = ?");
    params.push(brand);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [rows] = await pool.execute(
    `
    SELECT
      c.id, c.name, c.brand, c.city, c.address, c.phone, c.logo_url,
      c.latitude, c.longitude, c.status,
      (
        SELECT COUNT(*)
        FROM showtimes s
        JOIN rooms sr ON sr.id = s.room_id
        WHERE sr.cinema_id = c.id
          AND DATE(s.start_time) = CURDATE()
          AND s.status != 'CANCELLED'
      ) AS today_showtime_count,
      (
        SELECT COUNT(DISTINCT s.movie_id)
        FROM showtimes s
        JOIN rooms sr ON sr.id = s.room_id
        WHERE sr.cinema_id = c.id
          AND DATE(s.start_time) >= CURDATE()
          AND s.status != 'CANCELLED'
      ) AS showing_movie_count,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', r.id,
          'name', r.name,
          'room_type', r.room_type,
          'total_seats', r.total_seats,
          'status', r.status
        )
      ) AS rooms
    FROM cinemas c
    LEFT JOIN rooms r ON r.cinema_id = c.id
    ${whereSql}
    GROUP BY c.id
    ORDER BY c.brand, c.city, c.name
    `,
    params
  );

  return rows.map((row) => ({
    ...row,
    rooms: typeof row.rooms === "string" ? JSON.parse(row.rooms).filter(Boolean) : (row.rooms || []),
  }));
};

/**
 * Lấy chi tiết 1 rạp kèm danh sách rooms (JOIN rooms ON cinema_id)
 */
const getById = async (cinemaId) => {
  const [cinemaRows] = await pool.execute(
    `SELECT id, name, brand, city, address, phone, logo_url, latitude, longitude, status FROM cinemas WHERE id = ? LIMIT 1`,
    [cinemaId]
  );

  if (!cinemaRows[0]) {
    throw new AppError("Cinema not found", 404);
  }

  const [roomRows] = await pool.execute(
    `
    SELECT id, cinema_id, name, room_type, total_seats, status
    FROM rooms
    WHERE cinema_id = ?
    ORDER BY room_type, name
    `,
    [cinemaId]
  );

  return {
    ...cinemaRows[0],
    rooms: roomRows,
  };
};

/**
 * Lấy các phòng của 1 rạp kèm status
 */
const getRoomsByCinema = async (cinemaId) => {
  // Verify cinema exists
  const [check] = await pool.execute(
    "SELECT id FROM cinemas WHERE id = ? LIMIT 1",
    [cinemaId]
  );
  if (!check[0]) {
    throw new AppError("Cinema not found", 404);
  }

  const [rows] = await pool.execute(
    `
    SELECT id, cinema_id, name, room_type, total_seats, status
    FROM rooms
    WHERE cinema_id = ?
    ORDER BY room_type, name
    `,
    [cinemaId]
  );

  return rows;
};

module.exports = {
  getAll,
  getById,
  getRoomsByCinema,
};
