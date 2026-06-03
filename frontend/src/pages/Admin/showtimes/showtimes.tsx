import React, { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import type { ApiShowtime, ApiMovie } from "../../../types/api";

type ShowtimeForm = {
  id: string;
  movie_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: ApiShowtime["status"] | string;
};

type ShowtimesSectionProps = {
  showtimes: ApiShowtime[];
  movies: ApiMovie[];
  showtimeForm: ShowtimeForm;
  setShowtimeForm: (form: ShowtimeForm) => void;
  handleSubmitShowtime: (event: React.FormEvent<HTMLFormElement>) => void;
  editShowtime: (showtime: ApiShowtime) => void;
  deleteShowtime: (showtimeId: number) => Promise<void>;
  formatDateTime: (value: string) => string;
};

const cellStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const actionButtonStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  minWidth: "36px",
  justifySelf: "center",
};

const ShowtimesSection: React.FC<ShowtimesSectionProps> = ({
  showtimes,
  movies,
  showtimeForm,
  setShowtimeForm,
  handleSubmitShowtime,
  editShowtime,
  deleteShowtime,
  formatDateTime,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cinemaFilter, setCinemaFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ApiShowtime["status"]>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const cinemaOptions = useMemo(
    () =>
      Array.from(
        new Set(showtimes.map((showtime) => showtime.cinema_name || "Không rõ"))
      ),
    [showtimes]
  );

  const filteredShowtimes = useMemo(
    () =>
      showtimes.filter((showtime) => {
        const title = showtime.movie_title?.toLowerCase() || "";
        const matchesSearch = title.includes(searchTerm.toLowerCase());
        const matchesCinema =
          cinemaFilter === "ALL" ||
          (showtime.cinema_name || "Không rõ") === cinemaFilter;
        const matchesStatus =
          statusFilter === "ALL" || showtime.status === statusFilter;
        return matchesSearch && matchesCinema && matchesStatus;
      }),
    [showtimes, searchTerm, cinemaFilter, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredShowtimes.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cinemaFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const currentShowtimes = useMemo(
    () =>
      filteredShowtimes.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredShowtimes, currentPage]
  );

  return (
    <div
      className="admin-workspace"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <form className="form-panel admin-form" onSubmit={handleSubmitShowtime}>
        <h2>{showtimeForm.id ? "Sửa suất chiếu" : "Thêm suất chiếu"}</h2>

        <select
          required
          value={showtimeForm.movie_id}
          onChange={(e) =>
            setShowtimeForm({ ...showtimeForm, movie_id: e.target.value })
          }
        >
          <option value="">Chọn phim</option>
          {movies.map((movie) => (
            <option value={movie.id} key={movie.id}>
              {movie.title}
            </option>
          ))}
        </select>

        <input
          required
          type="number"
          min="1"
          placeholder="Room ID"
          value={showtimeForm.room_id}
          onChange={(e) =>
            setShowtimeForm({ ...showtimeForm, room_id: e.target.value })
          }
        />

        <input
          required
          type="datetime-local"
          value={showtimeForm.start_time}
          onChange={(e) =>
            setShowtimeForm({ ...showtimeForm, start_time: e.target.value })
          }
        />

        <input
          required
          type="datetime-local"
          value={showtimeForm.end_time}
          onChange={(e) =>
            setShowtimeForm({ ...showtimeForm, end_time: e.target.value })
          }
        />

        <select
          value={showtimeForm.status}
          onChange={(e) =>
            setShowtimeForm({ ...showtimeForm, status: e.target.value })
          }
        >
          <option value="OPEN">Mở bán</option>
          <option value="FULL">Đã đầy</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>

        <button className="primary-btn form-submit">
          <Plus size={18} />
          Lưu suất chiếu
        </button>
      </form>

      <div
        className="admin-table-card"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <h2>Danh sách suất chiếu</h2>

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
            placeholder="Tìm suất chiếu theo phim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={cinemaFilter}
            onChange={(e) => setCinemaFilter(e.target.value)}
          >
            <option value="ALL">Tất cả rạp</option>
            {cinemaOptions.map((cinema) => (
              <option value={cinema} key={cinema}>
                {cinema}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">Tất cả</option>
            <option value="OPEN">Mở bán</option>
            <option value="FULL">Đã đầy</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <div
          className="admin-table"
          style={{
            width: "100%",
            maxWidth: "100%",
            overflowX: "auto",
            boxSizing: "border-box",
          }}
        >
          {currentShowtimes.length > 0 ? (
            currentShowtimes.map((showtime) => (
              <div
                className="admin-table-row showtime-admin-row"
                key={showtime.id}
                style={{
                  width: "100%",
                  minWidth: "680px",
                  boxSizing: "border-box",
                  display: "grid",
                  alignItems: "center",
                  gap: "12px",
                  gridTemplateColumns: "1.6fr 1.6fr 1.2fr 0.8fr 40px 40px",
                }}
              >
                <strong style={cellStyle}>{showtime.movie_title}</strong>

                <span style={cellStyle}>
                  {showtime.cinema_name} - {showtime.room_name}
                </span>

                <span style={cellStyle}>
                  {formatDateTime(showtime.start_time)}
                </span>

                <span style={cellStyle}>{showtime.status}</span>

                <button
                  title="Sửa suất chiếu"
                  onClick={() => editShowtime(showtime)}
                  style={actionButtonStyle}
                >
                  <Edit3 size={16} />
                </button>

                <button
                  title="Xóa suất chiếu"
                  onClick={async () => {
                    await deleteShowtime(showtime.id);
                  }}
                  style={actionButtonStyle}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="admin-table-row">
              <span>Không tìm thấy suất chiếu phù hợp.</span>
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

export default ShowtimesSection;