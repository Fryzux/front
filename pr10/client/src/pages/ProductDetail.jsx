import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProduct(id)
      .then(data => setProduct(data))
      .catch(err => { console.error(err); navigate("/"); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      navigate("/");
    } catch (err) {
      alert("Ошибка удаления: " + (err?.response?.data?.error || err.message));
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <div><div className="spinner" />Загрузка...</div>
    </div>
  );
  if (!product) return <div className="container">Товар не найден</div>;

  return (
    <div className="container">
      <Link to="/" className="btn" style={{ marginBottom: 24, display: "inline-flex" }}>← Назад к списку</Link>
      <div className="detail-card">
        <img src={product.image} alt={product.name} onError={e => e.target.style.display = "none"} />
        <div className="detail-card-body">
          <h2>{product.name}</h2>
          <p><b>Категория:</b> {product.category}</p>
          <p>{product.description}</p>
          <p><b>Цена:</b> {product.price?.toLocaleString()} ₽</p>
          <p><b>В наличии:</b> {product.stock} шт.</p>
          <p>⭐ <b>{product.rating}</b></p>
          <div className="card-actions">
            <button className="btn edit-btn" onClick={() => navigate(`/edit/${product.id}`)}>✏️ Редактировать</button>
            <button className="btn danger-btn" onClick={handleDelete}>🗑️ Удалить</button>
          </div>
        </div>
      </div>
    </div>
  );
}
