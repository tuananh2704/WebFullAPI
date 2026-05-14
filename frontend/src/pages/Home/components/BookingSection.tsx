import { CalendarDays, Clock3, MapPin } from "lucide-react";
import type { ApiShowtime } from "../../../types/api";
import type { Movie } from "../homeData";

type BookingSectionProps = {
  selectedMovie: Movie | null;
  showtimes: ApiShowtime[];
  isLoading: boolean;
  message: string;
};

const formatTime = (value: string) => {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const BookingSection = ({
  selectedMovie,
  showtimes,
  isLoading,
  message,
}: BookingSectionProps) => {
  return (
    <section id="booking" className="booking-section">
      <div className="container">
        <div className="booking-header">
          <div>
            <span>Đặt vé</span>
            <h2>{selectedMovie ? selectedMovie.title : "Chọn phim để xem suất chiếu"}</h2>
          </div>
          {selectedMovie && <p>{selectedMovie.description}</p>}
        </div>

        {isLoading && <p className="section-state">Đang tải suất chiếu...</p>}
        {!isLoading && message && <p className="section-state warning">{message}</p>}

        <div className="showtime-grid">
          {showtimes.map((showtime) => (
            <button className="showtime-card" key={showtime.id}>
              <span className="showtime-status">{showtime.status}</span>
              <strong>{showtime.movie_title}</strong>
              <span>
                <CalendarDays size={18} />
                {formatTime(showtime.start_time)}
              </span>
              <span>
                <MapPin size={18} />
                {showtime.cinema_name} - {showtime.room_name}
              </span>
              <span>
                <Clock3 size={18} />
                {showtime.room_type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BookingSection;
