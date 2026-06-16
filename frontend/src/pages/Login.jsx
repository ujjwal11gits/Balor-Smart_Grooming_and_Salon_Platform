import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow states
  const [mode, setMode] = useState('login'); // login | forgot-email | forgot-otp | forgot-reset
  const [forgotEmail, setForgotEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [testOtp, setTestOtp] = useState('');

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      if (data.role === 'user') navigate('/');
      else if (data.role === 'shop') navigate('/shop/dashboard');
      else navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password-otp', { email: forgotEmail });
      setTempToken(data.tempToken);
      if (data.testOtp) {
        setTestOtp(data.testOtp);
      }
      setMode('forgot-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { tempToken, otp });
      setResetToken(data.resetToken);
      setMode('forgot-reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password-otp', { resetToken, password: newPassword });
      setSuccessMessage(data.message || 'Password reset successful!');
      setMode('login');
      setForm({ email: forgotEmail, password: '' });
      setForgotEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTempToken('');
      setResetToken('');
      setTestOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please request OTP again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page} className="login-page-container">
      {/* Left branding panel */}
      <div style={brandPanel} className="login-brand-panel">
        <div style={brandContent}>
          <div style={logoArea}>
            <span style={{ fontSize: '2.5rem' }}>✂</span>
          </div>
          <h1 style={brandTitle}>Balor</h1>
          <p style={brandSubtitle}>Smart Grooming & Salon Platform</p>
          <div style={featureList}>
            {['Browse top-rated barbershops', 'Pick your favourite barber', 'Book a slot instantly', 'Track & manage bookings'].map((f) => (
              <div key={f} style={featureItem}>
                <span style={checkmark}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={brandOverlay} />
      </div>

      {/* Right form panel */}
      <div style={formPanel} className="login-form-panel">
        <div style={formCard}>

          {mode === 'login' && (
            <>
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Welcome back</h2>
                <p style={{ color: 'var(--text2)', marginTop: '5px', fontSize: '0.92rem' }}>Sign in to your account</p>
              </div>

              {successMessage && (
                <div style={{ marginBottom: '16px', color: '#4CAF50', padding: '12px', background: 'rgba(76,175,80,0.1)', borderRadius: '6px', border: '1px solid rgba(76,175,80,0.2)', fontSize: '0.9rem' }}>
                  🎉 {successMessage}
                </div>
              )}

              {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleCredentials} style={formStyle}>
                <div className="field-group">
                  <label className="field-label">Email</label>
                  <input className="field-input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="field-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="field-label">Password</label>
                    <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setSuccessMessage(''); setForgotEmail(form.email); setMode('forgot-email'); }} style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Forgot password?</a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="field-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        color: 'var(--text3)',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '4px' }}>
                  {loading ? 'Logging in…' : 'Login'}
                </button>
              </form>

              <div className="divider-text" style={{ margin: '20px 0' }}>or</div>
              <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '0.9rem' }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ fontWeight: 600, color: 'var(--accent)' }}>Create one</Link>
              </p>
            </>
          )}

          {mode === 'forgot-email' && (
            <>
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Reset password</h2>
                <p style={{ color: 'var(--text2)', marginTop: '5px', fontSize: '0.92rem' }}>Enter your email to receive an OTP code</p>
              </div>

              {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleForgotEmail} style={formStyle}>
                <div className="field-group">
                  <label className="field-label">Email</label>
                  <input className="field-input" type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                </div>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '4px' }}>
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setMode('login'); }} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>← Back to login</a>
              </p>
            </>
          )}

          {mode === 'forgot-otp' && (
             <>
               <div style={{ marginBottom: '28px' }}>
                 <h2 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Verify OTP</h2>
                 <p style={{ color: 'var(--text2)', marginTop: '5px', fontSize: '0.92rem' }}>Enter the 6-digit OTP code sent to <strong style={{ color: 'var(--text)' }}>{forgotEmail}</strong></p>
                 {testOtp && (
                   <div style={{ marginTop: '14px', fontSize: '0.82rem', padding: '10px 14px', borderRadius: '8px', background: 'rgba(59,130,246,0.06)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.18)', display: 'inline-block', fontWeight: 500, width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
                     📧 <strong>Test Mode</strong>: OTP is: <strong style={{ fontSize: '0.95rem', letterSpacing: '1px' }}>{testOtp}</strong>
                   </div>
                 )}
               </div>

              {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleVerifyOtp} style={formStyle}>
                <div className="field-group">
                  <label className="field-label">OTP Code</label>
                  <input 
                    className="field-input" 
                    type="text" 
                    placeholder="123456" 
                    maxLength={6} 
                    pattern="\d{6}" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                    style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }} 
                    required 
                  />
                </div>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '4px' }}>
                  {loading ? 'Verifying…' : 'Verify OTP'}
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontSize: '0.9rem' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setMode('forgot-email'); }} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>← Change email</a>
                <a href="#" onClick={(e) => { e.preventDefault(); handleForgotEmail(e); }} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Resend OTP</a>
              </div>
            </>
          )}

          {mode === 'forgot-reset' && (
            <>
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>New password</h2>
                <p style={{ color: 'var(--text2)', marginTop: '5px', fontSize: '0.92rem' }}>Choose a secure new password for your account</p>
              </div>

              {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleResetPassword} style={formStyle}>
                <div className="field-group">
                  <label className="field-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="field-input"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        color: 'var(--text3)',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="field-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        color: 'var(--text3)',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '4px' }}>
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setMode('login'); }} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>← Back to login</a>
              </p>
            </>
          )}

        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .login-page-container {
            flex-direction: column !important;
          }
          .login-brand-panel {
            display: none !important;
          }
          .login-form-panel {
            padding: 32px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}


const page = {
  display: 'flex',
  minHeight: 'calc(100vh - 60px)',
};

const brandPanel = {
  flex: '1',
  background: 'linear-gradient(145deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px',
  position: 'relative',
  overflow: 'hidden',
};

const brandOverlay = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(ellipse at 60% 40%, rgba(233,69,96,0.18) 0%, transparent 60%)',
  pointerEvents: 'none',
};

const brandContent = { position: 'relative', zIndex: 1 };

const logoArea = {
  width: '64px', height: '64px',
  background: 'linear-gradient(135deg, #e94560, #a0153e)',
  borderRadius: '18px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: '20px',
  boxShadow: '0 8px 32px rgba(233,69,96,0.35)',
};

const brandTitle = {
  fontSize: '2.2rem', fontWeight: 800,
  color: '#fff', letterSpacing: '-0.04em',
  marginBottom: '8px',
};

const brandSubtitle = {
  fontSize: '1rem', color: 'rgba(255,255,255,0.55)',
  marginBottom: '32px',
};

const featureList = { display: 'flex', flexDirection: 'column', gap: '12px' };

const featureItem = {
  display: 'flex', alignItems: 'center', gap: '10px',
  color: 'rgba(255,255,255,0.75)', fontSize: '0.92rem',
};

const checkmark = {
  width: '20px', height: '20px',
  background: 'rgba(233,69,96,0.2)',
  border: '1.5px solid rgba(233,69,96,0.5)',
  borderRadius: '50%',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '0.7rem', color: '#e94560', fontWeight: 700,
  flexShrink: 0,
};

const formPanel = {
  flex: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
  background: 'var(--bg)',
};

const formCard = {
  width: '100%',
  maxWidth: '400px',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

