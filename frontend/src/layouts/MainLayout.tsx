import { useEffect, useState } from "react";
import {
  BarChart3,
  Clapperboard,
  Film,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Play,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
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

      {!isAdminUser && (
        <footer className="site-footer">
          <div className="container footer-grid">
            <div className="footer-brand-block">
              <NavLink className="brand footer-brand" to="/">
                <span className="brand-mark">
                  <Film size={26} strokeWidth={2.5} />
                </span>
                <span>CINEMAX</span>
              </NavLink>
              <p>
                Hệ thống đặt vé xem phim, chọn rạp, chọn ghế và theo dõi ưu đãi
                thành viên trong một trải nghiệm liền mạch.
              </p>
              <div className="footer-socials" aria-label="Mạng xã hội">
                <a href="https://instagram.com" aria-label="Instagram">
                  <Star size={18} />
                </a>
                <a href="https://youtube.com" aria-label="YouTube">
                  <Play size={18} />
                </a>
                <a href="https://telegram.org" aria-label="Telegram">
                  <Clapperboard size={18} />
                </a>
              </div>
            </div>

            <div className="footer-column">
              <h2>Thông tin rạp</h2>
              <a href="/cinemas">
                <MapPin size={16} />
                Hệ thống rạp
              </a>
              <a href="/movies">
                <Film size={16} />
                Lịch chiếu phim
              </a>
              <a href="/bookings">
                <ShieldCheck size={16} />
                Tra cứu đặt vé
              </a>
            </div>

            <div className="footer-column">
              <h2>Hotline</h2>
              <a href="tel:19006017">
                <Phone size={16} />
                1900 6017
              </a>
              <a href="mailto:support@cinemax.vn">
                <Mail size={16} />
                support@cinemax.vn
              </a>
              <p>Hỗ trợ khách hàng mỗi ngày từ 8:00 đến 23:00.</p>
            </div>

            <div className="footer-column">
              <h2>Chính sách</h2>
              <a href="/membership">Thành viên VIP</a>
              <a href="/bookings">Lịch sử giao dịch</a>
              <a href="/auth">Tài khoản và bảo mật</a>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© 2026 CINEMAX</span>
            <span>Đặt vé nhanh, giữ ghế rõ ràng, thanh toán minh bạch.</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default MainLayout;
