import { FormEvent, useEffect, useState } from "react";
import {
  createAdminMovie,
  createAdminShowtime,
  deleteAdminMovie,
  deleteAdminShowtime,
  getDashboardStats,
  updateAdminMovie,
  updateAdminShowtime,
} from "../../services/adminService";
import { getMovies } from "../../services/movieService";
import { getShowtimes } from "../../services/showtimeService";
import type { ApiMovie, ApiShowtime } from "../../types/api";
import { formatCurrency, formatDateTime } from "../../utils/format";

const AdminPage = () => {
  const [stats, setStats] = useState<any>(null);
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [message, setMessage] = useState("");
  const [movieForm, setMovieForm] = useState({
    id: "",
    title: "",
    description: "",
    duration: "",
    release_date: "",
    poster_url: "",
    language: "English",
    rating: "8.0",
    status: "NOW_SHOWING",
  });
  const [showtimeForm, setShowtimeForm] = useState({
    id: "",
    movie_id: "",
    room_id: "",
    start_time: "",
    end_time: "",
    status: "OPEN",
  });

  const loadAdminData = async () => {
    try {
      const [statsData, movieData, showtimeData] = await Promise.all([
        getDashboardStats(),
        getMovies({ page: 1, limit: 50 }),
        getShowtimes(),
      ]);

      setStats(statsData);
      setMovies(movieData.items);
      setShowtimes(showtimeData);
      setMessage("");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tải được admin data. Đăng nhập ADMIN/EMPLOYEE trước.");
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleSubmitMovie = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        title: movieForm.title,
        description: movieForm.description,
        duration: Number(movieForm.duration),
        release_date: movieForm.release_date,
        poster_url: movieForm.poster_url,
        language: movieForm.language,
        rating: Number(movieForm.rating),
        status: movieForm.status as ApiMovie["status"],
      };

      if (movieForm.id) {
        await updateAdminMovie(Number(movieForm.id), payload);
      } else {
        await createAdminMovie(payload);
      }

      setMovieForm({ ...movieForm, id: "", title: "", description: "" });
      await loadAdminData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không lưu được movie.");
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
      } else {
        await createAdminShowtime(payload);
      }

      setShowtimeForm({ ...showtimeForm, id: "" });
      await loadAdminData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không lưu được showtime.");
    }
  };

  return (
    <section className="app-page">
      <div className="container">
        <p className="eyebrow">Admin</p>
        <h1>Quản trị hệ thống</h1>
        {message && <p className="section-state warning">{message}</p>}

        <div className="stats-grid">
          <div className="data-card"><h2>{stats?.total_movies || 0}</h2><p>Movies</p></div>
          <div className="data-card"><h2>{stats?.total_bookings || 0}</h2><p>Bookings</p></div>
          <div className="data-card"><h2>{stats?.total_users || 0}</h2><p>Users</p></div>
          <div className="data-card"><h2>{formatCurrency(stats?.total_revenue || 0)}</h2><p>Revenue</p></div>
        </div>

        <div className="workspace-grid">
          <form className="form-panel" onSubmit={handleSubmitMovie}>
            <h2>{movieForm.id ? "Sửa phim" : "Thêm phim"}</h2>
            <input placeholder="Title" value={movieForm.title} onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })} />
            <input placeholder="Description" value={movieForm.description} onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })} />
            <input placeholder="Duration" value={movieForm.duration} onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })} />
            <input type="date" value={movieForm.release_date} onChange={(e) => setMovieForm({ ...movieForm, release_date: e.target.value })} />
            <input placeholder="Poster URL" value={movieForm.poster_url} onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })} />
            <input placeholder="Language" value={movieForm.language} onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })} />
            <input placeholder="Rating" value={movieForm.rating} onChange={(e) => setMovieForm({ ...movieForm, rating: e.target.value })} />
            <select value={movieForm.status} onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })}>
              <option value="NOW_SHOWING">NOW_SHOWING</option>
              <option value="COMING_SOON">COMING_SOON</option>
              <option value="ENDED">ENDED</option>
            </select>
            <button className="primary-btn form-submit">Lưu phim</button>
          </form>

          <div className="data-card">
            <h2>Movies</h2>
            <div className="stack">
              {movies.map((movie) => (
                <div className="manage-row" key={movie.id}>
                  <span>{movie.title}</span>
                  <button onClick={() => setMovieForm({
                    id: String(movie.id),
                    title: movie.title,
                    description: movie.description || "",
                    duration: String(movie.duration || ""),
                    release_date: movie.release_date?.slice(0, 10) || "",
                    poster_url: movie.poster_url || "",
                    language: movie.language || "",
                    rating: String(movie.rating || ""),
                    status: movie.status,
                  })}>Sửa</button>
                  <button onClick={async () => { await deleteAdminMovie(movie.id); await loadAdminData(); }}>Xóa</button>
                </div>
              ))}
            </div>
          </div>

          <form className="form-panel" onSubmit={handleSubmitShowtime}>
            <h2>{showtimeForm.id ? "Sửa suất chiếu" : "Thêm suất chiếu"}</h2>
            <input placeholder="Movie ID" value={showtimeForm.movie_id} onChange={(e) => setShowtimeForm({ ...showtimeForm, movie_id: e.target.value })} />
            <input placeholder="Room ID" value={showtimeForm.room_id} onChange={(e) => setShowtimeForm({ ...showtimeForm, room_id: e.target.value })} />
            <input type="datetime-local" value={showtimeForm.start_time} onChange={(e) => setShowtimeForm({ ...showtimeForm, start_time: e.target.value })} />
            <input type="datetime-local" value={showtimeForm.end_time} onChange={(e) => setShowtimeForm({ ...showtimeForm, end_time: e.target.value })} />
            <select value={showtimeForm.status} onChange={(e) => setShowtimeForm({ ...showtimeForm, status: e.target.value })}>
              <option value="OPEN">OPEN</option>
              <option value="FULL">FULL</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <button className="primary-btn form-submit">Lưu suất chiếu</button>
          </form>

          <div className="data-card">
            <h2>Showtimes</h2>
            <div className="stack">
              {showtimes.map((showtime) => (
                <div className="manage-row" key={showtime.id}>
                  <span>{showtime.movie_title} - {formatDateTime(showtime.start_time)}</span>
                  <button onClick={() => setShowtimeForm({
                    id: String(showtime.id),
                    movie_id: String(showtime.movie_id),
                    room_id: String(showtime.room_id),
                    start_time: showtime.start_time.slice(0, 16),
                    end_time: showtime.end_time.slice(0, 16),
                    status: showtime.status,
                  })}>Sửa</button>
                  <button onClick={async () => { await deleteAdminShowtime(showtime.id); await loadAdminData(); }}>Xóa</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminPage;
