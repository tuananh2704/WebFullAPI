import type { CSSProperties } from "react";
import { CalendarDays, Clock3, Play, Star } from "lucide-react";
import type { Movie } from "../homeData";

type HeroSectionProps = {
  movie: Movie;
  onBook: () => void;
};

const HeroSection = ({ movie, onBook }: HeroSectionProps) => {
  const heroStyle = {
    "--hero-image": `url(${movie.image})`,
  } as CSSProperties;

  return (
    <section className="hero" style={heroStyle}>
      <div className="container hero-content">
        <span className="age-badge">{movie.age}</span>
        <h1>{movie.title}</h1>

        <div className="movie-meta">
          <span className="rating">
            <Star size={26} fill="currentColor" />
            {movie.rating}
          </span>
          <span>
            <Clock3 size={24} />
            {movie.duration}
          </span>
          <span>
            <CalendarDays size={24} />
            {movie.format || "Phụ đề"}
          </span>
        </div>

        <p>{movie.description}</p>

        <div className="hero-actions">
          <button className="primary-btn" type="button" onClick={onBook}>
            <Play size={26} />
            Đặt vé ngay
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" })}
          >
            Xem chi tiết
          </button>
        </div>

        <div className="slider-dots" aria-label="Hero slides">
          <span className="active" />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
