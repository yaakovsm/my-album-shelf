import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const hasToken = !!localStorage.getItem('authToken');
  return hasToken ? children : <Navigate to="/login" replace />;
}
