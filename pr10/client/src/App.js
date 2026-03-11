import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api";
import "./App.css";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import CreateProduct from "./pages/CreateProduct";
import EditProduct from "./pages/EditProduct";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      api.getMe()
        .then(data => setUser(data))
        .catch(() => api.logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Загрузка...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

        {/* Защищённые маршруты — только для авторизованных */}
        <Route path="/" element={
          <ProtectedRoute user={user}>
            <Home user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/product/:id" element={
          <ProtectedRoute user={user}>
            <ProductDetail />
          </ProtectedRoute>
        } />
        <Route path="/create" element={
          <ProtectedRoute user={user}>
            <CreateProduct />
          </ProtectedRoute>
        } />
        <Route path="/edit/:id" element={
          <ProtectedRoute user={user}>
            <EditProduct />
          </ProtectedRoute>
        } />

        {/* Любой другой путь — на главную */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;