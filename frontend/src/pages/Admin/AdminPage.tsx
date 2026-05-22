import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  CreditCard,
  Edit3,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import {
  createAdminMovie,
  createAdminShowtime,
  deleteAdminMovie,
  deleteAdminShowtime,
  getAdminBookings,
  getDashboardStats,
  updateAdminBookingStatus,
  updateAdminMovie,
  updateAdminShowtime,
} from "../../services/adminService";
import type { AdminBooking } from "../../services/adminService";
import { getMovies } from "../../services/movieService";
import { getShowtimes } from "../../services/showtimeService";
import type { ApiMovie, ApiShowtime } from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

type AdminTab = "overview" | "movies" | "showtimes" | "bookings";

const emptyMovieForm = {
  id: "",
  title: "",
  description: "",
  duration: "",
  release_date: "",
  poster_url: "",
  trailer_url: "",
  language: "Vietnamese",
  rating: "8.0",
  status: "NOW_SHOWING",
};

const emptyShowtimeForm = {
  id: "",
  movie_id: "",
  room_id: "",
  start_time: "",
  end_time: "",
  status: "OPEN",
};

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [movieForm, setMovieForm] = useState(emptyMovieForm);
  const [showtimeForm, setShowtimeForm] = useState(emptyShowtimeForm);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsData, movieData, showtimeData, bookingData] = await Promise.all([
        getDashboardStats(),
        getMovies({ page: 1, limit: 50 }),
        getShowtimes(),
        getAdminBookings(),
      ]);

      setStats(statsData);
      setMovies(movieData.items);
      setShowtimes(showtimeData);
      setBookings(bookingData);
      setMessage("");
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Không tải được dữ liệu quản trị. Vui lòng đăng nhập bằng tài khoản ADMIN/EMPLOYEE."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const maxMonthlyRevenue = useMemo(() => {
    const values = stats?.monthly_revenue?.map((item: any) => Number(item.revenue)) || [0];
    return Math.max(...values, 1);
  }, [stats]);

  const handleSubmitMovie = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        title: movieForm.title,
        description: movieForm.description,
        duration: Number(movieForm.duration),
        release_date: movieForm.release_date,
        poster_url: movieForm.poster_url,
        trailer_url: movieForm.trailer_url,
        language: movieForm.language,
        rating: Number(movieForm.rating),
        status: movieForm.status as ApiMovie["status"],
      };

      if (movieForm.id) {
        await updateAdminMovie(Number(movieForm.id), payload);
        setMessage("Đã cập nhật phim.");
      } else {
        await createAdminMovie(payload);
        setMessage("Đã thêm phim mới.");
      }

      setMovieForm(emptyMovieForm);
      await loadAdminData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không lưu được phim.");
    }
  };

  const handleSubmitShowtime = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        movie_id: Number(showtimeForm.movie_id),
        room_id: Number(showtimeForm.room_id),
        start_time: showtimeForm.start_time,
        end_time: showtimeForm.end_time,
        status: showtimeForm.status,
      };

      if (showtimeForm.id) {
        await updateAdminShowtime(Number(showtimeForm.id), payload);
        setMessage("Đã cập nhật suất chiếu.");
      } else {
        await createAdminShowtime(payload);
        setMessage("Đã thêm suất chiếu mới.");
      }

      setShowtimeForm(emptyShowtimeForm);
      await loadAdminData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không lưu được suất chiếu.");
    }
  };

  const handleBookingStatus = async (bookingId: number, status: AdminBooking["booking_status"]) => {
    try {
      await updateAdminBookingStatus(bookingId, status);
      setMessage(status === "CONFIRMED" ? "Đã xác nhận đơn hàng." : "Đã cập nhật trạng thái đơn hàng.");
      await loadAdminData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không cập nhật được đơn hàng.");
    }
  };

  const editMovie = (movie: ApiMovie) => {
    setMovieForm({
      id: String(movie.id),
      title: movie.title,
      description: movie.description || "",
      duration: String(movie.duration || ""),
      release_date: movie.release_date?.slice(0, 10) || "",
      poster_url: movie.poster_url || "",
      trailer_url: movie.trailer_url || "",
      language: movie.language || "Vietnamese",
      rating: String(movie.rating || "8.0"),
      status: movie.status,
    });
    setActiveTab("movies");
  };

  const editShowtime = (showtime: ApiShowtime) => {
    setShowtimeForm({
      id: String(showtime.id),
      movie_id: String(showtime.movie_id),
      room_id: String(showtime.room_id),
      start_time: showtime.start_time.slice(0, 16),
      end_time: showtime.end_time.slice(0, 16),
      status: showtime.status,
    });
    setActiveTab("showtimes");
  };

  return (
    <section className="app-page admin-page">
      <div className="container">
        <div className="admin-hero">
          <div>
            <p className="eyebrow">Admin Console</p>
            <h1>Quản trị ứng dụng xem phim</h1>
            <p className="muted">
              Theo dõi doanh thu, đơn hàng, phim, suất chiếu và xử lý xác nhận đặt vé.
            </p>
          </div>
          <button className="secondary-btn compact admin-refresh" onClick={loadAdminData} disabled={isLoading}>
            <RefreshCw size={18} />
            Tải lại
          </button>
        </div>

        {message && <p className="section-state warning">{message}</p>}

        <div className="admin-tabs">
          <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
            <BarChart3 size={18} /> Tổng quan
          </button>
          <button className={activeTab === "movies" ? "active" : ""} onClick={() => setActiveTab("movies")}>
            <Clapperboard size={18} /> Phim
          </button>
          <button className={activeTab === "showtimes" ? "active" : ""} onClick={() => setActiveTab("showtimes")}>
            <CalendarClock size={18} /> Suất chiếu
          </button>
          <button className={activeTab === "bookings" ? "active" : ""} onClick={() => setActiveTab("bookings")}>
            <CreditCard size={18} /> Đơn hàng
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="stats-grid admin-stats">
              <div className="data-card admin-stat-card">
                <Clapperboard size={22} />
                <h2>{stats?.total_movies || 0}</h2>
                <p>Phim</p>
              </div>
              <div className="data-card admin-stat-card">
                <CreditCard size={22} />
                <h2>{stats?.total_bookings || 0}</h2>
                <p>Đơn hàng</p>
              </div>
              <div className="data-card admin-stat-card">
                <Users size={22} />
                <h2>{stats?.total_users || 0}</h2>
                <p>Người dùng</p>
              </div>
              <div className="data-card admin-stat-card">
                <BarChart3 size={22} />
                <h2>{formatCurrency(stats?.total_revenue || 0)}</h2>
                <p>Doanh thu</p>
              </div>
            </div>

            <div className="admin-dashboard-grid">
              <div className="data-card admin-chart-card">
                <h2>Doanh thu theo tháng</h2>
                <div className="revenue-chart">
                  {(stats?.monthly_revenue || []).map((item: any) => (
                    <div className="revenue-bar-item" key={item.month}>
                      <div className="revenue-bar-track">
                        <span style={{ height: `${Math.max((Number(item.revenue) / maxMonthlyRevenue) * 100, 6)}%` }} />
                      </div>
                      <small>{item.month}</small>
                      <strong>{formatCurrency(item.revenue)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="data-card admin-chart-card">
                <h2>Hiệu suất đặt vé</h2>
                <div className="status-stack">
                  {(stats?.booking_status || []).map((item: any) => {
                    const total = Number(stats?.total_bookings || 1);
                    const percent = Math.round((Number(item.total) / total) * 100);
                    return (
                      <div className="status-meter" key={item.status}>
                        <div>
                          <span>{item.status}</span>
                          <strong>{item.total} đơn</strong>
                        </div>
                        <div className="status-track">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="data-card admin-chart-card">
                <h2>Top phim theo đơn hàng</h2>
                <div className="stack">
                  {(stats?.top_movies || []).map((movie: any, index: number) => (
                    <div className="rank-row" key={movie.id}>
                      <span>{index + 1}</span>
                      <strong>{movie.title}</strong>
                      <em>{movie.total_bookings} đơn</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "movies" && (
          <div className="admin-workspace">
            <form className="form-panel admin-form" onSubmit={handleSubmitMovie}>
              <h2>{movieForm.id ? "Sửa phim" : "Thêm phim"}</h2>
              <input required placeholder="Tên phim" value={movieForm.title} onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })} />
              <input placeholder="Mô tả" value={movieForm.description} onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })} />
              <input required type="number" min="1" placeholder="Thời lượng (phút)" value={movieForm.duration} onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })} />
              <input type="date" value={movieForm.release_date} onChange={(e) => setMovieForm({ ...movieForm, release_date: e.target.value })} />
              <input placeholder="Poster URL" value={movieForm.poster_url} onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })} />
              <input placeholder="Trailer URL" value={movieForm.trailer_url} onChange={(e) => setMovieForm({ ...movieForm, trailer_url: e.target.value })} />
              <input placeholder="Ngôn ngữ" value={movieForm.language} onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })} />
              <input type="number" min="0" max="10" step="0.1" placeholder="Đánh giá" value={movieForm.rating} onChange={(e) => setMovieForm({ ...movieForm, rating: e.target.value })} />
              <select value={movieForm.status} onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })}>
                <option value="NOW_SHOWING">Đang chiếu</option>
                <option value="COMING_SOON">Sắp chiếu</option>
                <option value="ENDED">Ngừng chiếu</option>
              </select>
              <button className="primary-btn form-submit">
                <Plus size={18} />
                Lưu phim
              </button>
            </form>

            <div className="data-card admin-table-card">
              <h2>Danh sách phim</h2>
              <div className="admin-table">
                {movies.map((movie) => (
                  <div className="admin-table-row movie-admin-row" key={movie.id}>
                    <strong>{movie.title}</strong>
                    <span>{movie.status}</span>
                    <span>{movie.duration || 0} phút</span>
                    <button title="Sửa phim" onClick={() => editMovie(movie)}><Edit3 size={16} /></button>
                    <button title="Xóa phim" onClick={async () => { await deleteAdminMovie(movie.id); await loadAdminData(); }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "showtimes" && (
          <div className="admin-workspace">
            <form className="form-panel admin-form" onSubmit={handleSubmitShowtime}>
              <h2>{showtimeForm.id ? "Sửa suất chiếu" : "Thêm suất chiếu"}</h2>
              <select required value={showtimeForm.movie_id} onChange={(e) => setShowtimeForm({ ...showtimeForm, movie_id: e.target.value })}>
                <option value="">Chọn phim</option>
                {movies.map((movie) => (
                  <option value={movie.id} key={movie.id}>{movie.title}</option>
                ))}
              </select>
              <input required type="number" min="1" placeholder="Room ID" value={showtimeForm.room_id} onChange={(e) => setShowtimeForm({ ...showtimeForm, room_id: e.target.value })} />
              <input required type="datetime-local" value={showtimeForm.start_time} onChange={(e) => setShowtimeForm({ ...showtimeForm, start_time: e.target.value })} />
              <input required type="datetime-local" value={showtimeForm.end_time} onChange={(e) => setShowtimeForm({ ...showtimeForm, end_time: e.target.value })} />
              <select value={showtimeForm.status} onChange={(e) => setShowtimeForm({ ...showtimeForm, status: e.target.value })}>
                <option value="OPEN">Mở bán</option>
                <option value="FULL">Đã đầy</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
              <button className="primary-btn form-submit">
                <Plus size={18} />
                Lưu suất chiếu
              </button>
            </form>

            <div className="data-card admin-table-card">
              <h2>Danh sách suất chiếu</h2>
              <div className="admin-table">
                {showtimes.map((showtime) => (
                  <div className="admin-table-row showtime-admin-row" key={showtime.id}>
                    <strong>{showtime.movie_title}</strong>
                    <span>{showtime.cinema_name} - {showtime.room_name}</span>
                    <span>{formatDateTime(showtime.start_time)}</span>
                    <span>{showtime.status}</span>
                    <button title="Sửa suất chiếu" onClick={() => editShowtime(showtime)}><Edit3 size={16} /></button>
                    <button title="Xóa suất chiếu" onClick={async () => { await deleteAdminShowtime(showtime.id); await loadAdminData(); }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="data-card admin-table-card">
            <h2>Xác nhận đơn hàng</h2>
            <div className="admin-table">
              {bookings.map((booking) => (
                <div className="admin-table-row booking-admin-row" key={booking.id}>
                  <strong>{booking.booking_code}</strong>
                  <span>{booking.customer_name || booking.customer_email || "Khách hàng"}</span>
                  <span>{booking.movie_title}</span>
                  <span>{formatDateTime(booking.start_time)}</span>
                  <span>{formatCurrency(booking.total_amount)}</span>
                  <span className={`admin-status-pill ${booking.booking_status.toLowerCase()}`}>{booking.booking_status}</span>
                  <button title="Xác nhận đơn" disabled={booking.booking_status === "CONFIRMED"} onClick={() => handleBookingStatus(booking.id, "CONFIRMED")}>
                    <CheckCircle2 size={16} />
                  </button>
                  <button title="Hủy đơn" disabled={booking.booking_status === "CANCELLED"} onClick={() => handleBookingStatus(booking.id, "CANCELLED")}>
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminPage;
