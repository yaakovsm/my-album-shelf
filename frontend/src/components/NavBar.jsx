import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api';

export default function NavBar() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">My Music Collection</div>
        <div className="navbar-links">
          <span className="navbar-email">{user.email}</span>
          <button onClick={() => navigate('/dashboard')} className="navbar-link">
            Dashboard
          </button>
          <button onClick={() => navigate('/albums')} className="navbar-link">
            Albums
          </button>
          <button onClick={handleLogout} className="navbar-link">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

