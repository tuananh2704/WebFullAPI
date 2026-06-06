import { useEffect, useState, type CSSProperties } from "react";
import {
  BarChart3,
  Bell,
  Clapperboard,
  Crown,
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
import { getMyMembership } from "../services/membershipService";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "../services/notificationService";
import type { ApiMembershipInfo, ApiUser } from "../types/api";

const getLastName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
};

const formatPoints = (points: number) => new Intl.NumberFormat("vi-VN").format(points);

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<ApiUser | null>(getCurrentUser());
  const [membership, setMembership] = useState<ApiMembershipInfo | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const isAdminUser = hasAdminAccess(user);
  const userId = user?.id;

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

  useEffect(() => {
    let isMounted = true;

    if (!userId || isAdminUser) {
      setMembership(null);
      return () => {
        isMounted = false;
      };
    }

    const fetchMembership = () => {
      getMyMembership()
        .then((data) => {
          if (isMounted) {
            setMembership(data);
          }
        })
        .catch(() => {
          if (isMounted) {
            setMembership(null);
          }
        });
    };

    fetchMembership();
    const interval = window.setInterval(fetchMembership, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [userId, isAdminUser]);

  useEffect(() => {
    let isMounted = true;

    if (!userId || isAdminUser) {
      setNotifications([]);
      return () => {
        isMounted = false;
      };
    }

    const fetchNotifications = () => {
      getNotifications()
        .then((items) => {
          if (isMounted) {
            setNotifications(items);
          }
        })
        .catch(() => {
          if (isMounted) {
            setNotifications([]);
          }
        });
    };

    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 7000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [userId, isAdminUser]);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  const unreadCount = notifications.filter((item) => !Boolean(item.is_read)).length;

  const handleOpenNotification = async () => {
    setIsNotificationOpen((current) => !current);
    if (unreadCount > 0) {
      await markAllNotificationsRead().catch(() => {});
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    }
  };

  const handleNotificationClick = async (item: UserNotification) => {
    if (!Boolean(item.is_read)) {
      await markNotificationRead(item.id).catch(() => {});
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, is_read: true } : notification
        )
      );
    }
    if (item.type === "VOUCHER") {
      navigate("/membership");
      setIsNotificationOpen(false);
    }
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
                <NavLink to="/top-movies">Top phim</NavLink>
                <NavLink to="/movies">Phim</NavLink>
                <NavLink to="/cinemas">Rạp</NavLink>
                <NavLink to="/bookings">Booking</NavLink>
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
                {!isAdminUser && membership && (
                  <NavLink
                    className="user-membership-summary"
                    to="/membership"
                    title={`${membership.tier.name} - ${formatPoints(membership.points_available)} điểm`}
                    style={{ "--tier-color": membership.tier.color_hex } as CSSProperties}
                  >
                    <Crown size={16} />
                    <span className="user-membership-text">
                      <strong>{membership.tier.name}</strong>
                      <small>{formatPoints(membership.points_available)} điểm</small>
                    </span>
                  </NavLink>
                )}
                {!isAdminUser && (
                  <div className="user-notification-wrap">
                    <button
                      className="logout-btn user-bell-btn"
                      type="button"
                      onClick={handleOpenNotification}
                      title="Thông báo"
                      aria-label="Thông báo"
                    >
                      <Bell size={19} />
                      {unreadCount > 0 && (
                        <span className="user-notification-badge">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotificationOpen && (
                      <div className="user-notification-panel">
                        <div className="user-notification-header">
                          <strong>Thông báo</strong>
                          <span>{notifications.length} tin gần đây</span>
                        </div>

                        <div className="user-notification-list">
                          {notifications.length > 0 ? (
                            notifications.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={`user-notification-item ${
                                  Boolean(item.is_read) ? "" : "unread"
                                }`}
                                onClick={() => handleNotificationClick(item)}
                              >
                                <span className="user-notification-dot" />
                                <div>
                                  <strong>{item.title}</strong>
                                  <p>{item.message}</p>
                                  {item.payload?.code && <small>Mã: {item.payload.code}</small>}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="user-notification-empty">Chưa có thông báo.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              <NavLink to="/membership">Thành viên VIP</NavLink>
              <NavLink to="/bookings">Lịch sử giao dịch</NavLink>
              <NavLink to={user ? "/profile" : "/auth"}>Tài khoản và bảo mật</NavLink>
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
