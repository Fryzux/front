import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getUser(id)
      .then(data => setForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        role: data.role || "user",
      }))
      .catch(err => { console.error(err); navigate("/users"); });
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      return setError("Заполните все обязательные поля");
    }
    setLoading(true);
    try {
      await api.updateUser(id, form);
      navigate("/users");
    } catch (err) {
      setError(err?.response?.data?.error || "Ошибка сохранения профиля пользователя");
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (!form) return <div className="loading-screen"><div><div className="spinner" />Загрузка...</div></div>;

  return (
    <div className="container" style={{ maxWidth: 500, margin: "0 auto" }}>
      <Link to="/users" className="btn" style={{ marginBottom: 20, display: "inline-block" }}>← Назад к списку</Link>
      <h2>Редактирование пользователя</h2>
      {error && <p className="error-msg">{error}</p>}
      <form className="form" onSubmit={handleSubmit}>
        <label className="label">Имя
          <input className="input" value={form.first_name} onChange={set("first_name")} required />
        </label>
        <label className="label">Фамилия
          <input className="input" value={form.last_name} onChange={set("last_name")} required />
        </label>
        <label className="label">Email
          <input className="input" type="email" value={form.email} onChange={set("email")} required />
        </label>
        <label className="label">Роль
          <select value={form.role} onChange={set("role")} className="input">
            <option value="user">👤 Пользователь</option>
            <option value="seller">🏪 Продавец</option>
            <option value="admin">👑 Администратор</option>
          </select>
        </label>
        <div className="modal__footer">
          <Link to="/users" className="btn">Отмена</Link>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
