import { useEffect, useState } from "react";
import { BarChart3, Film, LogOut, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, hasAdminAccess, logout } from "../services/authService";
import type { ApiUser } from "../types/api";

const getLastName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
};

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<ApiUser | null>(getCurrentUser());
  const isAdminUser = hasAdminAccess(user);

  useEffect(() => {
    const sync = () => setUser(getCurrentUser());
    window.addEventListener("storage", sync);
    const interval = setInterval(sync, 1000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isAdminUser && location.pathname !== "/admin") {
      navigate("/admin", { replace: true });
    }
  }, [isAdminUser, location.pathname, navigate]);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  return (
    <div className="cinemax-shell">
      <header className="site-header">
        <div className="container header-inner">
          <NavLink className="brand" to={isAdminUser ? "/admin" : "/"}>
            <span className="brand-mark">
              <Film size={28} strokeWidth={2.5} />
            </span>
            <span>CINEMAX</span>
          </NavLink>

          <nav className="main-nav" aria-label="Main navigation">
            {isAdminUser ? (
              <NavLink to="/admin">
                <BarChart3 size={16} />
                Admin
              </NavLink>
            ) : (
              <>
                <NavLink to="/">Trang chủ</NavLink>
                <NavLink to="/movies">Phim</NavLink>
                <NavLink to="/cinemas">Rạp</NavLink>
                <NavLink to="/bookings">Booking</NavLink>
                {user && <NavLink to="/membership">VIP</NavLink>}
              </>
            )}
          </nav>

          <div className="header-actions">
            {user ? (
              <>
                <NavLink
                  className="user-name-link"
                  to={isAdminUser ? "/admin" : "/profile"}
                  title={user.email}
                >
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
