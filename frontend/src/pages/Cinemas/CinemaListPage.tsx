import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, Spin, Empty, Tag, Button } from "antd";
import { getCinemas } from "../../services/cinemaService";
import type { ApiCinema } from "../../types/api";

const CITIES = [
  { value: "", label: "Tất cả thành phố" },
  { value: "Ha Noi", label: "Hà Nội" },
  { value: "Ho Chi Minh", label: "TP. Hồ Chí Minh" },
  { value: "Binh Duong", label: "Bình Dương" },
];

const BRANDS = [
  { value: "", label: "Tất cả thương hiệu" },
  { value: "CGV", label: "CGV" },
  { value: "LOTTE", label: "Lotte Cinema" },
  { value: "GALAXY", label: "Galaxy Cinema" },
  { value: "BHD", label: "BHD Star" },
  { value: "CINESTAR", label: "Cinestar" },
];

const BRAND_COLOR: Record<string, string> = {
  CGV: "#E50914",
  LOTTE: "#1a1a1a",
  GALAXY: "#1565C0",
  BHD: "#7B1FA2",
  CINESTAR: "#E65100",
};

const ROOM_TYPE_COLOR: Record<string, string> = {
  "2D": "#37474F",
  "3D": "#1565C0",
  IMAX: "#4A148C",
  "4DX": "#BF360C",
};

const getRoomTypes = (cinema: ApiCinema): string[] => {
  if (!cinema.rooms) return [];
  const types = cinema.rooms.map((r) => r.room_type);
  return Array.from(new Set(types));
};

const CinemaListPage = () => {
  const navigate = useNavigate();
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [brand, setBrand] = useState("");

  const load = async (c = city, b = brand) => {
    setLoading(true);
    try {
      const data = await getCinemas({ city: c || undefined, brand: b || undefined });
      setCinemas(data);
    } catch {
      setCinemas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCityChange = (val: string) => {
    setCity(val);
    load(val, brand);
  };

  const handleBrandChange = (val: string) => {
    setBrand(val);
    load(city, val);
  };

  return (
    <section className="app-page">
      <div className="container">
        {/* Header */}
        <div className="cinema-list-header">
          <div>
            <p className="eyebrow">Rạp chiếu phim</p>
            <h1>Chọn rạp phim</h1>
          </div>
          <div className="cinema-filter-bar">
            <Select
              id="filter-city"
              value={city}
              onChange={handleCityChange}
              options={CITIES}
              style={{ width: 200 }}
              placeholder="Thành phố"
            />
            <Select
              id="filter-brand"
              value={brand}
              onChange={handleBrandChange}
              options={BRANDS}
              style={{ width: 200 }}
              placeholder="Thương hiệu"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="cinema-loading">
            <Spin size="large" />
          </div>
        ) : cinemas.length === 0 ? (
          <Empty description="Không tìm thấy rạp phim" style={{ color: "#aaa", marginTop: 60 }} />
        ) : (
          <div className="cinema-grid">
            {cinemas.map((cinema) => (
              <div className="cinema-card" key={cinema.id}>
                {/* Brand badge */}
                <div
                  className="brand-badge"
                  style={{ background: BRAND_COLOR[cinema.brand] || "#333" }}
                >
                  {cinema.brand}
                </div>

                <div className="cinema-card-body">
                  <h2 className="cinema-card-name">{cinema.name}</h2>
                  <p className="cinema-card-city">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {cinema.city}
                  </p>
                  <p className="cinema-card-address muted">{cinema.address}</p>

                  {/* Room types */}
                  <div className="cinema-room-types">
                    {getRoomTypes(cinema).map((type) => (
                      <Tag
                        key={type}
                        className="room-type-badge"
                        style={{ background: ROOM_TYPE_COLOR[type] || "#333", border: "none", color: "#fff" }}
                      >
                        {type}
                      </Tag>
                    ))}
                  </div>
                </div>

                <div className="cinema-card-footer">
                  {cinema.phone && <span className="cinema-phone">{cinema.phone}</span>}
                  <Button
                    id={`btn-cinema-${cinema.id}`}
                    type="primary"
                    danger
                    onClick={() => navigate(`/cinemas/${cinema.id}`)}
                    style={{ background: "#E50914", borderColor: "#E50914" }}
                  >
                    Xem suất chiếu
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CinemaListPage;
