import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMsg(data.message);
    } catch {
      setMsg('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2>Forgot Password</h2>
      <p style={{ color: 'var(--text2)', marginBottom: '20px' }}>
        Enter your email and we'll send you a reset link.
      </p>
      {msg ? (
        <p style={{ color: '#4CAF50', padding: '12px', background: 'rgba(76,175,80,0.1)', borderRadius: '4px' }}>{msg}</p>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}
      <p style={{ marginTop: '16px' }}><Link to="/login">← Back to Login</Link></p>
    </div>
  );
}

const styles = {
  container: { maxWidth: '400px', margin: '60px auto', padding: '32px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '1rem', width: '100%' },
  btn: { padding: '10px', background: '#e94560', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
};
