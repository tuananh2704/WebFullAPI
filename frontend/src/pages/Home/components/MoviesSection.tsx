import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "../homeData";
import MovieCard from "./MovieCard";

type MoviesSectionProps = {
  movies: Movie[];
  isLoading: boolean;
  errorMessage: string;
  onChooseMovie: (movie: Movie) => void;
};

const TABS = ["Đang chiếu", "Sắp chiếu"] as const;

const MoviesSection = ({
  movies,
  isLoading,
  errorMessage,
  onChooseMovie,
}: MoviesSectionProps) => {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Đang chiếu");
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    const amount = sliderRef.current.clientWidth * 0.75;
    sliderRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section id="movies" className="movies-section">
      <div className="container">
        {/* Header row */}
        <div className="movies-header">
          <div className="movie-tabs" aria-label="Movie status">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={tab === activeTab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Scroll controls */}
          <div className="slider-controls">
            <button
              className="slider-arrow"
              aria-label="Trước"
              onClick={() => scroll("left")}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className="slider-arrow"
              aria-label="Sau"
              onClick={() => scroll("right")}
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>

        {/* State messages */}
        {isLoading && <p className="section-state">Đang tải phim từ backend...</p>}
        {!isLoading && errorMessage && (
          <p className="section-state warning">{errorMessage}</p>
        )}

        {/* Horizontal scroll slider */}
        <div className="movie-slider-wrap">
          <div className="movie-slider" ref={sliderRef}>
            {movies.map((movie) => (
              <MovieCard
                movie={movie}
                key={movie.id || movie.title}
                onChooseMovie={onChooseMovie}
              />
            ))}
          </div>

          {/* Fade edges */}
          <div className="slider-fade-left" />
          <div className="slider-fade-right" />
        </div>
      </div>
    </section>
  );
};

export default MoviesSection;
