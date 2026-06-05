import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Select, Tag, Spin, Empty } from "antd";
import {
  getCinemaById,
  getShowtimesByCinema,
  getShowtimesByMovieAndCinema,
} from "../../services/cinemaService";
import { getMovies } from "../../services/movieService";
import type { ApiCinema, ApiMovie, ApiRoom, ApiShowtime, ShowtimeByDate } from "../../types/api";
import { formatTime } from "../../utils/format";

const BRAND_COLOR: Record<string, string> = {
  CGV: "#E50914",
  LOTTE: "#333",
  GALAXY: "#1565C0",
  BHD: "#7B1FA2",
  CINESTAR: "#E65100",
};

const ROOM_TYPE_COLOR: Record<string, string> = {
  "2D": "#37474F",
  "3D": "#1565C0",
  IMAX: "#4A148C",
  "4DX": "#BF360C",
};

const toDateKey = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Generate the next 14 days as local YYYY-MM-DD strings
const generateNext14Days = (): string[] => {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(toDateKey(d));
  }
  return days;
};

const formatTabLabel = (dateStr: string): React.ReactNode => {
  const d = new Date(dateStr + "T00:00:00");
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const isToday = dateStr === toDateKey(new Date());
  return (
    <span className="date-tab-label">
      <span className="date-tab-day">{isToday ? "Hôm nay" : dayNames[d.getDay()]}</span>
      <span className="date-tab-date">{dd}/{mm}</span>
    </span>
  );
};

const CinemaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const cinemaId = Number(id);
  const navigate = useNavigate();

  const [cinema, setCinema] = useState<ApiCinema | null>(null);
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [showtimesByDate, setShowtimesByDate] = useState<ShowtimeByDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showtimeLoading, setShowtimeLoading] = useState(false);

  const next14Days = generateNext14Days();

  useEffect(() => {
    const load = async () => {
      try {
        const [cinemaData, moviesData, cinemaShowtimes] = await Promise.all([
          getCinemaById(cinemaId),
          getMovies({ limit: 100 }),
          getShowtimesByCinema(cinemaId),
        ]);
        const movieIdsWithShowtimes = new Set(
          cinemaShowtimes.flatMap((group) => group.showtimes.map((showtime) => showtime.movie_id))
        );
        const availableMovies = moviesData.items.filter((movie) =>
          movieIdsWithShowtimes.has(movie.id)
        );
        setCinema(cinemaData);
        setMovies(availableMovies);
        setSelectedMovieId((current) => current || availableMovies[0]?.id || null);
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cinemaId]);

  useEffect(() => {
    if (!selectedMovieId) {
      setShowtimesByDate([]);
      return;
    }
    const load = async () => {
      setShowtimeLoading(true);
      try {
        const data = await getShowtimesByMovieAndCinema(selectedMovieId, cinemaId);
        setShowtimesByDate(data);
        // Auto-select first available date
        if (data.length > 0) {
          setSelectedDate(data[0].date);
        } else {
          setSelectedDate(next14Days[0]);
        }
      } catch {
        setShowtimesByDate([]);
      } finally {
        setShowtimeLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovieId, cinemaId]);

  const availableDates = new Set(showtimesByDate.map((g) => g.date));

  const currentShowtimes =
    showtimesByDate.find((g) => g.date === selectedDate)?.showtimes ?? [];

  const handleShowtimeClick = (showtime: ApiShowtime) => {
    const params = new URLSearchParams({
      cinema_id: String(cinemaId),
      date: selectedDate,
      showtime_id: String(showtime.id),
    });

    navigate(`/movies/${showtime.movie_id}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="cinema-loading" style={{ minHeight: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!cinema) {
    return (
      <section className="app-page">
        <div className="container">
          <Empty description="Không tìm thấy rạp phim" />
        </div>
      </section>
    );
  }

  return (
    <section className="app-page">
      <div className="container">
        <div className="cinema-detail-layout">
          {/* ====== Panel trái: thông tin rạp ====== */}
          <aside className="cinema-detail-left">
            <div
              className="brand-badge large"
              style={{ background: BRAND_COLOR[cinema.brand] || "#333" }}
            >
              {cinema.brand}
            </div>
            <h1 style={{ fontSize: "1.7rem", margin: "16px 0 6px" }}>{cinema.name}</h1>
            <p className="muted" style={{ marginBottom: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 4 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {cinema.city}
            </p>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{cinema.address}</p>
            {cinema.phone && <p style={{ marginTop: 8, fontSize: 14, color: "#ccc" }}>📞 {cinema.phone}</p>}

            {/* Rooms */}
            <h2 style={{ marginTop: 28, marginBottom: 14, fontSize: 18 }}>Phòng chiếu</h2>
            <div className="cinema-rooms-list">
              {(cinema.rooms || []).map((room: ApiRoom) => (
                <div className="cinema-room-card" key={room.id}>
                  <span className="cinema-room-name">{room.name}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag
                      className="room-type-badge"
                      style={{
                        background: ROOM_TYPE_COLOR[room.room_type] || "#333",
                        border: "none",
                        color: "#fff",
                        fontSize: 11,
                      }}
                    >
                      {room.room_type}
                    </Tag>
                    <Tag
                      style={{
                        background: room.status === "ACTIVE" ? "rgba(76,175,80,0.2)" : "rgba(255,152,0,0.2)",
                        color: room.status === "ACTIVE" ? "#81C784" : "#FFB74D",
                        border: "none",
                        fontSize: 11,
                      }}
                    >
                      {room.status === "ACTIVE" ? "Hoạt động" : "Bảo trì"}
                    </Tag>
                    <span style={{ fontSize: 12, color: "#999" }}>{room.total_seats} ghế</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* ====== Panel phải: chọn phim + suất chiếu ====== */}
          <main className="cinema-detail-right">
            <h2 style={{ marginBottom: 16, fontSize: 20 }}>Chọn phim &amp; suất chiếu</h2>

            {/* Movie selector */}
            <Select
              id="select-movie"
              showSearch
              placeholder="-- Chọn phim --"
              style={{ width: "100%", marginBottom: 20 }}
              optionFilterProp="label"
              options={movies.map((m) => ({ value: m.id, label: m.title }))}
              onChange={(val: number) => setSelectedMovieId(val)}
              value={selectedMovieId}
              notFoundContent="Rạp này chưa có phim có suất chiếu"
            />

            {!selectedMovieId && (
              <Empty
                description="Chọn phim để xem lịch chiếu"
                style={{ color: "#888", marginTop: 40 }}
              />
            )}

            {selectedMovieId && showtimeLoading && (
              <div className="cinema-loading" style={{ height: 200 }}>
                <Spin />
              </div>
            )}

            {selectedMovieId && !showtimeLoading && (
              <>
                {/* Date tabs */}
                <div className="date-tabs">
                  {next14Days.map((day) => {
                    const hasShowtime = availableDates.has(day);
                    return (
                      <button
                        key={day}
                        id={`date-tab-${day}`}
                        className={[
                          "date-tab-btn",
                          selectedDate === day ? "active" : "",
                          !hasShowtime ? "disabled" : "",
                        ].join(" ")}
                        onClick={() => hasShowtime && setSelectedDate(day)}
                        disabled={!hasShowtime}
                      >
                        {formatTabLabel(day)}
                      </button>
                    );
                  })}
                </div>

                {/* Showtime grid */}
                {currentShowtimes.length === 0 ? (
                  <Empty
                    description="Không có suất chiếu trong ngày này"
                    style={{ color: "#888", marginTop: 30 }}
                  />
                ) : (
                  <div className="showtime-btn-grid">
                    {currentShowtimes.map((st) => (
                      <button
                        id={`showtime-btn-${st.id}`}
                        key={st.id}
                        className="showtime-btn"
                        onClick={() => handleShowtimeClick(st)}
                      >
                        <span className="showtime-btn-time">
                          {formatTime(st.start_time)}
                        </span>
                        <span className="showtime-btn-room">{st.room_name}</span>
                        <Tag
                          style={{
                            background: ROOM_TYPE_COLOR[st.room_type] || "#333",
                            border: "none",
                            color: "#fff",
                            fontSize: 10,
                            lineHeight: "18px",
                          }}
                        >
                          {st.room_type}
                        </Tag>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default CinemaDetailPage;
