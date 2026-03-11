import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProduct(id)
      .then(data => setForm({
        name: data.name || "",
        category: data.category || "",
        description: data.description || "",
        price: String(data.price ?? ""),
        stock: String(data.stock ?? ""),
        image: data.image || "",
      }))
      .catch(err => { console.error(err); navigate("/"); });
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.stock);
    if (!form.name.trim()) return setError("Введите название");
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return setError("Введите корректную цену");
    if (!Number.isFinite(parsedStock) || parsedStock < 0) return setError("Введите корректное количество");
    try {
      await api.updateProduct(id, { ...form, price: parsedPrice, stock: parsedStock });
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error || "Ошибка сохранения товара");
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (!form) return <div className="container">Загрузка...</div>;

  return (
    <div className="container" style={{ maxWidth: 500, margin: "0 auto" }}>
      <Link to="/" className="btn" style={{ marginBottom: 20, display: "inline-block" }}>← Назад</Link>
      <h2>Редактирование товара</h2>
      {error && <p className="error-msg">{error}</p>}
      <form className="form" onSubmit={handleSubmit}>
        <label className="label">Название<input className="input" value={form.name} onChange={set("name")} autoFocus /></label>
        <label className="label">Категория<input className="input" value={form.category} onChange={set("category")} /></label>
        <label className="label">Описание<textarea className="input" value={form.description} onChange={set("description")} rows="3" /></label>
        <label className="label">Цена<input className="input" type="number" value={form.price} onChange={set("price")} /></label>
        <label className="label">В наличии<input className="input" type="number" value={form.stock} onChange={set("stock")} /></label>
        <label className="label">Картинка (URL)<input className="input" value={form.image} onChange={set("image")} placeholder="https://..." /></label>
        {form.image && <img src={form.image} alt="Preview" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 10 }} onError={e => e.target.style.display = "none"} />}
        <div className="modal__footer">
          <Link to="/" className="btn">Отмена</Link>
          <button type="submit" className="btn btn--primary">Сохранить</button>
        </div>
      </form>
    </div>
  );
}
