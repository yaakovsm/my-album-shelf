import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Albums from './components/Albums';
import NavBar from './components/NavBar';

function ProtectedLayout({ children }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

function RootRedirect() {
  const hasToken = !!localStorage.getItem('authToken');
  return hasToken ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/albums"
        element={
          <RequireAuth>
            <ProtectedLayout>
              <Albums />
            </ProtectedLayout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
