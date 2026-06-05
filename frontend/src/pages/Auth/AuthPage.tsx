import { FormEvent, useEffect, useState } from "react";
import { notification } from "antd";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  hasAdminAccess,
  login,
  register,
  requestForgotPassword,
  resetForgotPassword,
  verifyForgotPasswordCode,
  verifyRegister,
} from "../../services/authService";

const DEMO_ACCOUNTS = [
  { email: "a@gmail.com", name: "Nguyen Van A" },
  { email: "b@gmail.com", name: "Tran Thi B" },
  { email: "c@gmail.com", name: "Le Van C" },
  { email: "d@gmail.com", name: "Pham Thi D" },
  { email: "e@gmail.com", name: "Hoang Van E" },
  { email: "lan@gmail.com", name: "Nguyen Thi Lan" },
  { email: "minh@gmail.com", name: "Tran Van Minh" },
  { email: "hoa@gmail.com", name: "Le Thi Hoa" },
  { email: "duc@gmail.com", name: "Pham Van Duc" },
  { email: "mai@gmail.com", name: "Hoang Thi Mai" },
  { email: "tuan@gmail.com", name: "Vo Van Tuan" },
  { email: "thu@gmail.com", name: "Dang Thi Thu" },
  { email: "hung@gmail.com", name: "Bui Van Hung" },
  { email: "linh@gmail.com", name: "Do Thi Linh" },
  { email: "khanh@gmail.com", name: "Nguyen Van Khanh" },
  { email: "admin@gmail.com", name: "Admin" },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    birth_date: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [forgotStep, setForgotStep] = useState<"email" | "code" | "password">("email");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      navigate(hasAdminAccess(currentUser) ? "/admin" : "/profile", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if ((!otpStep && mode !== "forgot") || countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpStep, mode, countdown]);

  useEffect(() => {
    if (otpStep && countdown === 0) {
      setMessage("Mã OTP đã hết hạn. Vui lòng đăng ký lại.");
    }
    if (mode === "forgot" && forgotStep !== "email" && countdown === 0) {
      setMessage("Mã OTP đã hết hạn. Vui lòng gửi lại mã quên mật khẩu.");
    }
  }, [otpStep, mode, forgotStep, countdown]);

  const resetOtpStep = () => {
    setOtpStep(false);
    setOtp("");
    setPendingEmail("");
    setCountdown(0);
  };

  const resetForgotStep = () => {
    setForgotStep("email");
    setForgotPassword("");
    setForgotOtp("");
    setPendingEmail("");
    setCountdown(0);
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.email.trim()) {
      errs.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Email không hợp lệ";
    }

    if (mode !== "forgot" && !form.password.trim()) {
      errs.password = "Vui lòng nhập mật khẩu";
    } else if (mode !== "forgot" && form.password.length < 4) {
      errs.password = "Mật khẩu phải có ít nhất 4 ký tự";
    }

    if (mode === "register") {
      if (!form.full_name.trim()) {
        errs.full_name = "Vui lòng nhập họ tên";
      }
      if (form.phone && !/^0\d{9}$/.test(form.phone)) {
        errs.phone = "Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số";
      }
      if (!form.birth_date) {
        errs.birth_date = "Vui lòng nhập ngày sinh";
      } else if (new Date(`${form.birth_date}T00:00:00`) > new Date()) {
        errs.birth_date = "Ngày sinh không hợp lệ";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (otpStep) {
      if (!otp.trim()) {
        setErrors({ verification_code: "Vui lòng nhập mã OTP" });
        return;
      }
      if (!/^\d{6}$/.test(otp.trim())) {
        setErrors({ verification_code: "Mã OTP phải gồm 6 chữ số" });
        return;
      }
      if (countdown <= 0) {
        setMessage("Mã OTP đã hết hạn. Vui lòng đăng ký lại.");
        return;
      }

      setLoading(true);
      try {
        await verifyRegister({ email: pendingEmail, verification_code: otp.trim() });
        navigate("/");
      } catch (error: any) {
        setMessage(error.response?.data?.message || "Không xác minh được mã OTP.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "forgot") {
      const email = form.email.trim();

      if (forgotStep === "email") {
        const errs: Record<string, string> = {};
        if (!email) {
          errs.email = "Vui lòng nhập email";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errs.email = "Email không hợp lệ";
        }
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setLoading(true);
        try {
          const data = await requestForgotPassword({ email });
          setPendingEmail(data.email);
          setCountdown(data.expires_in_seconds || 300);
          setForgotStep("code");
          setForgotOtp("");
          setErrors({});
          setMessage("Mã OTP quên mật khẩu đã được gửi tới email. Vui lòng nhập mã trong 5 phút.");
        } catch (error: any) {
          setMessage(error.response?.data?.message || "Không gửi được mã quên mật khẩu.");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (forgotStep === "code") {
        if (!/^\d{6}$/.test(forgotOtp.trim())) {
          setErrors({ verification_code: "Mã OTP phải gồm 6 chữ số" });
          return;
        }
        if (countdown <= 0) {
          setMessage("Mã OTP đã hết hạn. Vui lòng gửi lại mã quên mật khẩu.");
          return;
        }

        setLoading(true);
        try {
          await verifyForgotPasswordCode({
            email: pendingEmail,
            verification_code: forgotOtp.trim(),
          });
          setForgotStep("password");
          setErrors({});
          setMessage("Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.");
        } catch (error: any) {
          setMessage(error.response?.data?.message || "Không xác minh được mã OTP.");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (forgotPassword.length < 6) {
        setErrors({ new_password: "Mật khẩu mới phải có ít nhất 6 ký tự" });
        return;
      }
      if (countdown <= 0) {
        setMessage("Mã OTP đã hết hạn. Vui lòng gửi lại mã quên mật khẩu.");
        return;
      }

      setLoading(true);
      try {
        await resetForgotPassword({
          email: pendingEmail,
          verification_code: forgotOtp.trim(),
          new_password: forgotPassword,
        });
        setMode("login");
        setForm({ ...form, email: pendingEmail, password: "" });
        resetForgotStep();
        setErrors({});
        setMessage("");
        notification.success({
          message: "Đổi mật khẩu thành công",
          description: "Bạn có thể đăng nhập bằng mật khẩu mới.",
        });
      } catch (error: any) {
        setMessage(error.response?.data?.message || "Không đổi được mật khẩu.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "login") {
        const data = await login({ email: form.email, password: form.password });
        navigate(hasAdminAccess(data.user) ? "/admin" : "/");
      } else {
        const data = await register(form);
        setPendingEmail(data.email);
        setCountdown(data.expires_in_seconds || 300);
        setOtpStep(true);
        setOtp("");
        setErrors({});
        setMessage("Mã OTP đã được gửi tới email của bạn. Vui lòng nhập mã trong 5 phút.");
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không xử lý được yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    setForm({ ...form, email, password: "123456" });
    setErrors({});
    setMessage("");
  };

  return (
    <section className="app-page">
      <div className="container">
        <div className="auth-layout">
          <div className="auth-info-panel">
            <p className="eyebrow">Account</p>
            <h1 style={{ marginBottom: 16 }}>
              {otpStep
                ? "Xác minh OTP"
                : mode === "login"
                  ? "Đăng nhập"
                  : mode === "forgot"
                    ? "Quên mật khẩu"
                    : "Đăng ký tài khoản"}
            </h1>
            <p className="muted" style={{ marginBottom: 28, lineHeight: 1.6 }}>
              {otpStep
                ? `Nhập mã OTP cho ${pendingEmail}. Mã sẽ hết hạn sau 5 phút.`
                : mode === "login"
                  ? "Đăng nhập để đặt vé xem phim tại CINEMAX. Chọn tài khoản demo bên dưới hoặc nhập thông tin của bạn."
                  : mode === "forgot"
                    ? "Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu."
                    : "Tạo tài khoản mới để trải nghiệm đặt vé trực tuyến."}
            </p>

            {mode === "login" && !otpStep && (
              <div className="demo-accounts">
                <h3 style={{ marginBottom: 12, fontSize: 15, color: "#ccc" }}>
                  Tài khoản demo (mật khẩu: 123456)
                </h3>
                <div className="demo-account-grid">
                  {DEMO_ACCOUNTS.slice(0, 10).map((acc) => (
                    <button
                      key={acc.email}
                      className={`demo-account-btn ${form.email === acc.email ? "active" : ""}`}
                      onClick={() => handleQuickLogin(acc.email)}
                      type="button"
                    >
                      <span className="demo-avatar">{acc.name.charAt(0)}</span>
                      <div>
                        <span className="demo-name">{acc.name}</span>
                        <span className="demo-email">{acc.email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="auth-form-panel">
            <div className="segmented" style={{ marginBottom: 20 }}>
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setErrors({});
                  setMessage("");
                  resetOtpStep();
                  resetForgotStep();
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => {
                  setMode("register");
                  setErrors({});
                  setMessage("");
                  resetOtpStep();
                  resetForgotStep();
                }}
              >
                Đăng ký
              </button>
            </div>

            <form className="stack" onSubmit={handleSubmit} noValidate>
              {otpStep ? (
                <>
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
                      placeholder="Nhập 6 chữ số"
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setErrors({});
                      }}
                      className={errors.verification_code ? "input-error" : ""}
                    />
                    {errors.verification_code && (
                      <span className="field-error">{errors.verification_code}</span>
                    )}
                  </div>
                </>
              ) : mode === "forgot" ? (
                <>
                  {forgotStep !== "email" && (
                    <div className="otp-status">
                      <span>Thời gian còn lại</span>
                      <strong>{formatCountdown(countdown)}</strong>
                    </div>
                  )}

                  {forgotStep === "email" && (
                    <div className="form-field">
                      <label htmlFor="forgot_email">Email *</label>
                      <input
                        id="forgot_email"
                        type="email"
                        placeholder="email@gmail.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={errors.email ? "input-error" : ""}
                      />
                      {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>
                  )}

                  {forgotStep === "code" && (
                    <div className="form-field">
                      <label htmlFor="forgot_code">Mã OTP *</label>
                      <input
                        id="forgot_code"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Nhập 6 chữ số"
                        value={forgotOtp}
                        onChange={(e) => {
                          setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setErrors({});
                        }}
                        className={errors.verification_code ? "input-error" : ""}
                      />
                      {errors.verification_code && (
                        <span className="field-error">{errors.verification_code}</span>
                      )}
                    </div>
                  )}

                  {forgotStep === "password" && (
                    <div className="form-field">
                      <label htmlFor="new_password">Mật khẩu mới *</label>
                      <input
                        id="new_password"
                        type="password"
                        placeholder="Nhập mật khẩu mới"
                        value={forgotPassword}
                        onChange={(e) => {
                          setForgotPassword(e.target.value);
                          setErrors({});
                        }}
                        className={errors.new_password ? "input-error" : ""}
                      />
                      {errors.new_password && (
                        <span className="field-error">{errors.new_password}</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {mode === "register" && (
                    <>
                      <div className="form-field">
                        <label htmlFor="full_name">Họ tên *</label>
                        <input
                          id="full_name"
                          placeholder="Nguyễn Văn A"
                          value={form.full_name}
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                          className={errors.full_name ? "input-error" : ""}
                        />
                        {errors.full_name && (
                          <span className="field-error">{errors.full_name}</span>
                        )}
                      </div>
                      <div className="form-field">
                        <label htmlFor="phone">Số điện thoại</label>
                        <input
                          id="phone"
                          placeholder="0901234567"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className={errors.phone ? "input-error" : ""}
                        />
                        {errors.phone && <span className="field-error">{errors.phone}</span>}
                      </div>
                      <div className="form-field">
                        <label htmlFor="birth_date">Ngày sinh *</label>
                        <input
                          id="birth_date"
                          type="date"
                          value={form.birth_date}
                          onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                          className={errors.birth_date ? "input-error" : ""}
                        />
                        {errors.birth_date && (
                          <span className="field-error">{errors.birth_date}</span>
                        )}
                      </div>
                    </>
                  )}

                  <div className="form-field">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="email@gmail.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={errors.email ? "input-error" : ""}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  <div className="form-field">
                    <label htmlFor="password">Mật khẩu *</label>
                    <input
                      id="password"
                      type="password"
                      placeholder="Nhập mật khẩu"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={errors.password ? "input-error" : ""}
                    />
                    {errors.password && <span className="field-error">{errors.password}</span>}
                  </div>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="forgot-password-link"
                      onClick={() => {
                        setMode("forgot");
                        setErrors({});
                        setMessage("");
                        resetOtpStep();
                        resetForgotStep();
                      }}
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </>
              )}

              {message && <p className="section-state warning">{message}</p>}

              <button
                className="primary-btn form-submit"
                type="submit"
                disabled={
                  loading ||
                  (otpStep && countdown <= 0) ||
                  (mode === "forgot" && forgotStep !== "email" && countdown <= 0)
                }
                style={{
                  opacity:
                    loading ||
                    (otpStep && countdown <= 0) ||
                    (mode === "forgot" && forgotStep !== "email" && countdown <= 0)
                      ? 0.7
                      : 1,
                }}
              >
                {loading
                  ? "Đang xử lý..."
                  : otpStep
                    ? "Xác minh OTP"
                    : mode === "login"
                      ? "Đăng nhập"
                      : mode === "forgot"
                        ? forgotStep === "email"
                          ? "Gửi mã OTP"
                          : forgotStep === "code"
                            ? "Xác minh OTP"
                            : "Đặt mật khẩu mới"
                        : "Tạo tài khoản"}
              </button>

              {otpStep && (
                <button
                  className="secondary-btn form-submit"
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrors({});
                    setMessage("");
                    resetOtpStep();
                  }}
                >
                  Đăng ký lại
                </button>
              )}
              {mode === "forgot" && (
                <button
                  className="secondary-btn form-submit"
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrors({});
                    setMessage("");
                    resetForgotStep();
                  }}
                >
                  Quay lại đăng nhập
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthPage;
