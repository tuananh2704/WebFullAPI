const pool = require("../configs/db");
const AppError = require("../utils/AppError");

const movieSelect = `
  SELECT
    m.id, m.title, m.description, m.duration, m.release_date, m.poster_url,
    m.language, m.rating, m.status,
    COALESCE(JSON_ARRAYAGG(g.name), JSON_ARRAY()) AS genres
  FROM movies m
  LEFT JOIN movie_genres mg ON mg.movie_id = m.id
  LEFT JOIN genres g ON g.id = mg.genre_id
`;

const normalizeMovie = (movie) => ({
  ...movie,
  genres: typeof movie.genres === "string" ? JSON.parse(movie.genres).filter(Boolean) : movie.genres,
});

const getMovies = async ({ page, limit, search, genre, status }) => {
  const safeLimit = Number(limit);
  const offset = (Number(page) - 1) * safeLimit;
  const where = [];
  const params = [];

  if (search) {
    where.push("(m.title LIKE ? OR m.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (genre) {
    where.push("m.id IN (SELECT movie_id FROM movie_genres mg2 JOIN genres g2 ON g2.id = mg2.genre_id WHERE g2.name = ?)");
    params.push(genre);
  }

  if (status) {
    where.push("m.status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

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
    ORDER BY m.release_date DESC, m.id DESC
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
      totalPages: Math.ceil(countRows[0].total / limit),
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
    INSERT INTO movies(title, description, duration, release_date, poster_url, language, rating, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      movie.title,
      movie.description || null,
      movie.duration || null,
      movie.release_date || null,
      movie.poster_url || null,
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
        duration = COALESCE(?, duration),
        release_date = COALESCE(?, release_date),
        poster_url = COALESCE(?, poster_url),
        language = COALESCE(?, language),
        rating = COALESCE(?, rating),
        status = COALESCE(?, status)
    WHERE id = ?
    `,
    [
      movie.title || null,
      movie.description || null,
      movie.duration || null,
      movie.release_date || null,
      movie.poster_url || null,
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
