import { useEffect, useRef, useState } from "react";
import { getMovies } from "../../services/movieService";
import { getShowtimesByMovie } from "../../services/showtimeService";
import type { ApiMovie, ApiShowtime } from "../../types/api";
import BookingSection from "./components/BookingSection";
import DealsSection from "./components/DealsSection";
import HeroSection from "./components/HeroSection";
import MoviesSection from "./components/MoviesSection";
import { fallbackMovies, posterFallbacks } from "./homeData";
import type { Movie } from "./homeData";

const isFullUrl = (url: string) => /^https?:\/\//i.test(url);

const mapApiMovieToMovie = (movie: ApiMovie, index: number): Movie => ({
  id: movie.id,
  title: movie.title,
  rating: String(movie.rating || "8.0"),
  age: movie.status === "COMING_SOON" ? "T16" : "T13",
  duration: movie.duration ? `${movie.duration}min` : "120min",
  genres: movie.genres?.length ? movie.genres : ["Cinema"],
  image:
    movie.poster_url && isFullUrl(movie.poster_url)
      ? movie.poster_url
      : posterFallbacks[index % posterFallbacks.length],
  description: movie.description || "",
  format: movie.language || "Phụ đề",
  featured: index === 2,
});

const Home = () => {
  const bookingRef = useRef<HTMLDivElement>(null);
  const [movies, setMovies] = useState<Movie[]>(fallbackMovies);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(false);
  const [movieError, setMovieError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const movieData = await getMovies({
          page: 1,
          limit: 6,
          status: "NOW_SHOWING",
        });

        if (movieData.items.length > 0) {
          setMovies(movieData.items.map(mapApiMovieToMovie));
        }
      } catch (error) {
        setMovieError("Không kết nối được backend, đang dùng dữ liệu mẫu.");
      } finally {
        setIsLoadingMovies(false);
      }
    };

    fetchMovies();
  }, []);

  const handleChooseMovie = async (movie: Movie) => {
    setSelectedMovie(movie);
    setShowtimes([]);
    setBookingMessage("");

    window.requestAnimationFrame(() => {
      bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (!movie.id) {
      setBookingMessage("Phim mẫu chưa có trong database nên chưa lấy được suất chiếu.");
      return;
    }

    try {
      setIsLoadingShowtimes(true);
      const data = await getShowtimesByMovie(movie.id);
      setShowtimes(data);

      if (data.length === 0) {
        setBookingMessage("Phim này chưa có suất chiếu.");
      }
    } catch (error) {
      setBookingMessage("Không tải được suất chiếu từ backend.");
    } finally {
      setIsLoadingShowtimes(false);
    }
  };

  return (
    <>
      {/* Video hero thuần – không có text */}
      <HeroSection />

      {/* Danh sách phim – hiện ra ngay bên dưới video */}
      <MoviesSection
        movies={movies}
        isLoading={isLoadingMovies}
        errorMessage={movieError}
        onChooseMovie={handleChooseMovie}
      />

      <div ref={bookingRef}>
        <BookingSection
          selectedMovie={selectedMovie}
          showtimes={showtimes}
          isLoading={isLoadingShowtimes}
          message={bookingMessage}
        />
      </div>
      <DealsSection />
    </>
  );
};

export default Home;
