import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute — защищает маршрут от неавторизованных пользователей
 * и опционально проверяет роль.
 * 
 * @param {object} user - текущий пользователь
 * @param {string[]} allowedRoles - список допустимых ролей (если не указан — разрешено всем авторизованным)
 */
export default function ProtectedRoute({ user, children, allowedRoles }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Нет нужной роли — перенаправляем на главную
    return <Navigate to="/" replace />;
  }

  return children;
}
