import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  }).format(new Date(value));
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateKey = () => formatDateKey(new Date());

const getShowDate = (showtime: ApiShowtime) => {
  if (showtime.show_date) {
    return showtime.show_date.slice(0, 10);
  }

  return formatDateKey(new Date(showtime.start_time));
};

const formatDateLabel = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

const formatLongDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const BookingSection = ({
  selectedMovie,
  showtimes,
  isLoading,
  message,
}: BookingSectionProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);

  const availableDateSet = useMemo(() => {
    const today = getTodayDateKey();

    return new Set(
      showtimes
        .filter((showtime) => showtime.status !== "CANCELLED" && getShowDate(showtime) >= today)
        .map(getShowDate)
    );
  }, [showtimes]);

  const dateOptions = useMemo(() => {
    const dates = Array.from(availableDateSet).sort();

    if (dates.length === 0) {
      return [];
    }

    const today = getTodayDateKey();
    const firstDateKey = dates[0] < today ? today : dates[0];
    const firstDate = new Date(`${firstDateKey}T00:00:00`);
    const lastDate = new Date(`${dates[dates.length - 1]}T00:00:00`);
    const options: string[] = [];

    for (
      const cursor = new Date(firstDate);
      cursor <= lastDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      options.push(formatDateKey(cursor));
    }

    return options;
  }, [availableDateSet]);

  useEffect(() => {
    const firstAvailableDate = dateOptions.find((date) => availableDateSet.has(date)) || "";
    setSelectedDate(firstAvailableDate);
    setSelectedCinemaId(null);
  }, [availableDateSet, dateOptions, selectedMovie?.id]);

  const showtimesBySelectedDate = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return showtimes.filter(
      (showtime) =>
        getShowDate(showtime) === selectedDate &&
        showtime.status !== "CANCELLED" &&
        getShowDate(showtime) >= getTodayDateKey()
    );
  }, [selectedDate, showtimes]);

  const cinemas = useMemo(() => {
    const cinemaMap = new Map<
      number,
      {
        id: number;
        name: string;
        totalSlots: number;
        availableSlots: number;
        showtimes: ApiShowtime[];
      }
    >();

    for (const showtime of showtimesBySelectedDate) {
      if (!showtime.cinema_id) {
        continue;
      }

      const cinema = cinemaMap.get(showtime.cinema_id) || {
        id: showtime.cinema_id,
        name: showtime.cinema_name,
        totalSlots: 0,
        availableSlots: 0,
        showtimes: [],
      };

      cinema.totalSlots += 1;
      if (showtime.status === "OPEN") {
        cinema.availableSlots += 1;
      }
      cinema.showtimes.push(showtime);
      cinemaMap.set(showtime.cinema_id, cinema);
    }

    return Array.from(cinemaMap.values()).sort((a, b) => {
      if (b.availableSlots !== a.availableSlots) {
        return b.availableSlots - a.availableSlots;
      }

      return a.name.localeCompare(b.name, "vi");
    });
  }, [showtimesBySelectedDate]);

  useEffect(() => {
    if (cinemas.length === 0) {
      setSelectedCinemaId(null);
      return;
    }

    const currentCinema = cinemas.find((cinema) => cinema.id === selectedCinemaId);
    if (currentCinema && currentCinema.availableSlots > 0) {
      return;
    }

    const firstCinemaWithSlots = cinemas.find((cinema) => cinema.availableSlots > 0);
    setSelectedCinemaId(firstCinemaWithSlots?.id || null);
  }, [cinemas, selectedCinemaId]);

  const selectedCinema = cinemas.find((cinema) => cinema.id === selectedCinemaId) || null;
  const visibleShowtimes = selectedCinema ? selectedCinema.showtimes : [];

  const goToBookingWithCinema = (cinema: { id: number; showtimes: ApiShowtime[] }) => {
    const firstOpenShowtime = cinema.showtimes.find((showtime) => showtime.status === "OPEN");
    if (!selectedMovie?.id || !firstOpenShowtime) {
      setSelectedCinemaId(cinema.id);
      return;
    }

    const params = new URLSearchParams({
      cinema_id: String(cinema.id),
      date: selectedDate,
      showtime_id: String(firstOpenShowtime.id),
    });

    navigate(`/movies/${selectedMovie.id}?${params.toString()}`);
  };

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

        {!isLoading && showtimes.length > 0 && (
          <div className="booking-flow">
            <div className="booking-picker">
              <div className="booking-picker-head">
                <CalendarDays size={20} />
                <h3>Chọn ngày</h3>
              </div>
              <div className="date-strip" role="list">
                {dateOptions.map((date) => {
                  const hasShowtime = availableDateSet.has(date);
                  return (
                    <button
                      className={`date-chip${selectedDate === date ? " active" : ""}${
                        hasShowtime ? " has-showtime" : ""
                      }`}
                      disabled={!hasShowtime}
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      type="button"
                    >
                      <span>{formatDateLabel(date)}</span>
                      <small>{hasShowtime ? "Có suất" : "Trống"}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="booking-picker">
              <div className="booking-picker-head">
                <MapPin size={20} />
                <h3>Chọn rạp</h3>
                {selectedDate && <span>{formatLongDate(selectedDate)}</span>}
              </div>

              {cinemas.length > 0 ? (
                <div className="cinema-slot-list">
                  {cinemas.map((cinema) => (
                    <button
                      className={`cinema-slot-btn${
                        selectedCinemaId === cinema.id ? " active" : ""
                      }`}
                      disabled={cinema.availableSlots === 0}
                      key={cinema.id}
                      onClick={() => goToBookingWithCinema(cinema)}
                      type="button"
                    >
                      <strong>{cinema.name}</strong>
                      <span>
                        {cinema.availableSlots > 0
                          ? `(${cinema.availableSlots} slot còn)`
                          : "(hết slot)"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="section-state warning">Ngày này chưa có rạp mở suất chiếu.</p>
              )}
            </div>
          </div>
        )}

        <div className="showtime-grid">
          {visibleShowtimes.map((showtime) => (
            <button
              className="showtime-card"
              key={showtime.id}
              onClick={() => navigate(`/movies/${showtime.movie_id}?showtime_id=${showtime.id}`)}
              type="button"
            >
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
