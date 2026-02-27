import { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css";
import ProductModal from "./components/ProductModal";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

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


  return (
    <div className="container">
      <div className="header-toolbar">
        <h1>Интернет-магазин корейской косметики</h1>
        <button className="btn btn--primary create-btn" onClick={openCreate}>+ Создать товар</button>
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
              <div className="card-actions">
                <button className="btn edit-btn" onClick={() => openEdit(p)}>Редактировать</button>
                <button className="btn danger-btn" onClick={() => handleDelete(p.id)}>Удалить</button>
              </div>
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
    </div>
  );
}

export default App;