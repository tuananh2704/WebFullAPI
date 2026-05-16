import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../../services/authService";

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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.email.trim()) {
      errs.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Email không hợp lệ";
    }

    if (!form.password.trim()) {
      errs.password = "Vui lòng nhập mật khẩu";
    } else if (form.password.length < 4) {
      errs.password = "Mật khẩu phải có ít nhất 4 ký tự";
    }

    if (mode === "register") {
      if (!form.full_name.trim()) {
        errs.full_name = "Vui lòng nhập họ tên";
      }
      if (form.phone && !/^0\d{9}$/.test(form.phone)) {
        errs.phone = "Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate("/");
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
          {/* Left panel */}
          <div className="auth-info-panel">
            <p className="eyebrow">Account</p>
            <h1 style={{ marginBottom: 16 }}>
              {mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
            </h1>
            <p className="muted" style={{ marginBottom: 28, lineHeight: 1.6 }}>
              {mode === "login"
                ? "Đăng nhập để đặt vé xem phim tại CINEMAX. Chọn tài khoản demo bên dưới hoặc nhập thông tin của bạn."
                : "Tạo tài khoản mới để trải nghiệm đặt vé trực tuyến."}
            </p>

            {mode === "login" && (
              <div className="demo-accounts">
                <h3 style={{ marginBottom: 12, fontSize: 15, color: "#ccc" }}>
                  📋 Tài khoản demo (mật khẩu: 123456)
                </h3>
                <div className="demo-account-grid">
                  {DEMO_ACCOUNTS.slice(0, 10).map((acc) => (
                    <button
                      key={acc.email}
                      className={`demo-account-btn ${form.email === acc.email ? "active" : ""}`}
                      onClick={() => handleQuickLogin(acc.email)}
                      type="button"
                    >
                      <span className="demo-avatar">
                        {acc.name.charAt(0)}
                      </span>
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

          {/* Right panel - Form */}
          <div className="auth-form-panel">
            <div className="segmented" style={{ marginBottom: 20 }}>
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => { setMode("login"); setErrors({}); setMessage(""); }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => { setMode("register"); setErrors({}); setMessage(""); }}
              >
                Đăng ký
              </button>
            </div>

            <form className="stack" onSubmit={handleSubmit} noValidate>
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
                    {errors.full_name && <span className="field-error">{errors.full_name}</span>}
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

              {message && <p className="section-state warning">{message}</p>}

              <button
                className="primary-btn form-submit"
                type="submit"
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Đang xử lý..." : mode === "login" ? "🔐 Đăng nhập" : "✨ Tạo tài khoản"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthPage;
