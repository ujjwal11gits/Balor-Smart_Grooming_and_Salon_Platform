import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', phone: '', salonName: '', salonAddress: '', salonCity: '', salonRegId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'shop' || roleParam === 'user') {
      setForm((prev) => ({ ...prev, role: roleParam }));
    }
  }, [location.search]);

  const [step, setStep] = useState('credentials');
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);
  const [testOtp, setTestOtp] = useState('');

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
            const roadParts = [addr.house_number, addr.road, addr.neighbourhood, addr.suburb].filter(Boolean);
            const streetAddr = roadParts.join(', ') || data.display_name;
            setForm((prev) => ({
              ...prev,
              salonAddress: streetAddr,
              salonCity: city
            }));
          } else if (data && data.display_name) {
            setForm((prev) => ({ ...prev, salonAddress: data.display_name, salonCity: '' }));
          } else {
            setForm((prev) => ({ ...prev, salonAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, salonCity: '' }));
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err);
          setForm((prev) => ({ ...prev, salonAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        let msg = 'Failed to get location.';
        if (err.code === 1) msg = 'Location permission denied.';
        setError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validations
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Enter name';
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Enter valid email';
    }
    if (form.password.length < 6) {
      errors.password = 'Min 6 chars';
    }
    if (form.phone.trim()) {
      const cleanedPhone = form.phone.replace(/^(?:\+91|91)/, '').replace(/[\s\-]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
        errors.phone = 'Enter valid phone';
      }
    }
    if (form.role === 'shop') {
      if (!form.salonName.trim()) {
        errors.salonName = 'Enter salon name';
      }
      if (!form.salonAddress.trim()) {
        errors.salonAddress = 'Enter street address';
      }
      if (!form.salonCity.trim()) {
        errors.salonCity = 'Enter city / area';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role !== 'shop') { 
        delete payload.salonName; 
        delete payload.salonAddress; 
        delete payload.salonCity; 
      }
      const { data } = await api.post('/auth/register', payload);
      if (data.requiresOtp) {
        const parts = data.email.split('@');
        const masked = parts[0].slice(0, 2) + '***@' + parts[1];
        setMaskedEmail(masked);
        setTempToken(data.tempToken);
        if (data.testOtp) {
          setTestOtp(data.testOtp);
        }
        setStep('otp');
        startCooldown();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Please enter all 6 digits'); return; }
    setOtpError('');
    setVerifying(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { tempToken, otp: code });
      login(data);
      if (data.role === 'shop') navigate('/shop/dashboard');
      else navigate('/');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (otp.join('').length === 6 && step === 'otp') handleVerify();
  }, [otp]);

  const startCooldown = () => {
    setResendCooldown(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCooldown((v) => { if (v <= 1) { clearInterval(timerRef.current); return 0; } return v - 1; });
    }, 1000);
  };
  
  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div style={page} className="register-page-container">
      <div style={formPanel} className="register-form-panel">
        <div style={formCard}>
          {step === 'credentials' && (
            <>
              <div style={{ marginBottom: '28px' }}>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', marginBottom: '28px' }}>
                  <span>✂</span> Balor
                </Link>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Create your account</h2>
                <p style={{ color: 'var(--text2)', marginTop: '5px', fontSize: '0.92rem' }}>Join thousands of happy users</p>
              </div>

              {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleSubmit} style={formStyle} noValidate>
                <div className="register-form-grid">
                  <div className="field-group">
                    <label className="field-label">Full Name</label>
                    <input className={`field-input ${fieldErrors.name ? 'input-error' : ''}`} placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    {fieldErrors.name && <span style={errorTextStyle}>{fieldErrors.name}</span>}
                  </div>
                  <div className="field-group">
                    <label className="field-label">Phone</label>
                    <input className={`field-input ${fieldErrors.phone ? 'input-error' : ''}`} placeholder="+91 99999 00000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    {fieldErrors.phone && <span style={errorTextStyle}>{fieldErrors.phone}</span>}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Email</label>
                  <input className={`field-input ${fieldErrors.email ? 'input-error' : ''}`} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  {fieldErrors.email && <span style={errorTextStyle}>{fieldErrors.email}</span>}
                </div>

                 <div className="field-group">
                  <label className="field-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className={`field-input ${fieldErrors.password ? 'input-error' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
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
                  {fieldErrors.password && <span style={errorTextStyle}>{fieldErrors.password}</span>}
                </div>

                <div className="field-group">
                  <label className="field-label">I am a</label>
                  <div style={roleSelector}>
                    {[
                      { value: 'user', label: 'Customer',   icon: '👤' },
                      { value: 'shop', label: 'Shop Owner', icon: '🏪' },
                    ].map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm({ ...form, role: r.value })}
                        style={{ ...roleBtn, ...(form.role === r.value ? roleBtnActive : {}) }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{r.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extra fields for shop owners */}
                {form.role === 'shop' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(233,69,96,0.04)', borderRadius: '10px', border: '1px solid rgba(233,69,96,0.15)' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>🏪 Salon Details</p>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">Salon Name</label>
                      <input className={`field-input ${fieldErrors.salonName ? 'input-error' : ''}`} placeholder="e.g. Classic Cuts Barbershop" value={form.salonName} onChange={(e) => setForm({ ...form, salonName: e.target.value })} required={form.role === 'shop'} />
                      {fieldErrors.salonName && <span style={errorTextStyle}>{fieldErrors.salonName}</span>}
                    </div>
                    <div className="field-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="field-label">Street Address</label>
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={locating}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {locating ? '⏳ Locating...' : '📍 Use Current Location'}
                        </button>
                      </div>
                      <input className={`field-input ${fieldErrors.salonAddress ? 'input-error' : ''}`} placeholder="e.g. Flat/Room No, Building, Street" value={form.salonAddress} onChange={(e) => setForm({ ...form, salonAddress: e.target.value })} required={form.role === 'shop'} />
                      {fieldErrors.salonAddress && <span style={errorTextStyle}>{fieldErrors.salonAddress}</span>}
                    </div>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">City / Area</label>
                      <input className={`field-input ${fieldErrors.salonCity ? 'input-error' : ''}`} placeholder="e.g. Siwan" value={form.salonCity} onChange={(e) => setForm({ ...form, salonCity: e.target.value })} required={form.role === 'shop'} />
                      {fieldErrors.salonCity && <span style={errorTextStyle}>{fieldErrors.salonCity}</span>}
                    </div>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">Registration ID (Optional)</label>
                      <input className="field-input" placeholder="e.g. REG-123456" value={form.salonRegId} onChange={(e) => setForm({ ...form, salonRegId: e.target.value })} />
                    </div>
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '4px' }}>
                  {loading ? 'Sending OTP…' : 'Create Account'}
                </button>
              </form>

              <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '0.9rem', marginTop: '20px' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ fontWeight: 600, color: 'var(--accent)' }}>Sign in</Link>
              </p>
            </>
          )}

          {step === 'otp' && (
            <>
              <button onClick={() => { setStep('credentials'); setOtp(['','','','','','']); setOtpError(''); }} style={backBtn}>← Back</button>
              <div style={{ marginBottom: '28px', textAlign: 'center' }}>
                <div style={otpIconWrap}>📧</div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: '12px 0 6px' }}>Verify your email</h2>
                <p style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  We sent a 6-digit OTP to<br /><strong style={{ color: 'var(--text)' }}>{maskedEmail}</strong>
                </p>
                {testOtp && (
                  <div style={{ marginTop: '14px', fontSize: '0.82rem', padding: '10px 14px', borderRadius: '8px', background: 'rgba(59,130,246,0.06)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.18)', display: 'inline-block', fontWeight: 500 }}>
                    📧 <strong>Test Mode</strong>: OTP is: <strong style={{ fontSize: '0.95rem', letterSpacing: '1px' }}>{testOtp}</strong>
                  </div>
                )}
              </div>

              {otpError && <div className="alert-error" style={{ marginBottom: '16px', textAlign: 'center' }}>{otpError}</div>}

              <form onSubmit={handleVerify}>
                <div style={otpGrid} onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      style={{ ...otpInput, ...(digit ? otpInputFilled : {}), borderColor: otpError ? '#dc2626' : digit ? 'var(--accent)' : 'var(--border)' }}
                      aria-label={`OTP digit ${idx + 1}`}
                    />
                  ))}
                </div>

                <button className="btn-primary" type="submit" disabled={verifying || otp.join('').length < 6} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '20px' }}>
                  {verifying ? 'Verifying…' : 'Verify OTP'}
                </button>
              </form>

              <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '0.87rem', marginTop: '20px' }}>
                Didn't receive it?{' '}
                {resendCooldown > 0
                  ? <span style={{ color: 'var(--text3)' }}>Resend in {resendCooldown}s</span>
                  : <span style={{ color: 'var(--text3)' }}>Please restart registration to try again.</span>
                }
              </p>
            </>
          )}
        </div>
      </div>

      <div style={brandPanel} className="register-brand-panel">
        <div style={brandContent}>
          <div style={statsGrid}>
            {[
              { value: '500+', label: 'Salons' },
              { value: '2k+', label: 'Barbers' },
              { value: '50k+', label: 'Happy customers' },
              { value: '4.8★', label: 'Average rating' },
            ].map((s) => (
              <div key={s.label} style={statItem}>
                <div style={statValue}>{s.value}</div>
                <div style={statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
          <p style={brandQuote}>"The best barbershop booking app I've ever used."</p>
          <p style={brandAuthor}>— A satisfied customer</p>
        </div>
        <div style={brandOverlay} />
      </div>
      <style>{`
        .input-error {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px rgba(233,69,96,0.12) !important;
        }
        .register-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .register-page-container {
            flex-direction: column !important;
          }
          .register-brand-panel {
            display: none !important;
          }
          .register-form-panel {
            padding: 32px 16px !important;
          }
        }
        @media (max-width: 500px) {
          .register-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

const page = { display: 'flex', minHeight: 'calc(100vh - 60px)' };

const formPanel = {
  flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '48px 24px', background: 'var(--bg)',
};
const formCard = { width: '100%', maxWidth: '440px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '16px' };
const roleSelector = { display: 'flex', gap: '10px' };
const roleBtn = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
  padding: '12px 8px',
  border: '1.5px solid var(--border)',
  borderRadius: '10px',
  cursor: 'pointer',
  background: 'var(--card)',
  color: 'var(--text2)',
  fontFamily: 'inherit',
  transition: 'all 0.18s',
};
const roleBtnActive = {
  border: '1.5px solid var(--accent)',
  background: 'rgba(233,69,96,0.06)',
  color: 'var(--accent)',
};

const brandPanel = {
  flex: '1',
  background: 'linear-gradient(145deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '48px', position: 'relative', overflow: 'hidden',
};
const brandOverlay = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(ellipse at 30% 60%, rgba(233,69,96,0.15) 0%, transparent 60%)',
  pointerEvents: 'none',
};
const brandContent = { position: 'relative', zIndex: 1, textAlign: 'center' };
const statsGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' };
const statItem = { textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' };
const statValue = { fontSize: '1.8rem', fontWeight: 800, color: '#e94560', letterSpacing: '-0.03em' };
const statLabel = { fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' };
const brandQuote = { fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', lineHeight: 1.6 };
const brandAuthor = { color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '8px' };

const backBtn = {
  background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
  fontSize: '0.9rem', marginBottom: '20px', padding: 0, fontFamily: 'inherit', fontWeight: 500,
};
const otpIconWrap = {
  width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(233,69,96,0.1)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
  margin: '0 auto', color: 'var(--accent)',
};
const otpGrid = {
  display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px',
};
const otpInput = {
  width: '45px', height: '55px', borderRadius: '10px', border: '1.5px solid var(--border)',
  background: 'var(--input-bg)', textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
  color: 'var(--text)', transition: 'all 0.2s', outline: 'none',
};
const otpInputFilled = {
  borderColor: 'var(--accent)', background: 'rgba(233,69,96,0.02)',
};

const errorTextStyle = {
  color: 'var(--accent)',
  fontSize: '0.78rem',
  marginTop: '4px',
  fontWeight: 500,
  textAlign: 'left',
};
