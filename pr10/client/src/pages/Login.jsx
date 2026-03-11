import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.login(form);
      setUser({ email: form.email, ...data });
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error || "Ошибка входа");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Вход в систему</h2>
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Email
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>Пароль
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button type="submit" className="btn btn--primary">Войти</button>
        </form>
        <p className="auth-switch">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
      </div>
    </div>
  );
}
