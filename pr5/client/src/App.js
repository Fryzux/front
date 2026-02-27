import { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css";
import UserModal from "./components/UserModal";

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setModalMode("edit");
    setEditingUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Удалить пользователя?");
    if (!ok) return;

    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert("Ошибка удаления пользователя");
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newUser = await api.createUser(payload);
        setUsers((prev) => [...prev, newUser]);
      } else {
        const updatedUser = await api.updateUser(payload.id, payload);
        setUsers((prev) =>
          prev.map((u) => (u.id === payload.id ? updatedUser : u))
        );
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения пользователя");
    }
  };


  return (
    <div className="container">
      <div className="header-toolbar">
        <h1>Управление Пользователями (Swagger API)</h1>
        <button className="btn btn--primary create-btn" onClick={openCreate}>+ Создать пользователя</button>
      </div>

      {loading ? (
        <div>Загрузка пользователей...</div>
      ) : (
        <div className="grid">
          {users.map(u => (
            <div key={u.id} className="card">
              <h3>{u.name}</h3>
              <p><b>Возраст:</b> {u.age}</p>
              <div className="card-actions">
                <button className="btn edit-btn" onClick={() => openEdit(u)}>Редактировать</button>
                <button className="btn danger-btn" onClick={() => handleDelete(u.id)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UserModal
        open={modalOpen}
        mode={modalMode}
        initialUser={editingUser}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}

export default App;