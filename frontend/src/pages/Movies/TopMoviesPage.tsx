import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Languages, Star, Ticket, Trophy } from "lucide-react";

import { getMovies } from "../../services/movieService";
import type { ApiMovie } from "../../types/api";

const formatRating = (rating: ApiMovie["rating"]) => {
  const value = Number(rating ?? 0);
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
};

const formatCount = (count: ApiMovie["total_ratings"]) => {
  const value = Number(count ?? 0);
  return Number.isFinite(value) ? new Intl.NumberFormat("vi-VN").format(value) : "0";
};

const getRatingValue = (movie: ApiMovie) => {
  const value = Number(movie.rating ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const TopMoviesPage = () => {
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getMovies({ page: 1, limit: 6, sort: "rating_desc" })
      .then((data) => {
        if (isMounted) {
          const sortedMovies = [...data.items]
            .sort((firstMovie, secondMovie) => getRatingValue(secondMovie) - getRatingValue(firstMovie))
            .slice(0, 6);
          setMovies(sortedMovies);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMovies([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="top-movies-page">
      <section className="container top-movies-hero">
        <div>
          <span className="top-movies-kicker">
            <Trophy size={18} />
            Bảng xếp hạng
          </span>
          <h1>Top phim</h1>
          <p>6 phim có điểm đánh giá cao nhất trên CINEMAX.</p>
        </div>
      </section>

      <section className="container top-movies-section">
        {isLoading ? (
          <div className="top-movies-state">Đang tải danh sách phim...</div>
        ) : movies.length === 0 ? (
          <div className="top-movies-state">Chưa có phim nào có đánh giá.</div>
        ) : (
          <div className="top-movies-grid">
            {movies.map((movie, index) => (
              <article className="top-movie-card" key={movie.id}>
                <Link className="top-movie-poster" to={`/movies/${movie.id}`}>
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} />
                  ) : (
                    <div className="top-movie-poster-empty">{movie.title.charAt(0)}</div>
                  )}
                  <span className="top-movie-rank">#{index + 1}</span>
                  <span className="top-movie-score">
                    <Star size={15} fill="currentColor" />
                    {formatRating(movie.rating)}
                  </span>
                </Link>

                <div className="top-movie-info">
                  <div>
                    <h2>{movie.title}</h2>
                    <p>{movie.genres?.slice(0, 2).join(", ") || "Cinema"}</p>
                  </div>

                  <div className="top-movie-meta">
                    {movie.duration && (
                      <span>
                        <Clock3 size={15} />
                        {movie.duration} phút
                      </span>
                    )}
                    {movie.language && (
                      <span>
                        <Languages size={15} />
                        {movie.language}
                      </span>
                    )}
                    <span>
                      <Star size={15} />
                      {formatCount(movie.total_ratings)} đánh giá
                    </span>
                  </div>

                  <div className="top-movie-actions">
                    <Link to={`/movies/${movie.id}`} className="top-movie-detail-btn">
                      Chi tiết
                    </Link>
                    <Link to={`/movies/${movie.id}?booking=1`} className="top-movie-book-btn">
                      <Ticket size={17} />
                      Đặt vé
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TopMoviesPage;
