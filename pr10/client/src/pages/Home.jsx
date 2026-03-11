import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Home({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getProducts()
      .then(data => setProducts(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Ошибка удаления: " + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div className="container">
      <div className="header-toolbar">
        <h1>🌸 Корейская косметика</h1>
        <div className="header-user">
          <button className="btn btn--primary create-btn" onClick={() => navigate("/create")}>
            + Создать товар
          </button>
          <span className="header-email">{user?.email || user?.first_name}</span>
          <button className="btn danger-btn" onClick={onLogout}>Выйти</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: "50vh" }}>
          <div>
            <div className="spinner" />
            Загрузка товаров...
          </div>
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 80 }}>
          <p style={{ fontSize: "3rem", marginBottom: 12 }}>📦</p>
          <p>Товаров пока нет. Создайте первый!</p>
        </div>
      ) : (
        <div className="grid">
          {products.map(p => (
            <div key={p.id} className="card">
              <img src={p.image} alt={p.name} onError={e => e.target.style.display = "none"} />
              <h3>{p.name}</h3>
              <p><b>Категория:</b> {p.category}</p>
              <p>{p.description}</p>
              <p><b>Цена:</b> {p.price?.toLocaleString()} ₽</p>
              <p><b>Наличие:</b> {p.stock} шт.</p>
              <p>⭐ {p.rating}</p>
              <div className="card-actions">
                <Link to={`/product/${p.id}`} className="btn">Подробнее</Link>
                <button className="btn edit-btn" onClick={() => navigate(`/edit/${p.id}`)}>✏️ Изменить</button>
                <button className="btn danger-btn" onClick={() => handleDelete(p.id)}>🗑️ Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
