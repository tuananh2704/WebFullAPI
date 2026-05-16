import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Input,
  Pagination,
  Radio,
  Select,
  Slider,
  Spin,
  Tag,
} from "antd";
import { motion, AnimatePresence } from "framer-motion";
import { getMovies } from "../../services/movieService";
import type { MovieSearchParams } from "../../services/movieService";
import type { ApiMovie } from "../../types/api";

const { Search } = Input;

const GENRES = ["Action", "Comedy", "Horror", "Sci-Fi", "Animation", "Drama", "Adventure", "Romance", "Thriller"];

const SORT_OPTIONS = [
  { value: "release_desc", label: "Mới nhất" },
  { value: "rating_desc", label: "Điểm cao nhất" },
  { value: "title_asc", label: "Tên A-Z" },
];

const STATUS_LABELS: Record<string, string> = {
  NOW_SHOWING: "Đang chiếu",
  COMING_SOON: "Sắp chiếu",
  ENDED: "Đã kết thúc",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  NOW_SHOWING: { bg: "rgba(76,175,80,0.18)", text: "#81C784" },
  COMING_SOON: { bg: "rgba(255,152,0,0.18)", text: "#FFB74D" },
  ENDED: { bg: "rgba(150,150,150,0.18)", text: "#999" },
};

// Poster placeholder gradient colors per index
const POSTER_GRADIENTS = [
  "linear-gradient(135deg, #1a237e, #7b1fa2)",
  "linear-gradient(135deg, #b71c1c, #e65100)",
  "linear-gradient(135deg, #006064, #1b5e20)",
  "linear-gradient(135deg, #37474f, #263238)",
  "linear-gradient(135deg, #4a148c, #880e4f)",
  "linear-gradient(135deg, #0d47a1, #006064)",
];

const MoviesPage = () => {
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [durationRange, setDurationRange] = useState<[number, number]>([60, 240]);
  const [ratingMin, setRatingMin] = useState<number>(0);
  const [sort, setSort] = useState<string>("release_desc");

  const limit = 9;

  const buildParams = (p: number): MovieSearchParams => ({
    page: p,
    limit,
    search: search || undefined,
    genre: selectedGenre || undefined,
    status: status as any || undefined,
    language: language || undefined,
    duration_min: durationRange[0] !== 60 ? durationRange[0] : undefined,
    duration_max: durationRange[1] !== 240 ? durationRange[1] : undefined,
    rating_min: ratingMin > 0 ? ratingMin : undefined,
    sort: sort as any,
  });

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await getMovies(buildParams(p));
      setMovies(data.items);
      setTotal(data.pagination.total);
      setPage(p);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
  };

  const handleApply = () => {
    load(1);
  };

  const handleClear = () => {
    setSearch("");
    setSelectedGenre("");
    setStatus("");
    setLanguage("");
    setDurationRange([60, 240]);
    setRatingMin(0);
    setSort("release_desc");
    // Small timeout to allow state to settle
    setTimeout(() => load(1), 50);
  };

  const handlePageChange = (p: number) => {
    load(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="app-page movies-advanced-page">
      <div className="container">
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <p className="eyebrow">Phim</p>
          <h1>Danh sách phim</h1>
        </div>

        {/* Search bar + toggle */}
        <div className="movies-search-bar">
          <Search
            id="movie-search-input"
            placeholder="Tìm kiếm phim, đạo diễn..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            onSearch={() => load(1)}
            enterButton
            size="large"
            style={{ flex: 1 }}
          />
          <Button
            id="btn-toggle-filters"
            size="large"
            onClick={() => setShowFilters((v) => !v)}
            style={{
              background: showFilters ? "#E50914" : "#1e1e1e",
              borderColor: showFilters ? "#E50914" : "rgba(255,255,255,0.15)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Bộ lọc nâng cao
          </Button>
        </div>

        {/* Advanced filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              key="filter-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              style={{ overflow: "hidden" }}
            >
              <div className="filter-panel">
                {/* Row 1: Thể loại */}
                <div className="filter-row">
                  <label className="filter-label">Thể loại</label>
                  <div className="genre-tags">
                    {GENRES.map((g) => (
                      <button
                        key={g}
                        id={`genre-tag-${g}`}
                        className={`genre-tag-btn ${selectedGenre === g ? "active" : ""}`}
                        onClick={() => setSelectedGenre(selectedGenre === g ? "" : g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 2: Trạng thái */}
                <div className="filter-row">
                  <label className="filter-label">Trạng thái</label>
                  <Radio.Group
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <Radio.Button value="">Tất cả</Radio.Button>
                    <Radio.Button value="NOW_SHOWING">Đang chiếu</Radio.Button>
                    <Radio.Button value="COMING_SOON">Sắp chiếu</Radio.Button>
                    <Radio.Button value="ENDED">Đã kết thúc</Radio.Button>
                  </Radio.Group>
                </div>

                {/* Row 3: Ngôn ngữ */}
                <div className="filter-row">
                  <label className="filter-label">Ngôn ngữ</label>
                  <Select
                    id="filter-language"
                    value={language}
                    onChange={setLanguage}
                    style={{ width: 220 }}
                    options={[
                      { value: "", label: "Tất cả" },
                      { value: "English", label: "Tiếng Anh" },
                      { value: "Vietnamese", label: "Tiếng Việt" },
                      { value: "Japanese", label: "Tiếng Nhật" },
                    ]}
                  />
                </div>

                {/* Row 4: Thời lượng */}
                <div className="filter-row">
                  <label className="filter-label">
                    Thời lượng: {durationRange[0]}–{durationRange[1]} phút
                  </label>
                  <Slider
                    range
                    min={60}
                    max={240}
                    value={durationRange}
                    onChange={(val: number | number[]) => setDurationRange(val as [number, number])}
                    style={{ width: "100%", maxWidth: 400 }}
                    marks={{ 60: "60p", 120: "2h", 180: "3h", 240: "4h" }}
                  />
                </div>

                {/* Row 5: Rating tối thiểu */}
                <div className="filter-row">
                  <label className="filter-label">Điểm tối thiểu: {ratingMin}</label>
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={ratingMin}
                    onChange={(val: number | number[]) => setRatingMin(val as number)}
                    style={{ width: "100%", maxWidth: 400 }}
                    marks={{ 0: "0", 5: "5", 10: "10" }}
                  />
                </div>

                {/* Row 6: Sắp xếp */}
                <div className="filter-row">
                  <label className="filter-label">Sắp xếp theo</label>
                  <Select
                    id="filter-sort"
                    value={sort}
                    onChange={setSort}
                    style={{ width: 200 }}
                    options={SORT_OPTIONS}
                  />
                </div>

                {/* Actions */}
                <div className="filter-actions">
                  <Button
                    id="btn-apply-filters"
                    type="primary"
                    danger
                    onClick={handleApply}
                    style={{ background: "#E50914", borderColor: "#E50914" }}
                  >
                    Áp dụng
                  </Button>
                  <Button
                    id="btn-clear-filters"
                    onClick={handleClear}
                    style={{ background: "#2a2a2a", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Movie grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Spin size="large" />
          </div>
        ) : movies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
            Không tìm thấy phim nào phù hợp.
          </div>
        ) : (
          <div className="movies-advanced-grid">
            {movies.map((movie, idx) => (
              <div className="movie-adv-card" key={movie.id}>
                {/* Poster */}
                <div className="movie-adv-poster">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} />
                  ) : (
                    <div
                      className="movie-adv-poster-placeholder"
                      style={{ background: POSTER_GRADIENTS[idx % POSTER_GRADIENTS.length] }}
                    >
                      <span>{movie.title.charAt(0)}</span>
                    </div>
                  )}

                  {/* Status badge */}
                  <span
                    className="movie-adv-status"
                    style={{
                      background: STATUS_COLORS[movie.status]?.bg,
                      color: STATUS_COLORS[movie.status]?.text,
                    }}
                  >
                    {STATUS_LABELS[movie.status]}
                  </span>

                  {/* Rating */}
                  {movie.rating && (
                    <span className="movie-adv-rating">
                      ⭐ {Number(movie.rating).toFixed(1)}
                    </span>
                  )}

                  {/* Hover overlay */}
                  <div className="movie-adv-hover">
                    <Link to={`/movies/${movie.id}`} className="movie-adv-detail-btn" id={`btn-detail-${movie.id}`}>
                      Xem chi tiết
                    </Link>
                    <Link to={`/movies/${movie.id}`} className="movie-adv-book-btn" id={`btn-book-${movie.id}`}>
                      🎟 Đặt vé ngay
                    </Link>
                  </div>
                </div>

                {/* Info */}
                <div className="movie-adv-info">
                  <h3 className="movie-adv-title">{movie.title}</h3>

                  <div className="movie-adv-meta">
                    {movie.duration && (
                      <span className="meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {movie.duration} phút
                      </span>
                    )}
                    {movie.language && (
                      <span className="meta-item">🌐 {movie.language}</span>
                    )}
                  </div>

                  <div className="genre-list" style={{ marginTop: 8 }}>
                    {(movie.genres || []).slice(0, 3).map((g) => (
                      <span key={g}>{g}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
            <Pagination
              current={page}
              total={total}
              pageSize={limit}
              onChange={handlePageChange}
              showSizeChanger={false}
              style={{ color: "#fff" }}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default MoviesPage;
