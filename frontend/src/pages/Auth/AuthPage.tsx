import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../../services/authService";

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    full_name: "",
    email: "admin@gmail.com",
    phone: "",
    password: "admin123",
  });
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }

      navigate("/profile");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Không xử lý được yêu cầu.");
    }
  };

  return (
    <section className="app-page">
      <div className="container app-grid two">
        <div>
          <p className="eyebrow">Account</p>
          <h1>{mode === "login" ? "Đăng nhập" : "Đăng ký"}</h1>
          <p className="muted">Dùng tài khoản mẫu: admin@gmail.com / admin123.</p>
        </div>

        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="segmented">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Login
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Register
            </button>
          </div>

          {mode === "register" && (
            <>
              <label>Họ tên</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <label>Số điện thoại</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </>
          )}

          <label>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {message && <p className="section-state warning">{message}</p>}
          <button className="primary-btn form-submit" type="submit">
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default AuthPage;
