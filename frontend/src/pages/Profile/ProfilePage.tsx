import React, { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  Crown,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import {
  getProfile,
  logout,
  requestPasswordChange,
  verifyPasswordChange,
} from "../../services/authService";
import { getMyMembership } from "../../services/membershipService";
import { formatCurrency } from "../../utils/format";
import type { ApiUser, ApiMembershipInfo } from "../../types/api";

const calculateAge = (birthDate: string | null) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};

const formatBirthDate = (birthDate: string | null) => {
  if (!birthDate) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${birthDate}T00:00:00`));
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [membership, setMembership] = useState<ApiMembershipInfo | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
    verification_code: "",
  });

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setMessage("Bạn cần đăng nhập để xem profile."));
    getMyMembership()
      .then(setMembership)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!otpStep || countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpStep, countdown]);

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const resetPasswordFlow = () => {
    setShowPasswordForm(false);
    setOtpStep(false);
    setCountdown(0);
    setPasswordMessage("");
    setPasswordForm({
      new_password: "",
      confirm_password: "",
      verification_code: "",
    });
  };

  const handleRequestPasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");

    if (passwordForm.new_password.length < 6) {
      setPasswordMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const data = await requestPasswordChange({ new_password: passwordForm.new_password });
      setOtpStep(true);
      setCountdown(data.expires_in_seconds || 300);
      setPasswordMessage(`OTP đã được gửi tới ${data.email}. Nhập mã trong 5 phút để đổi mật khẩu.`);
    } catch (error: any) {
      setPasswordMessage(error.response?.data?.message || "Không gửi được OTP đổi mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");

    if (!/^\d{6}$/.test(passwordForm.verification_code.trim())) {
      setPasswordMessage("Mã OTP phải gồm 6 chữ số.");
      return;
    }

    if (countdown <= 0) {
      setPasswordMessage("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
      return;
    }

    setLoading(true);
    try {
      await verifyPasswordChange({ verification_code: passwordForm.verification_code.trim() });
      setPasswordMessage("Đổi mật khẩu thành công. Lần đăng nhập sau hãy dùng mật khẩu mới.");
      setOtpStep(false);
      setShowPasswordForm(false);
      setCountdown(0);
      setPasswordForm({
        new_password: "",
        confirm_password: "",
        verification_code: "",
      });
    } catch (error: any) {
      setPasswordMessage(error.response?.data?.message || "Không xác minh được OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="app-page">
      <div className="container">
        <div className="profile-hero">
          <div>
            <p className="eyebrow">Profile</p>
            <h1>Tài khoản</h1>
            <p className="muted">Quản lý thông tin cá nhân và bảo mật tài khoản CINEMAX.</p>
          </div>
          {profile && (
            <button className="secondary-btn compact" onClick={handleLogout} type="button">
              <LogOut size={18} />
              Đăng xuất
            </button>
          )}
        </div>

        {message && <p className="section-state warning">{message}</p>}

        {profile && (
          <div className="profile-layout">
            <section className="profile-card profile-summary-card">
              <div className="profile-avatar">
                <UserRound size={46} />
              </div>
              <div>
                <p className="profile-label">Thành viên CINEMAX</p>
                <h2>{profile.full_name}</h2>
                <div className="profile-role-list">
                  {profile.roles.map((role) => (
                    <span key={role}>{role}</span>
                  ))}
                </div>
              </div>
              <div className="profile-status-pill">
                <BadgeCheck size={18} />
                {profile.status}
              </div>
            </section>

            {membership && (
              <section
                className="profile-card profile-membership-card"
                style={{ "--tier-color": membership.tier.color_hex } as React.CSSProperties}
              >
                <div className="profile-card-title">
                  <div>
                    <p className="profile-label">VIP Membership</p>
                    <h2 style={{ color: membership.tier.color_hex }}>
                      <Crown size={22} />{" "}
                      {membership.tier.name}
                    </h2>
                  </div>
                  <Star size={28} style={{ color: membership.tier.color_hex }} />
                </div>

                <div className="profile-membership-stats">
                  <div>
                    <span>{formatCurrency(membership.total_spend)}</span>
                    <small>Tổng chi tiêu</small>
                  </div>
                  <div>
                    <span style={{ color: "#ffd60a" }}>{membership.points_available}</span>
                    <small>Điểm khả dụng</small>
                  </div>
                  <div>
                    <span>{membership.tier.discount_percent}%</span>
                    <small>Giảm giá vé</small>
                  </div>
                </div>

                {membership.next_tier && (
                  <div className="profile-membership-progress">
                    <div className="tier-progress-header">
                      <span>Tiến độ → {membership.next_tier.name}</span>
                      <span>{membership.next_tier.progress_percent}%</span>
                    </div>
                    <div className="tier-progress-bar">
                      <div
                        className="tier-progress-fill"
                        style={{ width: `${membership.next_tier.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  className="primary-btn compact profile-action-btn"
                  type="button"
                  onClick={() => navigate("/membership")}
                >
                  <Crown size={18} />
                  Xem chi tiết VIP
                </button>
              </section>
            )}

            <section className="profile-card profile-info-card">
              <div className="profile-card-title">
                <div>
                  <p className="profile-label">Thông tin</p>
                  <h2>Hồ sơ cá nhân</h2>
                </div>
                <ShieldCheck size={28} />
              </div>

              <div className="profile-info-grid">
                <div>
                  <Mail size={20} />
                  <span>Email</span>
                  <strong>{profile.email}</strong>
                </div>
                <div>
                  <Phone size={20} />
                  <span>Số điện thoại</span>
                  <strong>{profile.phone || "Chưa cập nhật"}</strong>
                </div>
                <div>
                  <UserRound size={20} />
                  <span>Họ tên</span>
                  <strong>{profile.full_name}</strong>
                </div>
                <div>
                  <CalendarDays size={20} />
                  <span>Ngày sinh</span>
                  <strong>
                    {formatBirthDate(profile.birth_date)}
                    {calculateAge(profile.birth_date) !== null
                      ? ` (${calculateAge(profile.birth_date)} tuổi)`
                      : ""}
                  </strong>
                </div>
                <div>
                  <ShieldCheck size={20} />
                  <span>Quyền</span>
                  <strong>{profile.roles.join(", ")}</strong>
                </div>
              </div>
            </section>

            <section className="profile-card profile-security-card">
              <div className="profile-card-title">
                <div>
                  <p className="profile-label">Bảo mật</p>
                  <h2>Mật khẩu</h2>
                </div>
                <KeyRound size={28} />
              </div>

              <p className="muted">
                Khi đổi mật khẩu, hệ thống sẽ gửi OTP tới email của bạn. OTP hợp lệ trong 5 phút.
              </p>

              {!showPasswordForm && (
                <button
                  className="primary-btn compact profile-action-btn"
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPasswordMessage("");
                  }}
                >
                  <KeyRound size={18} />
                  Đổi mật khẩu
                </button>
              )}

              {showPasswordForm && !otpStep && (
                <form className="profile-password-form" onSubmit={handleRequestPasswordChange}>
                  <div className="form-field">
                    <label htmlFor="new_password">Mật khẩu mới *</label>
                    <input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(event) =>
                        setPasswordForm({ ...passwordForm, new_password: event.target.value })
                      }
                      placeholder="Nhập mật khẩu mới"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="confirm_password">Xác nhận mật khẩu *</label>
                    <input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(event) =>
                        setPasswordForm({ ...passwordForm, confirm_password: event.target.value })
                      }
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                  <div className="profile-form-actions">
                    <button className="primary-btn compact" type="submit" disabled={loading}>
                      {loading ? "Đang gửi..." : "Gửi OTP"}
                    </button>
                    <button className="secondary-btn compact" type="button" onClick={resetPasswordFlow}>
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {showPasswordForm && otpStep && (
                <form className="profile-password-form" onSubmit={handleVerifyPasswordChange}>
                  <div className="otp-status">
                    <span>Thời gian còn lại</span>
                    <strong>{formatCountdown(countdown)}</strong>
                  </div>
                  <div className="form-field">
                    <label htmlFor="verification_code">Mã OTP *</label>
                    <input
                      id="verification_code"
                      inputMode="numeric"
                      maxLength={6}
                      value={passwordForm.verification_code}
                      onChange={(event) =>
                        setPasswordForm({
                          ...passwordForm,
                          verification_code: event.target.value.replace(/\D/g, "").slice(0, 6),
                        })
                      }
                      placeholder="Nhập 6 chữ số"
                    />
                  </div>
                  <div className="profile-form-actions">
                    <button className="primary-btn compact" type="submit" disabled={loading}>
                      {loading ? "Đang xác minh..." : "Xác nhận đổi mật khẩu"}
                    </button>
                    <button className="secondary-btn compact" type="button" onClick={resetPasswordFlow}>
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {passwordMessage && (
                <p className="section-state warning profile-password-message">{passwordMessage}</p>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProfilePage;
