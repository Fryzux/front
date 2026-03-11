import { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css";
import ProductModal from "./components/ProductModal";

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (localStorage.getItem('accessToken')) {
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err) {
        console.error("Авторизация истекла", err);
        api.logout();
      }
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки товаров");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    if (!user) {
      setAuthMode("login");
      setAuthModalOpen(true);
      return;
    }
    setModalMode("create");
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setModalMode("edit");
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Удалить товар?");
    if (!ok) return;

    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Ошибка удаления товара");
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newProduct = await api.createProduct(payload);
        setProducts((prev) => [...prev, newProduct]);
      } else {
        const updatedProduct = await api.updateProduct(payload.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.id ? updatedProduct : p))
        );
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения товара");
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (authMode === "login") {
        await api.login({ email: authForm.email, password: authForm.password });
        setUser({ email: authForm.email });
        setAuthModalOpen(false);
      } else {
        await api.register(authForm);
        setAuthMode("login");
        alert("Регистрация успешна! Теперь вы можете войти.");
      }
    } catch (err) {
      alert("Ошибка: " + (err?.response?.data?.error || err.message));
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setAuthForm({ email: "", password: "", first_name: "", last_name: "" });
  };

  return (
    <div className="container">
      <div className="header-toolbar">
        <h1>Интернет-магазин корейской косметики</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn--primary create-btn" onClick={openCreate}>+ Создать товар</button>
          {user ? (
            <>
              <span style={{ margin: '0 15px' }}>{user.email}</span>
              <button className="btn" onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <button className="btn btn--primary" style={{ background: '#f1f5f9', color: '#1e293b' }} onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}>Вход / Регистрация</button>
          )}
        </div>
      </div>

      {loading ? (
        <div>Загрузка товаров...</div>
      ) : (
        <div className="grid">
          {products.map(p => (
            <div key={p.id} className="card">
              <img src={p.image} alt={p.name} />
              <h3>{p.name}</h3>
              <p><b>Категория:</b> {p.category}</p>
              <p>{p.description}</p>
              <p><b>Цена:</b> {p.price} ₽</p>
              <p><b>В наличии:</b> {p.stock}</p>
              <p>⭐ {p.rating}</p>
              {user && (
                <div className="card-actions">
                  <button className="btn edit-btn" onClick={() => openEdit(p)}>Редактировать</button>
                  <button className="btn danger-btn" onClick={() => handleDelete(p.id)}>Удалить</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />

      {authModalOpen && (
        <div className="auth-modal-overlay">
          <div className="auth-modal-content">
            <button className="auth-modal-close" onClick={() => setAuthModalOpen(false)}>×</button>
            <h2>{authMode === "login" ? "Вход" : "Регистрация"}</h2>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} required />
              {authMode === "register" && (
                <>
                  <input type="text" placeholder="Имя" value={authForm.first_name} onChange={e => setAuthForm({ ...authForm, first_name: e.target.value })} required />
                  <input type="text" placeholder="Фамилия" value={authForm.last_name} onChange={e => setAuthForm({ ...authForm, last_name: e.target.value })} required />
                </>
              )}
              <input type="password" placeholder="Пароль" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required />
              <button type="submit" className="btn btn--primary" style={{ marginTop: 10 }}>{authMode === "login" ? "Войти" : "Зарегистрироваться"}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={{ marginTop: 15, background: 'none', border: 'none', color: '#646cff', cursor: 'pointer', padding: 0 }}>
              {authMode === "login" ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;