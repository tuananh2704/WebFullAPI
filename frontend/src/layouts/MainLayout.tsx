import { Film, Search, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="cinemax-shell">
      <header className="site-header">
        <div className="container header-inner">
          <NavLink className="brand" to="/">
            <span className="brand-mark">
              <Film size={28} strokeWidth={2.5} />
            </span>
            <span>CINEMAX</span>
          </NavLink>

          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/">Trang chủ</NavLink>
            <NavLink to="/movies">Phim</NavLink>
            <NavLink to="/bookings">Booking</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>

          <div className="header-actions">
            <NavLink className="icon-link" to="/movies" aria-label="Search">
              <Search size={26} />
            </NavLink>
            <NavLink className="icon-link" to="/profile" aria-label="Account">
              <UserRound size={26} />
            </NavLink>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
