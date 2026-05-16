const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const movieSelect = `
  SELECT
    m.id, m.title, m.description, m.director, m.duration, m.release_date, m.poster_url,
    m.trailer_url, m.language, m.rating, m.status,
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
  rating_desc: "m.rating DESC, m.id DESC",
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
    INSERT INTO movies(title, description, director, duration, release_date, poster_url, trailer_url, language, rating, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
};
