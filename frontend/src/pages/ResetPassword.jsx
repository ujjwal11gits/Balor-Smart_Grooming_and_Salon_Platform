import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      navigate('/login', { state: { msg: 'Password reset! Please log in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Link may have expired.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2>Reset Password</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button style={styles.btn} type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <p><Link to="/login">← Back to Login</Link></p>
    </div>
  );
}

const styles = {
  container: { maxWidth: '400px', width: '90%', margin: '60px auto', padding: '24px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)', boxSizing: 'border-box' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '1rem', width: '100%' },
  btn: { padding: '10px', background: '#e94560', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
};
