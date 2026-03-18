import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

const ROLE_LABELS = { user: "👤 Пользователь", seller: "🏪 Продавец", admin: "👑 Администратор" };
const ROLE_COLORS = { user: "#10b981", seller: "#f59e0b", admin: "#7c3aed" };

export default function Users({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    api.getUsers()
      .then(data => setUsers(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleBlockToggle = async (id, isBlocked) => {
    if (id === user.id) {
      alert("Вы не можете заблокировать самого себя!");
      return;
    }
    
    if (!window.confirm(isBlocked ? "Разблокировать пользователя?" : "Заблокировать пользователя?")) return;
    
    try {
      if (isBlocked) {
        await api.unblockUser(id);
      } else {
        await api.blockUser(id);
      }
      loadUsers(); // Перезагружаем список
    } catch (err) {
      alert("Ошибка: " + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div className="container">
      <div className="header-toolbar">
        <h1>👑 Управление пользователями</h1>
        <div className="header-user">
          <Link to="/" className="btn">← К товарам</Link>
          <span className="role-badge" style={{ background: ROLE_COLORS[user?.role] + "22", color: ROLE_COLORS[user?.role], border: `1px solid ${ROLE_COLORS[user?.role]}55` }}>
            {ROLE_LABELS[user?.role]}
          </span>
          <span className="header-email">{user?.email}</span>
          <button className="btn danger-btn" onClick={onLogout}>Выйти</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: "50vh" }}>
          <div><div className="spinner" />Загрузка пользователей...</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.isBlocked ? "row-blocked" : ""}>
                  <td className="cell-id">{u.id}</td>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="role-badge" style={{ 
                      background: ROLE_COLORS[u.role] + "22", 
                      color: ROLE_COLORS[u.role], 
                      border: `1px solid ${ROLE_COLORS[u.role]}55` 
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    {u.isBlocked ? (
                      <span className="status-badge status-blocked">Заблокирован</span>
                    ) : (
                      <span className="status-badge status-active">Активен</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button 
                        className="btn edit-btn btn-sm" 
                        onClick={() => navigate(`/users/edit/${u.id}`)}
                      >
                        ✏️
                      </button>
                      <button 
                        className={`btn ${u.isBlocked ? 'success-btn' : 'danger-btn'} btn-sm`} 
                        onClick={() => handleBlockToggle(u.id, u.isBlocked)}
                        disabled={u.id === user.id}
                        title={u.isBlocked ? "Разблокировать" : "Заблокировать"}
                      >
                        {u.isBlocked ? "🔓" : "🔒"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
