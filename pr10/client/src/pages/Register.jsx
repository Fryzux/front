import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.register(form);
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.error || "Ошибка регистрации");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Регистрация</h2>
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Имя
            <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
          </label>
          <label>Фамилия
            <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required />
          </label>
          <label>Email
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>Пароль
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button type="submit" className="btn btn--primary">Зарегистрироваться</button>
        </form>
        <p className="auth-switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </div>
    </div>
  );
}
