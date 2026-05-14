const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const showtimeSelect = `
  SELECT
    s.id, s.movie_id, m.title AS movie_title, s.room_id, r.name AS room_name,
    r.room_type, c.name AS cinema_name, s.start_time, s.end_time, s.status
  FROM showtimes s
  JOIN movies m ON m.id = s.movie_id
  JOIN rooms r ON r.id = s.room_id
  JOIN cinemas c ON c.id = r.cinema_id
`;

const getShowtimesByMovie = async (movieId) => {
  const [rows] = await pool.execute(
    `
    ${showtimeSelect}
    WHERE s.movie_id = ?
    ORDER BY s.start_time ASC
    `,
    [movieId]
  );

  return rows;
};

const getShowtimes = async ({ movie_id, status }) => {
  const where = [];
  const params = [];

  if (movie_id) {
    where.push("s.movie_id = ?");
    params.push(movie_id);
  }

  if (status) {
    where.push("s.status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `
    ${showtimeSelect}
    ${whereSql}
    ORDER BY s.start_time ASC
    `,
    params
  );

  return rows;
};

const getShowtimeById = async (showtimeId) => {
  const [rows] = await pool.execute(`${showtimeSelect} WHERE s.id = ? LIMIT 1`, [showtimeId]);
  if (!rows[0]) {
    throw new AppError("Showtime not found", 404);
  }
  return rows[0];
};

const createShowtime = async ({ movie_id, room_id, start_time, end_time, status }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO showtimes(movie_id, room_id, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?)
    `,
    [movie_id, room_id, start_time, end_time, status || "OPEN"]
  );

  return getShowtimeById(result.insertId);
};

const updateShowtime = async (showtimeId, data) => {
  await getShowtimeById(showtimeId);
  await pool.execute(
    `
    UPDATE showtimes
    SET movie_id = COALESCE(?, movie_id),
        room_id = COALESCE(?, room_id),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = COALESCE(?, status)
    WHERE id = ?
    `,
    [
      data.movie_id || null,
      data.room_id || null,
      data.start_time || null,
      data.end_time || null,
      data.status || null,
      showtimeId,
    ]
  );

  return getShowtimeById(showtimeId);
};

const deleteShowtime = async (showtimeId) => {
  await getShowtimeById(showtimeId);
  await pool.execute("DELETE FROM showtimes WHERE id = ?", [showtimeId]);
};

module.exports = {
  getShowtimes,
  getShowtimesByMovie,
  getShowtimeById,
  createShowtime,
  updateShowtime,
  deleteShowtime,
};
