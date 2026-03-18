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
import Users from "./pages/Users";
import EditUser from "./pages/EditUser";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      api.getMe()
        .then(data => setUser(data))
        .catch(() => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  if (loading) return (
    <div className="loading-screen">
      <div><div className="spinner" />Загрузка...</div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные маршруты (гость) */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

        {/* Защищённые маршруты — любой авторизованный пользователь */}
        <Route path="/" element={
          <ProtectedRoute user={user}>
            <Home user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/product/:id" element={
          <ProtectedRoute user={user}>
            <ProductDetail user={user} />
          </ProtectedRoute>
        } />

        {/* Маршруты для продавца и администратора */}
        <Route path="/create" element={
          <ProtectedRoute user={user} allowedRoles={["seller", "admin"]}>
            <CreateProduct />
          </ProtectedRoute>
        } />
        <Route path="/edit/:id" element={
          <ProtectedRoute user={user} allowedRoles={["seller", "admin"]}>
            <EditProduct />
          </ProtectedRoute>
        } />

        {/* Маршруты только для администратора */}
        <Route path="/users" element={
          <ProtectedRoute user={user} allowedRoles={["admin"]}>
            <Users user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/users/edit/:id" element={
          <ProtectedRoute user={user} allowedRoles={["admin"]}>
            <EditUser />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
