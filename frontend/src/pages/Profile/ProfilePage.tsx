import { useEffect, useState } from "react";
import { getProfile, logout } from "../../services/authService";
import type { ApiUser } from "../../types/api";

const ProfilePage = () => {
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setMessage("Bạn cần đăng nhập để xem profile."));
  }, []);

  return (
    <section className="app-page">
      <div className="container">
        <p className="eyebrow">Profile</p>
        <h1>Tài khoản</h1>
        {message && <p className="section-state warning">{message}</p>}
        {profile && (
          <div className="data-card">
            <h2>{profile.full_name}</h2>
            <p>Email: {profile.email}</p>
            <p>Phone: {profile.phone || "N/A"}</p>
            <p>Roles: {profile.roles.join(", ")}</p>
            <button className="ghost-btn compact" onClick={logout} type="button">
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProfilePage;
