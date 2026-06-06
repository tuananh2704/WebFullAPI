const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const showtimeSelect = `
  SELECT
    s.id, s.movie_id, m.title AS movie_title, s.room_id, r.name AS room_name,
    r.room_type, r.total_seats AS room_total_seats, c.id AS cinema_id, c.name AS cinema_name,
    DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
    DATE_FORMAT(s.end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
    s.status,
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
      AND DATE(s.start_time) >= CURDATE()
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

const pad2 = (value) => String(value).padStart(2, "0");

const formatDateTimeForDb = (date) => {
  const value = date instanceof Date ? date : new Date(String(date || "").replace(" ", "T"));
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(
    value.getHours()
  )}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;
};

const normalizeDateTime = (value) => {
  if (value instanceof Date) return formatDateTimeForDb(value);
  return String(value || "").replace("T", " ").slice(0, 19);
};

const getDatePart = (dateTime) => normalizeDateTime(dateTime).slice(0, 10);

const TURNAROUND_MINUTES = 45;
const MIN_HOURS_BEFORE_SHOWTIME = 3;
const SHOWTIME_MIN_MESSAGE = "Suất chiếu phải bắt đầu sau thời điểm hiện tại ít nhất 3 tiếng.";

const SEAT_PRICE_BY_ROOM_TYPE = {
  "2D": { NORMAL: 75000, VIP: 110000, COUPLE: 190000 },
  "3D": { NORMAL: 90000, VIP: 130000, COUPLE: 220000 },
  IMAX: { NORMAL: 120000, VIP: 160000, COUPLE: 280000 },
  "4DX": { NORMAL: 130000, VIP: 170000, COUPLE: 300000 },
};

const toDate = (value) => new Date(String(value || "").replace(" ", "T"));

const getWeekNumber = (dateKey) => {
  const showDate = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(showDate.getTime())) {
    return 0;
  }

  const today = new Date();
  const currentWeekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
  currentWeekStart.setHours(0, 0, 0, 0);

  const diffMs = showDate.getTime() - currentWeekStart.getTime();
  return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
};

const validateShowtimePayload = async (
  { movie_id, room_id, start_time, end_time, status },
  showtimeId = null
) => {
  if (!movie_id || !room_id || !start_time || !end_time) {
    throw new AppError("Vui lòng chọn phim, phòng, giờ bắt đầu và giờ kết thúc", 400);
  }

  const startTime = normalizeDateTime(start_time);
  const endTime = normalizeDateTime(end_time);
  const startDate = toDate(startTime);
  const endDate = toDate(endTime);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new AppError("Thời gian suất chiếu không hợp lệ", 400);
  }

  if (!showtimeId) {
    const minStartDate = new Date();
    minStartDate.setHours(minStartDate.getHours() + MIN_HOURS_BEFORE_SHOWTIME);
    if (startDate.getTime() < minStartDate.getTime()) {
      throw new AppError(SHOWTIME_MIN_MESSAGE, 400);
    }
  }

  if (endDate <= startDate) {
    throw new AppError("Giờ kết thúc phải sau giờ bắt đầu", 400);
  }

  const [movieRows] = await pool.execute(
    `
    SELECT id, title, duration, release_date, status
    FROM movies
    WHERE id = ?
    LIMIT 1
    `,
    [movie_id]
  );

  const movie = movieRows[0];
  if (!movie) {
    throw new AppError("Movie not found", 404);
  }

  if (movie.status === "ENDED") {
    throw new AppError("Phim đã ngừng chiếu, không thể thêm suất chiếu mới", 400);
  }

  const showDate = getDatePart(startTime);
  const releaseDate = movie.release_date instanceof Date
    ? movie.release_date.toISOString().slice(0, 10)
    : String(movie.release_date || "").slice(0, 10);

  if (releaseDate && showDate < releaseDate) {
    throw new AppError(`Suất chiếu phải từ ngày phát hành phim (${releaseDate}) trở đi`, 400);
  }

  const duration = Number(movie.duration || 0);
  if (duration > 0) {
    const minimumEndDate = new Date(startDate.getTime() + duration * 60 * 1000);
    if (endDate < minimumEndDate) {
      throw new AppError(`Giờ kết thúc phải đủ thời lượng phim (${duration} phút)`, 400);
    }
  }

  const [roomRows] = await pool.execute(
    `
    SELECT r.id, r.name, r.room_type, r.status, c.name AS cinema_name
    FROM rooms r
    JOIN cinemas c ON c.id = r.cinema_id
    WHERE r.id = ?
    LIMIT 1
    `,
    [room_id]
  );

  const room = roomRows[0];
  if (!room) {
    throw new AppError("Room not found", 404);
  }

  if (room.status !== "ACTIVE") {
    throw new AppError("Phòng đang bảo trì, không thể thêm suất chiếu", 400);
  }

  const excludeSql = showtimeId ? "AND s.id <> ?" : "";
  const params = [
    room_id,
    startTime,
    endTime,
    ...(showtimeId ? [showtimeId] : []),
  ];

  const [conflicts] = await pool.execute(
    `
    SELECT s.id, m.title AS movie_title, s.start_time, s.end_time
    FROM showtimes s
    JOIN movies m ON m.id = s.movie_id
    WHERE s.room_id = ?
      AND s.status <> 'CANCELLED'
      AND DATE_ADD(s.end_time, INTERVAL ${TURNAROUND_MINUTES} MINUTE) > ?
      AND s.start_time < DATE_ADD(?, INTERVAL ${TURNAROUND_MINUTES} MINUTE)
      ${excludeSql}
    ORDER BY s.start_time ASC
    LIMIT 1
    `,
    params
  );

  if (conflicts[0]) {
    const conflictStart = new Date(conflicts[0].start_time).toLocaleString("vi-VN");
    const conflictEnd = new Date(conflicts[0].end_time).toLocaleString("vi-VN");
    throw new AppError(
      `Phòng ${room.name} đã có suất "${conflicts[0].movie_title}" từ ${conflictStart} đến ${conflictEnd}. Cần cách suất trước/sau ít nhất ${TURNAROUND_MINUTES} phút.`,
      409
    );
  }

  return {
    movie_id,
    room_id,
    room_type: room.room_type,
    start_time: startTime,
    end_time: endTime,
    status: status || "OPEN",
    showDate,
  };
};

const ensureShowtimeSeatPrices = async (showtimeId, roomType) => {
  const prices = SEAT_PRICE_BY_ROOM_TYPE[roomType] || SEAT_PRICE_BY_ROOM_TYPE["2D"];

  for (const [seatType, price] of Object.entries(prices)) {
    await pool.execute(
      `
      INSERT INTO showtime_seat_prices(showtime_id, seat_type, price)
      SELECT ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1
        FROM showtime_seat_prices
        WHERE showtime_id = ? AND seat_type = ?
      )
      `,
      [showtimeId, seatType, price, showtimeId, seatType]
    );
  }
};

const createShowtime = async ({ movie_id, room_id, start_time, end_time, status }) => {
  const validated = await validateShowtimePayload({
    movie_id,
    room_id,
    start_time,
    end_time,
    status,
  });
  const showDate = validated.showDate;
  const weekNumber = getWeekNumber(showDate);

  const [result] = await pool.execute(
    `
    INSERT INTO showtimes(movie_id, room_id, show_date, week_number, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      validated.movie_id,
      validated.room_id,
      showDate,
      weekNumber,
      validated.start_time,
      validated.end_time,
      validated.status,
    ]
  );

  await ensureShowtimeSeatPrices(result.insertId, validated.room_type);

  return getShowtimeById(result.insertId);
};

const updateShowtime = async (showtimeId, data) => {
  const existing = await getShowtimeById(showtimeId);
  const merged = {
    movie_id: data.movie_id || existing.movie_id,
    room_id: data.room_id || existing.room_id,
    start_time: data.start_time || existing.start_time,
    end_time: data.end_time || existing.end_time,
    status: data.status || existing.status,
  };
  const validated = await validateShowtimePayload(merged, showtimeId);
  const showDate = validated.showDate;
  const weekNumber = getWeekNumber(showDate);

  await pool.execute(
    `
    UPDATE showtimes
    SET movie_id = COALESCE(?, movie_id),
        room_id = COALESCE(?, room_id),
        show_date = COALESCE(?, show_date),
        week_number = COALESCE(?, week_number),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = COALESCE(?, status)
    WHERE id = ?
    `,
    [
      validated.movie_id,
      validated.room_id,
      showDate,
      weekNumber,
      validated.start_time,
      validated.end_time,
      validated.status,
      showtimeId,
    ]
  );

  await ensureShowtimeSeatPrices(showtimeId, validated.room_type);

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
  const where = ["r.cinema_id = ?", "s.status != 'CANCELLED'", "DATE(s.start_time) >= CURDATE()"];
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
      DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
      DATE_FORMAT(s.end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
      s.status,
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
  const where = [
    "s.movie_id = ?",
    "r.cinema_id = ?",
    "s.status != 'CANCELLED'",
    "DATE(s.start_time) >= CURDATE()",
  ];
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
      DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
      DATE_FORMAT(s.end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
      s.status,
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
