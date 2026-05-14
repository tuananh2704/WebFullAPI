import { Clock3, Play, Star } from "lucide-react";
import type { Movie } from "../homeData";

type MovieCardProps = {
  movie: Movie;
  onChooseMovie: (movie: Movie) => void;
};

const MovieCard = ({ movie, onChooseMovie }: MovieCardProps) => {
  return (
    <article className="movie-card" onClick={() => onChooseMovie(movie)}>
      <div className="poster-wrap">
        <img src={movie.image} alt={movie.title} />
        <span className="age-badge small">{movie.age}</span>
        <span className="card-rating">
          <Star size={21} fill="currentColor" />
          {movie.rating}
        </span>
        {movie.featured && (
          <button
            className="quick-book"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChooseMovie(movie);
            }}
          >
            <Play size={22} />
            Đặt vé
          </button>
        )}
      </div>

      <div className="movie-info">
        <h3>{movie.title}</h3>
        <span className="duration">
          <Clock3 size={20} />
          {movie.duration}
        </span>
        <div className="genre-list">
          {movie.genres.map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
      </div>
    </article>
  );
};

export default MovieCard;
