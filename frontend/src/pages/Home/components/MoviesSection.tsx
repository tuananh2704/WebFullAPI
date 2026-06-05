import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const nowShowingRef = useRef<HTMLDivElement>(null);
  const comingSoonRef = useRef<HTMLDivElement>(null);
  const nowShowingMovies = movies.filter(
    (movie) => (movie.status || "NOW_SHOWING") === "NOW_SHOWING"
  );
  const comingSoonMovies = movies.filter((movie) => movie.status === "COMING_SOON");

  const scroll = (target: "now" | "soon", dir: "left" | "right") => {
    const slider = target === "now" ? nowShowingRef.current : comingSoonRef.current;
    if (!slider) return;
    const amount = slider.clientWidth * 0.75;
    slider.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section id="movies" className="movies-section">
      <div className="container">
        <div className="movies-header">
          <div>
            <span className="section-kicker">Phim tại CINEMAX</span>
            <h2>Đang chiếu</h2>
          </div>
          <div className="slider-controls">
            <button
              className="slider-arrow"
              aria-label="Trước"
              onClick={() => scroll("now", "left")}
              type="button"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className="slider-arrow"
              aria-label="Sau"
              onClick={() => scroll("now", "right")}
              type="button"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>

        {isLoading && <p className="section-state">Đang tải phim từ backend...</p>}
        {!isLoading && errorMessage && <p className="section-state warning">{errorMessage}</p>}

        <div className="movie-slider-wrap">
          <div className="movie-slider" ref={nowShowingRef}>
            {nowShowingMovies.map((movie) => (
              <MovieCard
                movie={movie}
                key={movie.id || movie.title}
                onChooseMovie={onChooseMovie}
              />
            ))}
          </div>
          <div className="slider-fade-left" />
          <div className="slider-fade-right" />
        </div>

        <div className="movies-section-actions">
          <Link className="ghost-btn" to="/movies">
            Xem tất cả phim
          </Link>
        </div>

        {comingSoonMovies.length > 0 && (
          <div className="coming-soon-block">
            <div className="movies-header">
              <div>
                <span className="section-kicker">Lịch chiếu mới</span>
                <h2>Phim sắp chiếu</h2>
              </div>
              <div className="slider-controls">
                <button
                  className="slider-arrow"
                  aria-label="Trước"
                  onClick={() => scroll("soon", "left")}
                  type="button"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  className="slider-arrow"
                  aria-label="Sau"
                  onClick={() => scroll("soon", "right")}
                  type="button"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>

            <div className="movie-slider-wrap">
              <div className="movie-slider movie-slider-compact" ref={comingSoonRef}>
                {comingSoonMovies.map((movie) => (
                  <MovieCard
                    movie={movie}
                    key={movie.id || movie.title}
                    onChooseMovie={onChooseMovie}
                  />
                ))}
              </div>
              <div className="slider-fade-left" />
              <div className="slider-fade-right" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MoviesSection;
