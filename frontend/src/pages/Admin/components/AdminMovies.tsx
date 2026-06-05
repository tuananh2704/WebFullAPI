import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import type { ApiMovie } from "../../../types/api";

interface AdminMoviesProps {
  movies: ApiMovie[];
  movieForm: any;
  setMovieForm: (form: any) => void;
  handleSubmitMovie: (event: FormEvent) => void;
  editMovie: (movie: ApiMovie) => void;
  loadAdminData: () => Promise<void>;
  handleDeleteMovie: (movieId: number) => Promise<void>;
}

const AdminMovies: React.FC<AdminMoviesProps> = ({
  movies,
  movieForm,
  setMovieForm,
  handleSubmitMovie,
  editMovie,
  loadAdminData,
  handleDeleteMovie,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ApiMovie["status"]>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredMovies = useMemo(
    () =>
      movies.filter((movie) => {
        const title = movie.title?.toLowerCase() || "";
        const matchesSearch = title.includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "ALL" || movie.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [movies, searchTerm, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredMovies.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const currentMovies = useMemo(
    () =>
      filteredMovies.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredMovies, currentPage]
  );

  return (
    <div className="admin-workspace">
      <form className="form-panel admin-form" onSubmit={handleSubmitMovie}>
        <h2>{movieForm.id ? "Sửa phim" : "Thêm phim"}</h2>

        <input
          required
          placeholder="Tên phim"
          value={movieForm.title}
          onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
        />

        <textarea
          placeholder="Mô tả"
          value={movieForm.description}
          onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
        />

        <input
          placeholder="Đạo diễn"
          value={movieForm.director}
          onChange={(e) => setMovieForm({ ...movieForm, director: e.target.value })}
        />

        <input
          required
          type="number"
          min="1"
          placeholder="Thời lượng (phút)"
          value={movieForm.duration}
          onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
        />

        <input
          type="date"
          value={movieForm.release_date}
          onChange={(e) => setMovieForm({ ...movieForm, release_date: e.target.value })}
        />

        <input
          placeholder="Poster URL"
          value={movieForm.poster_url}
          onChange={(e) => setMovieForm({ ...movieForm, poster_url: e.target.value })}
        />

        <input
          placeholder="Trailer URL"
          value={movieForm.trailer_url}
          onChange={(e) => setMovieForm({ ...movieForm, trailer_url: e.target.value })}
        />

        <input
          placeholder="Ngôn ngữ"
          value={movieForm.language}
          onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
        />

        <select
          value={movieForm.age_rating}
          onChange={(e) => setMovieForm({ ...movieForm, age_rating: e.target.value })}
        >
          <option value="P">P - Mọi độ tuổi</option>
          <option value="K">K - Trẻ em cần người lớn</option>
          <option value="T13">T13 - Từ 13 tuổi</option>
          <option value="T16">T16 - Từ 16 tuổi</option>
          <option value="T18">T18 - Từ 18 tuổi</option>
        </select>

        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          placeholder="Đánh giá"
          value={movieForm.rating}
          onChange={(e) => setMovieForm({ ...movieForm, rating: e.target.value })}
        />

        <select
          value={movieForm.status}
          onChange={(e) => setMovieForm({ ...movieForm, status: e.target.value })}
        >
          <option value="NOW_SHOWING">Đang chiếu</option>
          <option value="COMING_SOON">Sắp chiếu</option>
          {movieForm.id && <option value="ENDED">Ngừng chiếu</option>}
        </select>

        <button className="primary-btn form-submit" type="submit">
          <Plus size={18} />
          Lưu phim
        </button>
      </form>

      <div className="data-card admin-table-card">
        <h2>Danh sách phim</h2>

        <div
          className="admin-filter-row"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <input
            type="text"
            placeholder="Tìm phim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">Tất cả</option>
            <option value="NOW_SHOWING">Đang chiếu</option>
            <option value="COMING_SOON">Sắp chiếu</option>
            <option value="ENDED">Ngừng chiếu</option>
          </select>
        </div>

        <div className="admin-table">
          {currentMovies.length > 0 ? (
            currentMovies.map((movie) => (
              <div className="admin-table-row movie-admin-row" key={movie.id}>
                <strong>{movie.title}</strong>
                <span>{movie.status}</span>
                <span>{movie.age_rating || "T13"}</span>
                <span>{movie.director || "Chưa có đạo diễn"}</span>
                <span>{movie.duration || 0} phút</span>
                <span>{movie.rating || "N/A"}</span>

                <button title="Sửa phim" onClick={() => editMovie(movie)}>
                  <Edit3 size={16} />
                </button>

                <button
                  title="Xóa phim"
                  onClick={async () => {
                    if (window.confirm("Xóa phim này?")) {
                      await handleDeleteMovie(movie.id);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="admin-table-row">
              <span>Không tìm thấy phim phù hợp.</span>
            </div>
          )}
        </div>

        <div
          className="pagination-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>
            Trang {currentPage} / {totalPages}
          </span>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="secondary-btn compact"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Prev
            </button>
            <button
              className="secondary-btn compact"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMovies;
