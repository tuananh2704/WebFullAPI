import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMovies } from "../../services/movieService";
import type { ApiMovie } from "../../types/api";

const MoviesPage = () => {
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");

  const loadMovies = async (nextPage = page) => {
    try {
      const data = await getMovies({ page: nextPage, limit: 6, search, genre });
      setMovies(data.items);
      setTotalPages(data.pagination.totalPages || 1);
      setPage(nextPage);
      setMessage("");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không tải được danh sách phim.");
    }
  };

  useEffect(() => {
    loadMovies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (event: FormEvent) => {
    event.preventDefault();
    loadMovies(1);
  };

  return (
    <section className="app-page">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">Movies</p>
            <h1>Danh sách phim</h1>
          </div>
          <form className="inline-form" onSubmit={handleFilter}>
            <input placeholder="Search movie" value={search} onChange={(e) => setSearch(e.target.value)} />
            <input placeholder="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
            <button type="submit">Lọc</button>
          </form>
        </div>

        {message && <p className="section-state warning">{message}</p>}
        <div className="list-grid">
          {movies.map((movie) => (
            <Link className="data-card" to={`/movies/${movie.id}`} key={movie.id}>
              <h2>{movie.title}</h2>
              <p>{movie.description}</p>
              <p>{movie.duration} phút - {movie.status}</p>
              <div className="genre-list">
                {movie.genres.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <div className="pager">
          <button disabled={page <= 1} onClick={() => loadMovies(page - 1)}>Trước</button>
          <span>{page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => loadMovies(page + 1)}>Sau</button>
        </div>
      </div>
    </section>
  );
};

export default MoviesPage;
