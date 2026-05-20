USE cinema_booking;

-- Avengers: Endgame
INSERT INTO movies (
  title,
  description,
  director,
  duration,
  release_date,
  poster_url,
  trailer_url,
  language,
  rating,
  status
)
SELECT
  'Avengers: Endgame',
  'Sau thảm kịch của Infinity War, các Avengers tập hợp lần cuối để đảo ngược hành động của Thanos.',
  'Anthony Russo, Joe Russo',
  181,
  '2019-04-26',
  'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  'https://www.youtube.com/watch?v=TcMBFSGVi1c',
  'English',
  9.2,
  'NOW_SHOWING'
WHERE NOT EXISTS (
  SELECT 1 FROM movies WHERE title = 'Avengers: Endgame'
);

UPDATE movies
SET
  trailer_url = 'https://www.youtube.com/watch?v=TcMBFSGVi1c',
  poster_url = 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  status = 'NOW_SHOWING'
WHERE title = 'Avengers: Endgame';

-- The Conjuring
INSERT INTO movies (
  title,
  description,
  director,
  duration,
  release_date,
  poster_url,
  trailer_url,
  language,
  rating,
  status
)
SELECT
  'The Conjuring',
  'Hai nhà điều tra hoang mang phải đối mặt với vụ quỷ ám kinh hoàng nhất sự nghiệp tại một trang trại Rhode Island.',
  'James Wan',
  112,
  '2013-07-19',
  'https://image.tmdb.org/t/p/w500/wVYREutTvI2tmxr6ujrHT704wGF.jpg',
  'https://www.youtube.com/watch?v=k10ETZ41q5o',
  'English',
  7.9,
  'NOW_SHOWING'
WHERE NOT EXISTS (
  SELECT 1 FROM movies WHERE title = 'The Conjuring'
);

UPDATE movies
SET
  trailer_url = 'https://www.youtube.com/watch?v=k10ETZ41q5o',
  poster_url = 'https://image.tmdb.org/t/p/w500/wVYREutTvI2tmxr6ujrHT704wGF.jpg',
  status = 'NOW_SHOWING'
WHERE title = 'The Conjuring';

-- Genre mapping for Avengers: Action, Adventure, Sci-Fi
INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Action'
WHERE m.title = 'Avengers: Endgame'
  AND NOT EXISTS (
    SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = g.id
  );

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Adventure'
WHERE m.title = 'Avengers: Endgame'
  AND NOT EXISTS (
    SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = g.id
  );

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Sci-Fi'
WHERE m.title = 'Avengers: Endgame'
  AND NOT EXISTS (
    SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = g.id
  );

-- Genre mapping for The Conjuring: Horror, Thriller
INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Horror'
WHERE m.title = 'The Conjuring'
  AND NOT EXISTS (
    SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = g.id
  );

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Thriller'
WHERE m.title = 'The Conjuring'
  AND NOT EXISTS (
    SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = g.id
  );
