import { useEffect, useState } from "react";
import { Crown, Film, LogOut, Search, UserRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import type { ApiUser } from "../types/api";

const getLastName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
};

const MainLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<ApiUser | null>(getCurrentUser());

  // Listen for storage changes (login/logout from other tabs or same-page updates)
  useEffect(() => {
    const sync = () => setUser(getCurrentUser());
    window.addEventListener("storage", sync);
    // Also poll every second to catch same-tab changes (login on AuthPage)
    const interval = setInterval(sync, 1000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

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
            <NavLink to="/cinemas">Rạp</NavLink>
            <NavLink to="/bookings">Booking</NavLink>
            {user && (
              <NavLink to="/membership" className="nav-vip">
                <Crown size={16} />
                VIP
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            <NavLink className="icon-link" to="/movies" aria-label="Search">
              <Search size={26} />
            </NavLink>

            {user ? (
              <>
                <NavLink className="user-name-link" to="/profile" title={user.email}>
                  <UserRound size={18} />
                  <span className="user-display-name">{getLastName(user.full_name)}</span>
                </NavLink>
                <button
                  className="logout-btn"
                  onClick={handleLogout}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <NavLink className="login-link" to="/auth" aria-label="Đăng nhập">
                <UserRound size={18} />
                <span>Đăng nhập</span>
              </NavLink>
            )}
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
