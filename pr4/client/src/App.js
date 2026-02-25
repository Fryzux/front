import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get("/api/products").then(res => setProducts(res.data));
  }, []);

  return (
    <div className="container">
      <h1>Интернет-магазин корейской косметики</h1>
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;