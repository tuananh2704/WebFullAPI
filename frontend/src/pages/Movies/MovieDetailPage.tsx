import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { login, register } from "../../services/authService";
import { createBooking } from "../../services/bookingService";
import { getFoodSizes, getFoods } from "../../services/foodService";
import { getMovies } from "../../services/movieService";
import { createPayment } from "../../services/paymentService";
import { applyPromotion } from "../../services/promotionService";
import { getSeatsByShowtime } from "../../services/seatService";
import { getShowtimesByMovie } from "../../services/showtimeService";
import type { ApiFood, ApiFoodSize, ApiMovie, ApiSeat, ApiShowtime, ApiUser } from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

const MovieDetailPage = () => {
  const { id } = useParams();
  const movieId = Number(id);
  const [movie, setMovie] = useState<ApiMovie | null>(null);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<ApiShowtime | null>(null);
  const [seats, setSeats] = useState<ApiSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [foods, setFoods] = useState<ApiFood[]>([]);
  const [foodSizes, setFoodSizes] = useState<ApiFoodSize[]>([]);
  const [selectedFoodSizeId, setSelectedFoodSizeId] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    full_name: "",
    phone: "",
    email: "a@gmail.com",
    password: "123456",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [moviesData, showtimeData, foodData, sizeData] = await Promise.all([
          getMovies({ page: 1, limit: 50 }),
          getShowtimesByMovie(movieId),
          getFoods(),
          getFoodSizes(),
        ]);

        setMovie(moviesData.items.find((item) => item.id === movieId) || null);
        setShowtimes(showtimeData);
        setFoods(foodData);
        setFoodSizes(sizeData);
      } catch (error: any) {
        setMessage(error.response?.data?.message || "Không tải được chi tiết phim.");
      }
    };

    load();
  }, [movieId]);

  const selectedSeatRows = seats.filter((seat) => selectedSeats.includes(seat.id));
  const selectedFood = foodSizes.find((item) => String(item.id) === selectedFoodSizeId);
  const hasToken = Boolean(localStorage.getItem("accessToken"));

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
      current.includes(seat.id) ? current.filter((seatId) => seatId !== seat.id) : [...current, seat.id]
    );
  };

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    try {
      const data =
        authMode === "login"
          ? await login({ email: authForm.email, password: authForm.password })
          : await register(authForm);

      setCurrentUser(data.user);
      setMessage("Đăng nhập thành công. Bạn có thể tạo booking.");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Đăng nhập/đăng ký thất bại.");
    }
  };

  const handleApplyPromotion = async () => {
    try {
      const data: any = await applyPromotion({ code: promotionCode, total_amount: totalBeforeDiscount });
      setDiscount(Number(data.discount_amount || 0));
      setMessage("Áp dụng mã khuyến mãi thành công.");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Mã khuyến mãi không hợp lệ.");
    }
  };

  const handleCreateBooking = async () => {
    if (!hasToken) {
      setMessage("Bạn cần đăng nhập trước khi tạo booking.");
      return;
    }

    if (!selectedShowtime || selectedSeats.length === 0) {
      setMessage("Chọn suất chiếu và ghế trước khi đặt vé.");
      return;
    }

    try {
      const foodPayload = selectedFood
        ? [{ food_id: selectedFood.food_id, size_name: selectedFood.size_name, quantity: 1 }]
        : [];
      const booking: any = await createBooking({
        showtime_id: selectedShowtime.id,
        seat_ids: selectedSeats,
        foods: foodPayload,
      });

      await createPayment({ booking_id: booking.id, payment_method: "MOMO", amount: finalAmount });
      setMessage(`Đặt vé và thanh toán thành công. Mã booking: ${booking.booking_code}`);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tạo được booking.");
    }
  };

  return (
    <section className="app-page">
      <div className="container">
        <p className="eyebrow">Booking Flow</p>
        <h1>{movie?.title || "Chi tiết phim"}</h1>
        <p className="muted">{movie?.description}</p>

        {message && <p className="section-state warning">{message}</p>}

        <div className="workspace-grid">
          <div className="data-card">
            <h2>Suất chiếu</h2>
            <div className="stack">
              {showtimes.map((showtime) => (
                <button
                  className={selectedShowtime?.id === showtime.id ? "select-row active" : "select-row"}
                  key={showtime.id}
                  onClick={() => handleChooseShowtime(showtime)}
                >
                  {formatDateTime(showtime.start_time)} - {showtime.cinema_name} - {showtime.room_name}
                </button>
              ))}
            </div>
          </div>

          <div className="data-card">
            <h2>Ghế</h2>
            {!selectedShowtime && <p className="muted">Chọn suất chiếu để tải ghế.</p>}
            {selectedShowtime && seats.length === 0 && <p className="muted">Không có ghế cho suất này.</p>}
            <div className="seat-grid">
              {seats.map((seat) => (
                <button
                  className={[
                    "seat-btn",
                    selectedSeats.includes(seat.id) ? "selected" : "",
                    seat.is_booked ? "disabled" : "",
                  ].join(" ")}
                  key={seat.id}
                  disabled={Boolean(seat.is_booked)}
                  title={seat.is_booked ? "Ghế đã được đặt" : `${formatCurrency(seat.price)} - ${seat.seat_type}`}
                  onClick={() => handleToggleSeat(seat)}
                >
                  {seat.seat_row}
                  {seat.seat_number}
                </button>
              ))}
            </div>
            <p className="muted">Đã chọn: {selectedSeatRows.length} ghế</p>
          </div>

          <div className="data-card">
            <h2>Đồ ăn</h2>
            <select value={selectedFoodSizeId} onChange={(e) => setSelectedFoodSizeId(e.target.value)}>
              <option value="">Không chọn</option>
              {foodSizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.food_name} size {size.size_name} - {formatCurrency(size.price)}
                </option>
              ))}
            </select>
            <p className="muted">Foods loaded: {foods.length}</p>
          </div>

          <div className="data-card">
            <h2>Đăng nhập</h2>
            {hasToken ? (
              <p className="muted">Đã có token đăng nhập{currentUser ? `: ${currentUser.email}` : ""}.</p>
            ) : (
              <form className="stack" onSubmit={handleAuthSubmit}>
                <div className="segmented">
                  <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>
                    Login
                  </button>
                  <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>
                    Register
                  </button>
                </div>
                {authMode === "register" && (
                  <>
                    <input placeholder="Họ tên" value={authForm.full_name} onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })} />
                    <input placeholder="Số điện thoại" value={authForm.phone} onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} />
                  </>
                )}
                <input placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
                <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
                <button className="ghost-btn compact" type="submit">
                  {authMode === "login" ? "Đăng nhập" : "Đăng ký"}
                </button>
              </form>
            )}
          </div>

          <div className="data-card">
            <h2>Thanh toán</h2>
            <div className="inline-form">
              <input placeholder="SALE10" value={promotionCode} onChange={(e) => setPromotionCode(e.target.value)} />
              <button onClick={handleApplyPromotion}>Áp dụng</button>
            </div>
            <p>Tạm tính: {formatCurrency(totalBeforeDiscount)}</p>
            <p>Giảm: {formatCurrency(discount)}</p>
            <h3>Tổng: {formatCurrency(finalAmount)}</h3>
            <button className="primary-btn form-submit" onClick={handleCreateBooking}>
              Tạo booking + payment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MovieDetailPage;
