import { useEffect, useState } from "react";
import { getBookingDetail, getBookingHistory } from "../../services/bookingService";
import type { ApiBookingSummary } from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

const BookingHistoryPage = () => {
  const [bookings, setBookings] = useState<ApiBookingSummary[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getBookingHistory()
      .then(setBookings)
      .catch(() => setMessage("Bạn cần đăng nhập để xem lịch sử booking."));
  }, []);

  const handleViewDetail = async (id: number) => {
    try {
      setDetail(await getBookingDetail(id));
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tải được booking detail.");
    }
  };

  return (
    <section className="app-page">
      <div className="container">
        <p className="eyebrow">Bookings</p>
        <h1>Lịch sử đặt vé</h1>
        {message && <p className="section-state warning">{message}</p>}
        <div className="workspace-grid">
          <div className="data-card">
            <h2>Danh sách</h2>
            <div className="stack">
              {bookings.map((booking) => (
                <button className="select-row" key={booking.id} onClick={() => handleViewDetail(booking.id)}>
                  {booking.booking_code} - {booking.movie_title} - {formatCurrency(booking.total_amount)}
                </button>
              ))}
            </div>
          </div>
          <div className="data-card">
            <h2>Chi tiết</h2>
            {detail && (
              <>
                <p>Mã: {detail.booking_code}</p>
                <p>Phim: {detail.movie_title}</p>
                <p>Giờ: {formatDateTime(detail.start_time)}</p>
                <p>Rạp: {detail.cinema_name} - {detail.room_name}</p>
                <p>Tổng: {formatCurrency(detail.total_amount)}</p>
                <div className="genre-list">
                  {detail.seats?.map((seat: any) => (
                    <span key={seat.id}>{seat.seat_row}{seat.seat_number}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingHistoryPage;
