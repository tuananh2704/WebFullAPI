const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const showtimeSelect = `
  SELECT
    s.id, s.movie_id, m.title AS movie_title, s.room_id, r.name AS room_name,
    r.room_type, c.id AS cinema_id, c.name AS cinema_name,
    s.start_time, s.end_time, s.status,
    DATE_FORMAT(s.start_time, '%Y-%m-%d') AS show_date
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

/**
 * Helper: tao label "T2 - 20/05" tu YYYY-MM-DD
 */
const formatDayLabel = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00+07:00");
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dayName = dayNames[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dayName} - ${dd}/${mm}`;
};

/**
 * Group rows theo ngay
 */
const groupByDate = (rows) => {
  const grouped = {};
  for (const row of rows) {
    const dateKey = row.show_date instanceof Date
      ? row.show_date.toISOString().slice(0, 10)
      : String(row.show_date);

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        day_label: formatDayLabel(dateKey),
        showtimes: [],
      };
    }
    grouped[dateKey].showtimes.push(row);
  }
  return Object.values(grouped);
};

/**
 * Lay tat ca suat chieu cua 1 rap, filter theo movie_id / date / week.
 * Ket qua GROUP BY ngay de frontend hien thi theo tab ngay.
 */
const getShowtimesByCinema = async (cinemaId, { movie_id, date, week } = {}) => {
  const where = ["r.cinema_id = ?", "s.status != 'CANCELLED'"];
  const params = [cinemaId];

  if (movie_id) {
    where.push("s.movie_id = ?");
    params.push(movie_id);
  }

  if (date) {
    where.push("DATE(s.start_time) = ?");
    params.push(date);
  } else if (week !== undefined && week !== null && week !== "") {
    where.push("YEARWEEK(s.start_time, 1) = YEARWEEK(DATE_ADD(NOW(), INTERVAL ? WEEK), 1)");
    params.push(Number(week));
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [rows] = await pool.execute(
    `
    SELECT
      s.id, s.movie_id, m.title AS movie_title,
      s.room_id, r.name AS room_name, r.room_type,
      c.id AS cinema_id, c.name AS cinema_name,
      s.start_time, s.end_time, s.status,
      DATE_FORMAT(s.start_time, '%Y-%m-%d') AS show_date
    FROM showtimes s
    JOIN movies m ON m.id = s.movie_id
    JOIN rooms r ON r.id = s.room_id
    JOIN cinemas c ON c.id = r.cinema_id
    ${whereSql}
    ORDER BY s.start_time ASC
    `,
    params
  );

  return groupByDate(rows);
};

/**
 * Dung cho flow: chon phim -> chon rap -> xem suat theo ngay
 */
const getShowtimesByMovieAndCinema = async (movieId, cinemaId, { date } = {}) => {
  const where = ["s.movie_id = ?", "r.cinema_id = ?", "s.status != 'CANCELLED'"];
  const params = [movieId, cinemaId];

  if (date) {
    where.push("DATE(s.start_time) = ?");
    params.push(date);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [rows] = await pool.execute(
    `
    SELECT
      s.id, s.movie_id, m.title AS movie_title,
      s.room_id, r.name AS room_name, r.room_type,
      c.id AS cinema_id, c.name AS cinema_name,
      s.start_time, s.end_time, s.status,
      DATE_FORMAT(s.start_time, '%Y-%m-%d') AS show_date
    FROM showtimes s
    JOIN movies m ON m.id = s.movie_id
    JOIN rooms r ON r.id = s.room_id
    JOIN cinemas c ON c.id = r.cinema_id
    ${whereSql}
    ORDER BY s.start_time ASC
    `,
    params
  );

  return groupByDate(rows);
};

module.exports = {
  getShowtimes,
  getShowtimesByMovie,
  getShowtimeById,
  createShowtime,
  updateShowtime,
  deleteShowtime,
  getShowtimesByCinema,
  getShowtimesByMovieAndCinema,
};
