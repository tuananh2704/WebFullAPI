import { useEffect, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Clapperboard,
  MapPin,
  ReceiptText,
  Sofa,
} from "lucide-react";
import { getBookingDetail, getBookingHistory } from "../../services/bookingService";
import { createMovieRating, getCanRateMovie } from "../../services/movieService";
import type { ApiBookingSummary, ApiCanRateMovie } from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

const statusLabels: Record<string, string> = {
  PENDING: "⏳ Chờ duyệt",
  CONFIRMED: "✅ Đã duyệt",
  CANCELLED: "❌ Đã hủy",
};

const BookingHistoryPage = () => {
  const [bookings, setBookings] = useState<ApiBookingSummary[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [canRateMovie, setCanRateMovie] = useState<ApiCanRateMovie | null>(null);
  const [ratingValue, setRatingValue] = useState(10);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  const handleViewDetail = async (id: number) => {
    try {
      setSelectedId(id);
      setLoadingDetail(true);
      setCanRateMovie(null);
      const bookingDetail = await getBookingDetail(id);
      setDetail(bookingDetail);
      if (bookingDetail.movie_id) {
        getCanRateMovie(Number(bookingDetail.movie_id))
          .then(setCanRateMovie)
          .catch(() => {
            setCanRateMovie({
              canRate: false,
              reason: "Bạn có thể đánh giá sau khi xem phim.",
            });
          });
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tải được chi tiết booking.");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    getBookingHistory()
      .then((data) => {
        setBookings(data);
        if (data[0]) {
          handleViewDetail(data[0].id);
        }
      })
      .catch(() => setMessage("Bạn cần đăng nhập để xem lịch sử đặt vé."));
  }, []);

  const totalTickets = bookings.length;
  const confirmedTickets = bookings.filter((booking) => booking.booking_status === "CONFIRMED").length;
  const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0);
  const detailPayments = detail?.payments || [];
  const detailPaymentSuccess =
    detailPayments.length === 0 ||
    detailPayments.some((payment: any) => payment.payment_status === "SUCCESS");
  const detailEnded = detail?.end_time ? new Date(detail.end_time).getTime() < Date.now() : false;
  const showBookingRating =
    Boolean(detail?.movie_id) &&
    detail?.booking_status === "CONFIRMED" &&
    detailPaymentSuccess &&
    detailEnded;

  const handleSubmitBookingRating = async () => {
    if (!detail?.movie_id || !detail?.id) return;

    setRatingLoading(true);
    setMessage("");
    try {
      await createMovieRating(Number(detail.movie_id), {
        bookingId: Number(detail.id),
        rating: ratingValue,
        comment: ratingComment,
      });
      setRatingComment("");
      setCanRateMovie({
        canRate: false,
        reason: "Bạn đã đánh giá phim này.",
      });
      setMessage("Đánh giá thành công! Bạn được cộng 1 điểm VIP.");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không gửi được đánh giá.");
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <section className="app-page">
      <div className="container">
        <div className="booking-history-hero">
          <div>
            <p className="eyebrow">Bookings</p>
            <h1>Lịch sử đặt vé</h1>
            <p className="muted">
              Theo dõi vé đã mua, ghế ngồi, đồ ăn kèm và trạng thái thanh toán.
            </p>
          </div>
          <div className="booking-history-stats">
            <div>
              <span>{totalTickets}</span>
              <small>Lượt đặt</small>
            </div>
            <div>
              <span>{confirmedTickets}</span>
              <small>Đã xác nhận</small>
            </div>
            <div>
              <span>{formatCurrency(totalSpent)}</span>
              <small>Tổng chi</small>
            </div>
          </div>
        </div>

        {message && <p className="section-state warning">{message}</p>}

        <div className="booking-history-layout">
          <div className="booking-history-list">
            {bookings.length === 0 && !message && (
              <div className="booking-empty">
                <ReceiptText size={36} />
                <h2>Chưa có vé nào</h2>
                <p className="muted">Các vé bạn đặt sẽ xuất hiện tại đây.</p>
              </div>
            )}

            {bookings.map((booking) => (
              <button
                className={`booking-history-card ${selectedId === booking.id ? "active" : ""}`}
                key={booking.id}
                onClick={() => handleViewDetail(booking.id)}
                type="button"
              >
                <div className="booking-history-poster">
                  {booking.poster_url ? (
                    <img src={booking.poster_url} alt={booking.movie_title} />
                  ) : (
                    <Clapperboard size={34} />
                  )}
                </div>
                <div className="booking-history-card-body">
                  <div className="booking-history-card-top">
                    <span className="booking-code">{booking.booking_code}</span>
                    <span className={`booking-status ${booking.booking_status.toLowerCase()}`}>
                      {statusLabels[booking.booking_status] || booking.booking_status}
                    </span>
                  </div>
                  <h2>{booking.movie_title}</h2>
                  <div className="booking-history-meta">
                    <span>
                      <CalendarDays size={16} />
                      {formatDateTime(booking.start_time)}
                    </span>
                    <strong>{formatCurrency(booking.total_amount)}</strong>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <aside className="booking-detail-panel">
            <div className="booking-detail-header">
              <span className="booking-detail-kicker">Chi tiết vé</span>
              {detail && (
                <span className={`booking-status ${detail.booking_status?.toLowerCase()}`}>
                  {statusLabels[detail.booking_status] || detail.booking_status}
                </span>
              )}
            </div>

            {loadingDetail && <p className="section-state">Đang tải chi tiết vé...</p>}

            {!loadingDetail && !detail && (
              <div className="booking-empty compact-empty">
                <ReceiptText size={32} />
                <p>Chọn một vé để xem chi tiết.</p>
              </div>
            )}

            {!loadingDetail && detail && (
              <>
                <div className="booking-detail-title">
                  <span className="booking-code">{detail.booking_code}</span>
                  <h2>{detail.movie_title}</h2>
                </div>

                <div className="booking-detail-grid">
                  <div>
                    <CalendarDays size={18} />
                    <span>Giờ chiếu</span>
                    <strong>{formatDateTime(detail.start_time)}</strong>
                  </div>
                  <div>
                    <MapPin size={18} />
                    <span>Rạp</span>
                    <strong>{detail.cinema_name}</strong>
                  </div>
                  <div>
                    <Clapperboard size={18} />
                    <span>Phòng</span>
                    <strong>{detail.room_name}</strong>
                  </div>
                  <div>
                    <CircleDollarSign size={18} />
                    <span>Tổng tiền</span>
                    <strong>{formatCurrency(detail.total_amount)}</strong>
                  </div>
                  {detail.membership_discount > 0 && (
                    <div>
                      <CircleDollarSign size={18} />
                      <span>Giảm giá VIP</span>
                      <strong style={{ color: "#66bb6a" }}>
                        -{formatCurrency(detail.membership_discount)}
                      </strong>
                    </div>
                  )}
                  {detail.points_earned > 0 && (
                    <div>
                      <CircleDollarSign size={18} />
                      <span>Điểm tích lũy</span>
                      <strong style={{ color: "#ffd60a" }}>
                        +{detail.points_earned} điểm
                      </strong>
                    </div>
                  )}
                </div>

                <div className="booking-detail-section">
                  <h3>
                    <Sofa size={18} />
                    Ghế đã đặt
                  </h3>
                  <div className="booking-seat-list">
                    {detail.seats?.map((seat: any) => (
                      <span key={seat.id}>
                        {seat.seat_row}
                        {seat.seat_number}
                        <small>{seat.seat_type}</small>
                      </span>
                    ))}
                  </div>
                </div>

                {detail.foods?.length > 0 && (
                  <div className="booking-detail-section">
                    <h3>
                      <ReceiptText size={18} />
                      Đồ ăn kèm
                    </h3>
                    <div className="booking-food-list">
                      {detail.foods.map((food: any) => (
                        <div key={`${food.id}-${food.size_name}`}>
                          <span>
                            {food.name} size {food.size_name}
                          </span>
                          <strong>x{food.quantity}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.payments?.length > 0 && (
                  <div className="booking-detail-section">
                    <h3>
                      <CircleDollarSign size={18} />
                      Thanh toán
                    </h3>
                    <div className="booking-payment-list">
                      {detail.payments.map((payment: any) => (
                        <div key={payment.id}>
                          <span>{payment.payment_method}</span>
                          <strong>
                            {payment.payment_status} - {formatCurrency(payment.amount)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showBookingRating && (
                  <div className="booking-detail-section booking-rating-section">
                    <h3>
                      <Clapperboard size={18} />
                      Đánh giá phim
                    </h3>
                    {canRateMovie?.canRate ? (
                      <div className="booking-rating-form">
                        <label>
                          Điểm
                          <select
                            value={ratingValue}
                            onChange={(event) => setRatingValue(Number(event.target.value))}
                          >
                            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Nhận xét
                          <textarea
                            rows={3}
                            placeholder="Bạn thấy phim này thế nào?"
                            value={ratingComment}
                            onChange={(event) => setRatingComment(event.target.value)}
                          />
                        </label>
                        <button
                          className="primary-btn booking-rating-submit"
                          disabled={ratingLoading}
                          onClick={handleSubmitBookingRating}
                          type="button"
                        >
                          {ratingLoading ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                      </div>
                    ) : (
                      <p className="movie-rating-note">
                        {canRateMovie?.reason || "Bạn có thể đánh giá sau khi xem phim."}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
};

export default BookingHistoryPage;
