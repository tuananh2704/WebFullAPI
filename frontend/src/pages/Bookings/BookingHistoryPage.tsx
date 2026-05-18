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
import type { ApiBookingSummary } from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

const statusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};

const BookingHistoryPage = () => {
  const [bookings, setBookings] = useState<ApiBookingSummary[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleViewDetail = async (id: number) => {
    try {
      setSelectedId(id);
      setLoadingDetail(true);
      setDetail(await getBookingDetail(id));
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
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
};

export default BookingHistoryPage;
