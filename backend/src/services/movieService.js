const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const movieSelect = `
  SELECT
    m.id, m.title, m.description, m.director, m.duration,
    DATE_FORMAT(m.release_date, '%Y-%m-%d') AS release_date,
    m.poster_url,
    m.trailer_url, m.language, m.age_rating, m.rating, m.total_ratings, m.status,
    (
      SELECT COUNT(*)
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      WHERE s.movie_id = m.id
    ) AS booking_count,
    COALESCE(JSON_ARRAYAGG(g.name), JSON_ARRAY()) AS genres
  FROM movies m
  LEFT JOIN movie_genres mg ON mg.movie_id = m.id
  LEFT JOIN genres g ON g.id = mg.genre_id
`;

const normalizeMovie = (movie) => ({
  ...movie,
  genres: typeof movie.genres === "string" ? JSON.parse(movie.genres).filter(Boolean) : movie.genres,
});

const VALID_SORT = {
  rating_desc: "CAST(COALESCE(m.rating, 0) AS DECIMAL(4,1)) DESC, m.id DESC",
  release_desc: "m.release_date DESC, m.id DESC",
  title_asc: "m.title ASC",
};

const getMovies = async ({
  page,
  limit,
  search,
  genre,
  status,
  director,
  language,
  duration_min,
  duration_max,
  rating_min,
  release_from,
  release_to,
  sort,
}) => {
  const safeLimit = Number(limit);
  const offset = (Number(page) - 1) * safeLimit;
  const where = [];
  const params = [];

  if (search) {
    where.push("(m.title LIKE ? OR m.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (genre) {
    where.push(
      "m.id IN (SELECT movie_id FROM movie_genres mg2 JOIN genres g2 ON g2.id = mg2.genre_id WHERE g2.name = ?)"
    );
    params.push(genre);
  }

  if (status) {
    where.push("m.status = ?");
    params.push(status);
  }

  if (director) {
    where.push("m.director LIKE ?");
    params.push(`%${director}%`);
  }

  if (language) {
    where.push("m.language = ?");
    params.push(language);
  }

  if (duration_min) {
    where.push("m.duration >= ?");
    params.push(Number(duration_min));
  }

  if (duration_max) {
    where.push("m.duration <= ?");
    params.push(Number(duration_max));
  }

  if (rating_min) {
    where.push("m.rating >= ?");
    params.push(Number(rating_min));
  }

  if (release_from) {
    where.push("m.release_date >= ?");
    params.push(release_from);
  }

  if (release_to) {
    where.push("m.release_date <= ?");
    params.push(release_to);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = VALID_SORT[sort] || "m.release_date DESC, m.id DESC";

  const [countRows] = await pool.execute(
    `
    SELECT COUNT(DISTINCT m.id) AS total
    FROM movies m
    LEFT JOIN movie_genres mg ON mg.movie_id = m.id
    LEFT JOIN genres g ON g.id = mg.genre_id
    ${whereSql}
    `,
    params
  );

  const [rows] = await pool.execute(
    `
    ${movieSelect}
    ${whereSql}
    GROUP BY m.id
    ORDER BY ${orderSql}
    LIMIT ${safeLimit} OFFSET ${offset}
    `,
    params
  );

  return {
    items: rows.map(normalizeMovie),
    pagination: {
      page,
      limit: safeLimit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / safeLimit),
    },
  };
};

const getMovieById = async (movieId) => {
  const [rows] = await pool.execute(
    `
    ${movieSelect}
    WHERE m.id = ?
    GROUP BY m.id
    `,
    [movieId]
  );

  if (!rows[0]) {
    throw new AppError("Movie not found", 404);
  }

  return normalizeMovie(rows[0]);
};

const createMovie = async (movie) => {
  const [result] = await pool.execute(
    `
    INSERT INTO movies(title, description, director, duration, release_date, poster_url, trailer_url, language, age_rating, rating, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      movie.title,
      movie.description || null,
      movie.director || null,
      movie.duration || null,
      movie.release_date || null,
      movie.poster_url || null,
      movie.trailer_url || null,
      movie.language || null,
      movie.age_rating || "T13",
      movie.rating || null,
      movie.status || "NOW_SHOWING",
    ]
  );

  return getMovieById(result.insertId);
};

const updateMovie = async (movieId, movie) => {
  await getMovieById(movieId);

  await pool.execute(
    `
    UPDATE movies
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        director = COALESCE(?, director),
        duration = COALESCE(?, duration),
        release_date = COALESCE(?, release_date),
        poster_url = COALESCE(?, poster_url),
        trailer_url = COALESCE(?, trailer_url),
        language = COALESCE(?, language),
        age_rating = COALESCE(?, age_rating),
        rating = COALESCE(?, rating),
        status = COALESCE(?, status)
    WHERE id = ?
    `,
    [
      movie.title || null,
      movie.description || null,
      movie.director || null,
      movie.duration || null,
      movie.release_date || null,
      movie.poster_url || null,
      movie.trailer_url || null,
      movie.language || null,
      movie.age_rating || null,
      movie.rating || null,
      movie.status || null,
      movieId,
    ]
  );

  return getMovieById(movieId);
};

const deleteMovie = async (movieId) => {
  await getMovieById(movieId);
  await pool.execute("DELETE FROM movies WHERE id = ?", [movieId]);
};

const getTrailerMovies = async () => {
  const [rows] = await pool.execute(
    `
    SELECT
      m.id,
      m.title,
      m.trailer_url,
      m.poster_url,
      COALESCE(MIN(g.name), 'Cinema') AS genre,
      DATE_FORMAT(m.release_date, '%Y-%m-%d') AS release_date
    FROM movies m
    LEFT JOIN movie_genres mg ON mg.movie_id = m.id
    LEFT JOIN genres g ON g.id = mg.genre_id
    WHERE m.status = 'NOW_SHOWING'
      AND m.trailer_url IS NOT NULL
      AND TRIM(m.trailer_url) <> ''
    GROUP BY m.id
    ORDER BY
      CASE
        WHEN m.title = 'Avengers: Endgame' THEN 0
        WHEN m.title = 'The Conjuring' THEN 1
        ELSE 2
      END,
      m.id DESC,
      m.release_date DESC
    LIMIT 6
    `
  );

  return rows;
};

const getMovieRatings = async (movieId) => {
  await getMovieById(movieId);

  const [reviews] = await pool.execute(
    `
    SELECT
      mr.id, mr.user_id, u.full_name, mr.rating, mr.comment, mr.created_at
    FROM movie_ratings mr
    JOIN users u ON u.id = mr.user_id
    WHERE mr.movie_id = ?
    ORDER BY mr.created_at DESC, mr.id DESC
    `,
    [movieId]
  );

  const [summaryRows] = await pool.execute(
    `
    SELECT rating AS average_rating, total_ratings
    FROM movies
    WHERE id = ?
    LIMIT 1
    `,
    [movieId]
  );

  return {
    reviews,
    average_rating: summaryRows[0]?.average_rating || 0,
    total_ratings: summaryRows[0]?.total_ratings || 0,
  };
};

const findRateableBooking = async (connection, movieId, userId, bookingId = null) => {
  const bookingFilter = bookingId ? "AND b.id = ?" : "";
  const params = bookingId ? [userId, movieId, bookingId] : [userId, movieId];

  const [rows] = await connection.execute(
    `
    SELECT b.id
    FROM bookings b
    JOIN showtimes s ON s.id = b.showtime_id
    WHERE b.user_id = ?
      AND s.movie_id = ?
      ${bookingFilter}
      AND b.booking_status = 'CONFIRMED'
      AND s.end_time < NOW()
      AND (
        NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id)
        OR EXISTS (
          SELECT 1
          FROM payments p
          WHERE p.booking_id = b.id AND p.payment_status = 'SUCCESS'
        )
      )
    ORDER BY s.end_time DESC, b.id DESC
    LIMIT 1
    `,
    params
  );

  return rows[0] || null;
};

const getCanRateMovie = async (movieId, userId) => {
  await getMovieById(movieId);

  const [ratedRows] = await pool.execute(
    "SELECT id FROM movie_ratings WHERE user_id = ? AND movie_id = ? LIMIT 1",
    [userId, movieId]
  );

  if (ratedRows[0]) {
    return {
      canRate: false,
      reason: "Bạn đã đánh giá phim này.",
    };
  }

  const booking = await findRateableBooking(pool, movieId, userId);
  if (!booking) {
    return {
      canRate: false,
      reason: "Bạn có thể đánh giá sau khi xem phim.",
    };
  }

  return {
    canRate: true,
    reason: "Bạn có thể đánh giá phim này.",
    bookingId: booking.id,
  };
};

const createMovieRating = async ({ movieId, userId, bookingId, rating, comment }) => {
  const normalizedRating = Number(rating);
  const normalizedBookingId = Number(bookingId);

  if (!Number.isFinite(normalizedBookingId) || normalizedBookingId <= 0) {
    throw new AppError("bookingId is required", 400);
  }

  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 10) {
    throw new AppError("Rating must be from 1 to 10", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [movieRows] = await connection.execute("SELECT id FROM movies WHERE id = ? LIMIT 1", [
      movieId,
    ]);
    if (!movieRows[0]) {
      throw new AppError("Movie not found", 404);
    }

    const [ratedRows] = await connection.execute(
      "SELECT id FROM movie_ratings WHERE user_id = ? AND movie_id = ? LIMIT 1 FOR UPDATE",
      [userId, movieId]
    );
    if (ratedRows[0]) {
      throw new AppError("Bạn đã đánh giá phim này.", 409);
    }

    const booking = await findRateableBooking(connection, movieId, userId, normalizedBookingId);
    if (!booking) {
      throw new AppError("Booking không đủ điều kiện để đánh giá phim này.", 403);
    }

    await connection.execute(
      `
      INSERT INTO movie_ratings(user_id, movie_id, booking_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
      `,
      [userId, movieId, normalizedBookingId, normalizedRating, comment?.trim() || null]
    );

    await connection.execute(
      `
      UPDATE movies m
      SET
        m.rating = (
          SELECT ROUND(AVG(mr.rating), 1)
          FROM movie_ratings mr
          WHERE mr.movie_id = m.id
        ),
        m.total_ratings = (
          SELECT COUNT(*)
          FROM movie_ratings mr
          WHERE mr.movie_id = m.id
        )
      WHERE m.id = ?
      `,
      [movieId]
    );

    await connection.execute(
      `
      INSERT INTO user_memberships(user_id, tier_id, total_spend, points)
      VALUES (?, 1, 0, 1)
      ON DUPLICATE KEY UPDATE points = points + 1
      `,
      [userId]
    );

    await connection.commit();
    return getMovieRatings(movieId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getTrailerMovies,
  getMovieRatings,
  getCanRateMovie,
  createMovieRating,
};
