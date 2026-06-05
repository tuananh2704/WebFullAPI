import { Clock3, Play, Star } from "lucide-react";
import type { Movie } from "../homeData";

type MovieCardProps = {
  movie: Movie;
  onChooseMovie: (movie: Movie) => void;
};

const formatBookingCount = (count = 0) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}m`;
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }

  return String(count);
};

const MovieCard = ({ movie, onChooseMovie }: MovieCardProps) => {
  return (
    <article className="movie-card" onClick={() => onChooseMovie(movie)}>
      <div className="poster-wrap">
        <img src={movie.image} alt={movie.title} loading="lazy" />

        {/* Age badge */}
        <span className="age-badge small">{movie.age}</span>

        <span className="booking-count-badge">
          Lượt đặt vé: {formatBookingCount(movie.bookingCount)}
        </span>

        {/* Rating */}
        <span className="card-rating">
          <Star size={14} fill="currentColor" />
          {movie.rating}
        </span>

        {/* Hover overlay với nút đặt vé */}
        <div className="poster-hover">
          <button
            className="book-now-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChooseMovie(movie);
            }}
          >
            <Play size={18} fill="currentColor" />
            Đặt vé ngay
          </button>
        </div>
      </div>

      <div className="movie-info">
        <h3 title={movie.title}>{movie.title}</h3>
        <span className="duration">
          <Clock3 size={14} />
          {movie.duration}
        </span>
        <div className="genre-list">
          {movie.genres.slice(0, 2).map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
      </div>
    </article>
  );
};

export default MovieCard;
