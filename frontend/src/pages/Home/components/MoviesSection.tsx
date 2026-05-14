import type { Movie } from "../homeData";
import MovieCard from "./MovieCard";

type MoviesSectionProps = {
  movies: Movie[];
  isLoading: boolean;
  errorMessage: string;
  onChooseMovie: (movie: Movie) => void;
};

const MoviesSection = ({
  movies,
  isLoading,
  errorMessage,
  onChooseMovie,
}: MoviesSectionProps) => {
  return (
    <section id="movies" className="movies-section">
      <div className="container">
        <div className="movie-tabs" aria-label="Movie status">
          <button className="active">Đang chiếu</button>
          <button>Sắp chiếu</button>
        </div>

        {isLoading && <p className="section-state">Đang tải phim từ backend...</p>}
        {!isLoading && errorMessage && <p className="section-state warning">{errorMessage}</p>}

        <div className="movie-grid">
          {movies.map((movie) => (
            <MovieCard
              movie={movie}
              key={movie.id || movie.title}
              onChooseMovie={onChooseMovie}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MoviesSection;
