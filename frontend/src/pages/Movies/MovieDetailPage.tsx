import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { Steps, Select, Tag, Spin, Empty, Modal, Result } from "antd";
import { createBooking, getBookingDetail } from "../../services/bookingService";
import { getFoodSizes, getFoods } from "../../services/foodService";
import { getMovieById } from "../../services/movieService";
import { createPayment } from "../../services/paymentService";
import { applyPromotion } from "../../services/promotionService";
import { getSeatsByShowtime } from "../../services/seatService";
import { getCinemas, getShowtimesByMovieAndCinema } from "../../services/cinemaService";
import { getShowtimesByMovie } from "../../services/showtimeService";
import { getCurrentUser, isLoggedIn } from "../../services/authService";
import type {
  ApiCinema,
  ApiFood,
  ApiFoodSize,
  ApiMovie,
  ApiSeat,
  ApiShowtime,
  ShowtimeByDate,
} from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

const ROOM_TYPE_COLOR: Record<string, string> = {
  "2D": "#37474F",
  "3D": "#1565C0",
  IMAX: "#4A148C",
  "4DX": "#BF360C",
};

const SEAT_TYPE_COLOR: Record<string, string> = {
  NORMAL: "#4CAF50",
  VIP: "#FF9800",
  COUPLE: "#E91E63",
};

const formatLocalDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const generateNext30Days = (): string[] => {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(formatLocalDate(d));
  }
  return days;
};

const formatTabLabel = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const isToday = dateStr === formatLocalDate(new Date());
  return (
    <span className="date-tab-label">
      <span className="date-tab-day">{isToday ? "Hôm nay" : dayNames[d.getDay()]}</span>
      <span className="date-tab-date">{dd}/{mm}</span>
    </span>
  );
};

const MovieDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const movieId = Number(id);

  const [movie, setMovie] = useState<ApiMovie | null>(null);
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [movieShowtimes, setMovieShowtimes] = useState<ApiShowtime[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [showtimesByDate, setShowtimesByDate] = useState<ShowtimeByDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => formatLocalDate(new Date()));
  const [selectedShowtime, setSelectedShowtime] = useState<ApiShowtime | null>(null);
  const [seats, setSeats] = useState<ApiSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [foods, setFoods] = useState<ApiFood[]>([]);
  const [foodSizes, setFoodSizes] = useState<ApiFoodSize[]>([]);
  const [selectedFoodSizeId, setSelectedFoodSizeId] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [message, setMessage] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Ticket state — after successful booking + payment
  const [ticketData, setTicketData] = useState<any>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const loggedIn = isLoggedIn();
  const currentUser = getCurrentUser();

  // Determine current booking step
  const currentStep = ticketData
    ? 4
    : !selectedCinemaId
    ? 0
    : !selectedShowtime
    ? 1
    : !selectedSeats.length
    ? 2
    : 3;

  const next30Days = generateNext30Days();

  useEffect(() => {
    const load = async () => {
      try {
        const [movieData, cinemaData, movieShowtimeData, foodData, sizeData] = await Promise.all([
          getMovieById(movieId),
          getCinemas(),
          getShowtimesByMovie(movieId),
          getFoods(),
          getFoodSizes(),
        ]);
        setMovie(movieData);
        setCinemas(cinemaData);
        setMovieShowtimes(movieShowtimeData);
        setFoods(foodData);
        setFoodSizes(sizeData);
      } catch (error: any) {
        setMessage(error.response?.data?.message || "Không tải được chi tiết phim.");
      } finally {
        setLoadingPage(false);
      }
    };
    load();
  }, [movieId]);

  // Pre-select showtime from URL param ?showtime_id=X
  const preselectedShowtimeId = searchParams.get("showtime_id");
  useEffect(() => {
    if (preselectedShowtimeId && showtimesByDate.length > 0) {
      for (const group of showtimesByDate) {
        const st = group.showtimes.find((s) => String(s.id) === preselectedShowtimeId);
        if (st) {
          handleChooseShowtime(st);
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedShowtimeId, showtimesByDate]);

  useEffect(() => {
    if (!selectedCinemaId) {
      setShowtimesByDate([]);
      setSelectedShowtime(null);
      return;
    }
    const load = async () => {
      setLoadingShowtimes(true);
      try {
        const data = await getShowtimesByMovieAndCinema(movieId, selectedCinemaId, {
          date: selectedDate,
        });
        setShowtimesByDate(data);
        setSelectedShowtime(null);
        setSelectedSeats([]);
        setSeats([]);
      } catch {
        setShowtimesByDate([]);
      } finally {
        setLoadingShowtimes(false);
      }
    };
    load();
  }, [selectedCinemaId, movieId, selectedDate]);

  const currentShowtimes =
    showtimesByDate.find((g) => g.date === selectedDate)?.showtimes ?? [];
  const cinemasWithSlots = useMemo(() => {
    return new Set(
      movieShowtimes
        .filter((showtime) => showtime.status !== "CANCELLED" && showtime.show_date === selectedDate)
        .map((showtime) => showtime.cinema_id)
        .filter((cinemaId): cinemaId is number => typeof cinemaId === "number")
    );
  }, [movieShowtimes, selectedDate]);

  const selectedSeatRows = seats.filter((seat) => selectedSeats.includes(seat.id));
  const selectedFood = foodSizes.find((item) => String(item.id) === selectedFoodSizeId);

  const totalBeforeDiscount = useMemo(() => {
    const seatTotal = selectedSeatRows.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
    const foodTotal = selectedFood ? Number(selectedFood.price) : 0;
    return seatTotal + foodTotal;
  }, [selectedSeatRows, selectedFood]);

  const finalAmount = Math.max(totalBeforeDiscount - discount, 0);

  const handleChooseShowtime = async (showtime: ApiShowtime) => {
    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setDiscount(0);
    setMessage("");
    try {
      setSeats(await getSeatsByShowtime(showtime.id));
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tải được ghế.");
    }
  };

  const handleToggleSeat = (seat: ApiSeat) => {
    if (seat.is_booked) return;
    setSelectedSeats((current) =>
      current.includes(seat.id) ? current.filter((sId) => sId !== seat.id) : [...current, seat.id]
    );
  };

  const handleApplyPromotion = async () => {
    try {
      const data: any = await applyPromotion({ code: promotionCode, total_amount: totalBeforeDiscount });
      setDiscount(Number(data.discount_amount || 0));
      setMessage("✅ Áp dụng mã khuyến mãi thành công!");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Mã khuyến mãi không hợp lệ.");
    }
  };

  const handlePayAndBook = async () => {
    if (!loggedIn) {
      setMessage("⚠️ Bạn cần đăng nhập trước khi đặt vé.");
      return;
    }
    if (!selectedShowtime || selectedSeats.length === 0) {
      setMessage("⚠️ Chọn suất chiếu và ghế trước khi đặt vé.");
      return;
    }

    setBookingLoading(true);
    setMessage("");
    try {
      const foodPayload = selectedFood
        ? [{ food_id: selectedFood.food_id, size_name: selectedFood.size_name, quantity: 1 }]
        : [];

      // Step 1: Create booking
      const booking: any = await createBooking({
        showtime_id: selectedShowtime.id,
        seat_ids: selectedSeats,
        foods: foodPayload,
      });

      // Step 2: Auto-pay (demo mode)
      await createPayment({ booking_id: booking.id, payment_method: "MOMO", amount: finalAmount });

      // Step 3: Fetch detailed ticket info
      const detail = await getBookingDetail(booking.id);
      setTicketData(detail);
      setShowTicketModal(true);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tạo được booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleNewBooking = () => {
    setTicketData(null);
    setShowTicketModal(false);
    setSelectedSeats([]);
    setDiscount(0);
    setPromotionCode("");
    setSelectedFoodSizeId("");
    setMessage("");
    // Reload seats to reflect newly booked seats
    if (selectedShowtime) {
      handleChooseShowtime(selectedShowtime);
    }
  };

  if (loadingPage) {
    return (
      <section className="app-page">
        <div className="container" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      </section>
    );
  }

  // Count booked vs available seats for legend
  const bookedCount = seats.filter((s) => s.is_booked).length;
  const availableCount = seats.length - bookedCount;

  return (
    <section className="app-page">
      <div className="container">
        {/* Movie header */}
        <div className="movie-detail-header">
          {movie?.poster_url && (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="movie-detail-poster"
            />
          )}
          <div>
            <p className="eyebrow">Đặt vé</p>
            <h1>{movie?.title || "Chi tiết phim"}</h1>
            <p className="muted" style={{ marginBottom: 8 }}>{movie?.description}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              {movie?.duration && <Tag color="blue">⏱ {movie.duration} phút</Tag>}
              {movie?.language && <Tag color="cyan">🌐 {movie.language}</Tag>}
              {movie?.rating && <Tag color="gold">⭐ {Number(movie.rating).toFixed(1)}</Tag>}
              {movie?.director && <Tag color="purple">🎬 {movie.director}</Tag>}
            </div>
            {movie?.genres && movie.genres.length > 0 && (
              <div className="genre-list" style={{ marginTop: 10 }}>
                {movie.genres.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Login prompt */}
        {!loggedIn && (
          <div className="auth-prompt-banner">
            <span>⚠️ Bạn cần đăng nhập để đặt vé.</span>
            <Link to="/auth" className="primary-btn compact">
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {loggedIn && currentUser && (
          <div className="user-welcome-banner">
            <span>👋 Xin chào, <strong>{currentUser.full_name}</strong> ({currentUser.email})</span>
          </div>
        )}

        {/* Steps indicator */}
        <div className="booking-steps-wrap">
          <Steps
            current={currentStep}
            size="small"
            items={[
              { title: "Chọn rạp" },
              { title: "Chọn suất" },
              { title: "Chọn ghế" },
              { title: "Thanh toán" },
              { title: "Hoàn thành" },
            ]}
          />
        </div>

        {message && <p className="section-state warning">{message}</p>}

        {/* Ticket already booked — success state */}
        {ticketData && (
          <div className="ticket-success-section">
            <Result
              status="success"
              title="🎉 Đặt vé thành công!"
              subTitle={`Mã booking: ${ticketData.booking_code}`}
            />
            <div className="ticket-card">
              <div className="ticket-card-header">
                <span className="ticket-brand">🎬 CINEMAX</span>
                <span className="ticket-code">{ticketData.booking_code}</span>
              </div>
              <div className="ticket-card-body">
                <div className="ticket-row">
                  <span className="ticket-label">Phim</span>
                  <span className="ticket-value">{ticketData.movie_title}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Rạp</span>
                  <span className="ticket-value">{ticketData.cinema_name}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Phòng</span>
                  <span className="ticket-value">{ticketData.room_name}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Giờ chiếu</span>
                  <span className="ticket-value">
                    {new Date(ticketData.start_time).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Ghế</span>
                  <span className="ticket-value ticket-seats">
                    {(ticketData.seats || []).map((s: any) => (
                      <Tag key={s.id} color="red" style={{ fontWeight: 700 }}>
                        {s.seat_row}{s.seat_number}
                      </Tag>
                    ))}
                  </span>
                </div>
                {ticketData.foods && ticketData.foods.length > 0 && (
                  <div className="ticket-row">
                    <span className="ticket-label">Đồ ăn</span>
                    <span className="ticket-value">
                      {ticketData.foods.map((f: any) => `${f.name} (${f.size_name}) x${f.quantity}`).join(", ")}
                    </span>
                  </div>
                )}
                <div className="ticket-divider" />
                <div className="ticket-row total">
                  <span className="ticket-label">Tổng tiền</span>
                  <span className="ticket-value">{formatCurrency(ticketData.total_amount)}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">Trạng thái</span>
                  <Tag color="green" style={{ fontWeight: 700, fontSize: 13 }}>
                    ✅ {ticketData.booking_status}
                  </Tag>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="primary-btn" onClick={handleNewBooking}>
                Đặt thêm vé
              </button>
              <Link to="/bookings" className="ghost-btn compact" style={{ textDecoration: "none" }}>
                Xem lịch sử đặt vé
              </Link>
            </div>
          </div>
        )}

        {/* Booking flow — only show if no ticket yet */}
        {!ticketData && (
          <div className="booking-flow-stacked">
              {/* Step 1: Chọn rạp */}
              <div className="data-card">
                <h2>1. Chọn rạp và ngày chiếu</h2>
                <div className="booking-picker-row">
                  <Select
                    id="select-cinema"
                    showSearch
                    placeholder="-- Chọn rạp phim --"
                    style={{ width: "100%" }}
                    optionFilterProp="label"
                    options={cinemas.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.city})${cinemasWithSlots.has(c.id) ? " (còn slot)" : ""}`,
                    }))}
                    onChange={(val: number) => {
                      setSelectedCinemaId(val);
                      setSelectedShowtime(null);
                      setSelectedSeats([]);
                      setSeats([]);
                    }}
                    value={selectedCinemaId}
                  />
                  <input
                    aria-label="Chọn ngày chiếu"
                    className="booking-date-input"
                    min={next30Days[0]}
                    max={next30Days[next30Days.length - 1]}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value || next30Days[0]);
                      setSelectedShowtime(null);
                      setSelectedSeats([]);
                      setSeats([]);
                    }}
                  />
                </div>

                {/* Step 2: Tab ngày + suất chiếu */}
                {selectedCinemaId && (
                  <>
                    {loadingShowtimes ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <Spin />
                      </div>
                    ) : (
                      <>
                        <div className="date-tabs" style={{ marginTop: 20 }}>
                          {next30Days.map((day) => {
                            return (
                              <button
                                key={day}
                                id={`date-${day}`}
                                className={[
                                  "date-tab-btn",
                                  selectedDate === day ? "active" : "",
                                ].join(" ")}
                                onClick={() => setSelectedDate(day)}
                              >
                                {formatTabLabel(day)}
                              </button>
                            );
                          })}
                        </div>

                        {currentShowtimes.length === 0 ? (
                          <Empty description="Không có suất chiếu" style={{ color: "#888", marginTop: 16 }} />
                        ) : (
                          <div className="showtime-btn-grid" style={{ marginTop: 14 }}>
                            {currentShowtimes.map((st) => (
                              <button
                                id={`st-btn-${st.id}`}
                                key={st.id}
                                className={`showtime-btn ${selectedShowtime?.id === st.id ? "active" : ""}`}
                                onClick={() => handleChooseShowtime(st)}
                              >
                                <span className="showtime-btn-time">
                                  {new Date(st.start_time).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="showtime-btn-room">{st.room_name}</span>
                                <Tag
                                  style={{
                                    background: ROOM_TYPE_COLOR[st.room_type] || "#333",
                                    border: "none",
                                    color: "#fff",
                                    fontSize: 10,
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
                  </>
                )}
              </div>

              {/* Step 3: Chọn ghế */}
              <div className="data-card">
                <h2>2. Chọn ghế</h2>
                {!selectedShowtime && <p className="muted">Chọn suất chiếu để tải sơ đồ ghế.</p>}
                {selectedShowtime && seats.length === 0 && (
                  <p className="muted">Không có ghế cho suất này.</p>
                )}

                {selectedShowtime && seats.length > 0 && (
                  <>
                    {/* Screen indicator */}
                    <div className="screen-indicator">
                      <div className="screen-bar" />
                      <span>MÀN HÌNH</span>
                    </div>

                    {/* Seat grid */}
                    <div className="seat-grid">
                      {seats.map((seat) => (
                        <button
                          className={[
                            "seat-btn",
                            selectedSeats.includes(seat.id) ? "selected" : "",
                            seat.is_booked ? "booked" : "",
                            `seat-type-${(seat.seat_type || "NORMAL").toLowerCase()}`,
                          ].join(" ")}
                          key={seat.id}
                          disabled={Boolean(seat.is_booked)}
                          title={
                            seat.is_booked
                              ? "🔒 Ghế đã được đặt bởi người khác"
                              : `${formatCurrency(seat.price)} - ${seat.seat_type}`
                          }
                          onClick={() => handleToggleSeat(seat)}
                        >
                          {seat.seat_row}
                          {seat.seat_number}
                        </button>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="seat-legend">
                      <div className="legend-item">
                        <span className="legend-box available" />
                        <span>Trống ({availableCount})</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-box selected" />
                        <span>Đang chọn ({selectedSeats.length})</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-box booked" />
                        <span>Đã đặt ({bookedCount})</span>
                      </div>
                    </div>
                  </>
                )}

                {selectedSeatRows.length > 0 && (
                  <div className="selected-seats-summary">
                    <span>Đã chọn:</span>
                    {selectedSeatRows.map((s) => (
                      <Tag key={s.id} color="blue" style={{ fontWeight: 700 }}>
                        {s.seat_row}{s.seat_number} ({s.seat_type}) - {formatCurrency(s.price)}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>

              {/* Food + Promotion + Payment — stacked below */}
              <div className="checkout-section">
                <div className="checkout-row">
                  {/* Food */}
                  <div className="data-card">
                    <h2>3. Đồ ăn (tuỳ chọn)</h2>
                    <select value={selectedFoodSizeId} onChange={(e) => setSelectedFoodSizeId(e.target.value)}>
                      <option value="">Không chọn</option>
                      {foodSizes.map((size) => (
                        <option key={size.id} value={size.id}>
                          {size.food_name} size {size.size_name} - {formatCurrency(size.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Promotion */}
                  <div className="data-card">
                    <h2>Mã khuyến mãi</h2>
                    <div className="inline-form">
                      <input placeholder="Nhập mã: SALE10" value={promotionCode} onChange={(e) => setPromotionCode(e.target.value)} />
                      <button onClick={handleApplyPromotion}>Áp dụng</button>
                    </div>
                  </div>
                </div>

                {/* Payment summary */}
                <div className="data-card payment-summary-card">
                  <h2>4. Thanh toán</h2>
                  <div className="payment-line">
                    <span>Ghế ({selectedSeats.length})</span>
                    <span>{formatCurrency(selectedSeatRows.reduce((s, seat) => s + Number(seat.price || 0), 0))}</span>
                  </div>
                  {selectedFood && (
                    <div className="payment-line">
                      <span>{selectedFood.food_name} ({selectedFood.size_name})</span>
                      <span>{formatCurrency(selectedFood.price)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="payment-line discount">
                      <span>Giảm giá</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="payment-divider" />
                  <div className="payment-line total">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(finalAmount)}</span>
                  </div>

                  <button
                    className="primary-btn form-submit pay-btn"
                    onClick={handlePayAndBook}
                    disabled={!loggedIn || !selectedShowtime || selectedSeats.length === 0 || bookingLoading}
                    style={{ width: "100%", marginTop: 16 }}
                  >
                    {bookingLoading ? (
                      <>⏳ Đang xử lý...</>
                    ) : !loggedIn ? (
                      <>🔐 Đăng nhập để thanh toán</>
                    ) : (
                      <>🎟 Thanh toán & Đặt vé</>
                    )}
                  </button>
                  <p className="muted" style={{ textAlign: "center", marginTop: 8, fontSize: 12 }}>
                    Demo mode — Bấm nút là thanh toán thành công
                  </p>
                </div>
              </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MovieDetailPage;
