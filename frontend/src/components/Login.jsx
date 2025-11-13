import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@my-album-shelf.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      nav('/dashboard', { replace: true });
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h2 style={styles.heading}>Sign in</h2>
        <label style={styles.label}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
        <label style={styles.label}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
        {err && <div style={styles.err}>{err}</div>}
        <button disabled={loading} style={styles.btn}>{loading ? '...' : 'Login'}</button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f6f6f6' },
  card: { width: 320, background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.08)' },
  heading: { margin: '0 0 20px 0', fontSize: 24, fontWeight: 600, color: '#1a1a1a' },
  label: { display: 'block', marginTop: 12, fontSize: 12, color: '#333', fontWeight: 500 },
  input: { 
    width: '100%', 
    padding: 10, 
    marginTop: 4, 
    borderRadius: 8, 
    border: '1px solid #ddd',
    background: '#fff',
    color: '#1a1a1a',
    fontSize: 14
  },
  err: { color: '#b00020', marginTop: 10, fontSize: 13 },
  btn: { width: '100%', marginTop: 16, padding: 10, borderRadius: 8, border: 0, background: '#b22222', color: '#fff', cursor: 'pointer', fontWeight: 600 }
};
