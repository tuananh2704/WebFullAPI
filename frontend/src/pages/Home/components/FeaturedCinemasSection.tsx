import { Link } from "react-router-dom";
import { MapPin, Phone, Navigation } from "lucide-react";
import type { ApiCinema } from "../../../types/api";

type FeaturedCinemasSectionProps = {
  cinemas: ApiCinema[];
};

const fallbackCinemas: ApiCinema[] = [
  {
    id: 1,
    name: "CGV Sense City Cần Thơ",
    brand: "CGV",
    city: "Cần Thơ",
    address: "Tầng 3 Sense City, Ninh Kiều, Cần Thơ",
    phone: "1900 6017",
    logo_url: null,
    latitude: 10.03371,
    longitude: 105.78362,
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "Lotte Cinema Nowzone",
    brand: "LOTTE",
    city: "TP. Hồ Chí Minh",
    address: "235 Nguyễn Văn Cừ, Quận 1, TP. Hồ Chí Minh",
    phone: "1900 5588",
    logo_url: null,
    latitude: 10.76004,
    longitude: 106.6831,
    status: "ACTIVE",
  },
  {
    id: 3,
    name: "Galaxy Nguyễn Du",
    brand: "GALAXY",
    city: "TP. Hồ Chí Minh",
    address: "116 Nguyễn Du, Quận 1, TP. Hồ Chí Minh",
    phone: "1900 2224",
    logo_url: null,
    latitude: 10.77876,
    longitude: 106.69424,
    status: "ACTIVE",
  },
];

const FeaturedCinemasSection = ({ cinemas }: FeaturedCinemasSectionProps) => {
  const visibleCinemas = (cinemas.length > 0 ? cinemas : fallbackCinemas)
    .filter((cinema) => cinema.status !== "INACTIVE")
    .slice(0, 3);

  return (
    <section className="featured-cinemas-section" id="featured-cinemas">
      <div className="container">
        <div className="section-head-row">
          <div>
            <span className="section-kicker">Rạp nổi bật</span>
            <h2>Chọn rạp gần bạn</h2>
          </div>
          <Link className="ghost-btn compact" to="/cinemas">
            Xem hệ thống rạp
          </Link>
        </div>

        <div className="featured-cinema-grid">
          {visibleCinemas.map((cinema) => (
            <Link className="featured-cinema-card" key={cinema.id} to={`/cinemas/${cinema.id}`}>
              <div className="cinema-brand-mark">{cinema.brand.slice(0, 1)}</div>
              <div>
                <span>{cinema.brand}</span>
                <h3>{cinema.name}</h3>
              </div>
              <p>
                <MapPin size={17} />
                {cinema.address}
              </p>
              <div className="featured-cinema-meta">
                <span>
                  <Phone size={16} />
                  {cinema.phone || "1900 0099"}
                </span>
                <span>
                  <Navigation size={16} />
                  {cinema.city}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCinemasSection;
