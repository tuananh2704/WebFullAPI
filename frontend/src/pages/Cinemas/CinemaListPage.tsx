import { useEffect, useMemo, useState } from "react";
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

const toNumber = (value: number | string | undefined) => Number(value || 0);

type UserLocation = {
  latitude: number;
  longitude: number;
};

const hasMapCoordinates = (cinema: ApiCinema | null) => {
  if (!cinema) return false;
  return cinema.latitude !== null && cinema.latitude !== undefined &&
    cinema.longitude !== null && cinema.longitude !== undefined;
};

const getGoogleMapsUrl = (cinema: ApiCinema) => {
  return `https://www.google.com/maps?q=${cinema.latitude},${cinema.longitude}`;
};

const getDistanceKm = (from: UserLocation | null, cinema: ApiCinema) => {
  if (!from || !hasMapCoordinates(cinema)) return null;

  const cinemaLat = Number(cinema.latitude);
  const cinemaLng = Number(cinema.longitude);
  if (Number.isNaN(cinemaLat) || Number.isNaN(cinemaLng)) return null;

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(cinemaLat - from.latitude);
  const lngDelta = toRadians(cinemaLng - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(cinemaLat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (distanceKm: number) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
};

const CinemaListPage = () => {
  const navigate = useNavigate();
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [brand, setBrand] = useState("");
  const [mapCinema, setMapCinema] = useState<ApiCinema | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const sortedCinemas = useMemo(() => {
    if (!userLocation) {
      return cinemas;
    }

    return [...cinemas].sort((a, b) => {
      const distanceA = getDistanceKm(userLocation, a);
      const distanceB = getDistanceKm(userLocation, b);
      return (distanceA ?? Number.POSITIVE_INFINITY) - (distanceB ?? Number.POSITIVE_INFINITY);
    });
  }, [cinemas, userLocation]);

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

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setUserLocation(null),
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      }
    );
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
            {sortedCinemas.map((cinema, index) => {
              const distanceKm = getDistanceKm(userLocation, cinema);
              const isNearest = userLocation && index === 0 && distanceKm !== null;

              return (
              <div className="cinema-card" key={cinema.id}>
                {/* Brand badge */}
                <div
                  className="brand-badge"
                  style={{ background: BRAND_COLOR[cinema.brand] || "#333" }}
                >
                  {cinema.brand}
                </div>

                <div className="cinema-card-body">
                  {isNearest && <span className="nearest-cinema-badge">📍 Gần bạn nhất</span>}
                  <h2 className="cinema-card-name">{cinema.name}</h2>
                  <p className="cinema-card-city">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {cinema.city}
                  </p>
                  {distanceKm !== null && (
                    <p className="cinema-card-distance">
                      🚗 Cách bạn {formatDistance(distanceKm)}
                    </p>
                  )}
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

                  <div className="cinema-card-stats">
                    <strong>{toNumber(cinema.today_showtime_count)} suất chiếu hôm nay</strong>
                    <span>{toNumber(cinema.showing_movie_count)} phim đang chiếu tại đây</span>
                  </div>
                </div>

                <div className="cinema-card-footer">
                  {cinema.phone && <span className="cinema-phone">{cinema.phone}</span>}
                  <Button
                    id={`btn-map-${cinema.id}`}
                    className="cinema-map-btn"
                    onClick={() => setMapCinema(cinema)}
                  >
                    Xem bản đồ
                  </Button>
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
              );
            })}
          </div>
        )}
      </div>

      {mapCinema && (
        <div className="cinema-map-modal-overlay" onClick={() => setMapCinema(null)}>
          <div
            className="cinema-map-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cinema-map-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="cinema-map-close"
              type="button"
              aria-label="Đóng bản đồ"
              onClick={() => setMapCinema(null)}
            >
              ×
            </button>

            <div className="cinema-map-modal-head">
              <h2 id="cinema-map-title">{mapCinema.name}</h2>
              <div className="cinema-map-meta">
                <span>📍 {mapCinema.city}</span>
                {mapCinema.phone && <span>📞 {mapCinema.phone}</span>}
              </div>
              <p>{mapCinema.address}</p>
            </div>

            {hasMapCoordinates(mapCinema) ? (
              <>
                <iframe
                  className="cinema-map-frame"
                  title={`Bản đồ ${mapCinema.name}`}
                  src={`${getGoogleMapsUrl(mapCinema)}&z=15&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="cinema-map-actions">
                  <button
                    className="primary-btn compact"
                    type="button"
                    onClick={() => window.open(getGoogleMapsUrl(mapCinema), "_blank")}
                  >
                    Mở Google Maps
                  </button>
                </div>
              </>
            ) : (
              <div className="cinema-map-empty">Chưa có dữ liệu bản đồ</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default CinemaListPage;
