import { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const STATUS_CONFIG = {
  pending:   { cls: 'badge-pending',   label: 'Pending' },
  confirmed: { cls: 'badge-confirmed', label: 'Confirmed' },
  completed: { cls: 'badge-completed', label: 'Completed' },
  cancelled: { cls: 'badge-cancelled', label: 'Cancelled' },
};

export default function BarberDashboard() {
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [filter, setFilter] = useState(() => localStorage.getItem('barberFilterTab') || 'all');
  const [loading, setLoading] = useState(true);
  const [completingBooking, setCompletingBooking] = useState(null);

  useEffect(() => {
    localStorage.setItem('barberFilterTab', filter);
  }, [filter]);

  const fetchAll = async () => {
    const [b, e] = await Promise.all([
      api.get('/bookings/barber'),
      api.get('/bookings/barber/earnings'),
    ]);
    setBookings(b.data);
    setEarnings(e.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id, status, otp = undefined) => {
    await api.patch(`/bookings/${id}/status`, { status, otp });
    fetchAll();
  };

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) return <div className="page-wrapper"><LoadingSkeleton rows={4} height={100} /></div>;

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em' }}>My Dashboard</h2>
        <p style={{ color: 'var(--text2)', marginTop: '5px' }}>Manage your bookings and track earnings</p>
      </div>

      {/* Earnings stats */}
      {earnings && (
        <div style={statsGrid}>
          <StatCard icon="💰" label="Total Earnings" value={`₹${earnings.total.toLocaleString()}`} sub="All time" color="#e94560" />
          <StatCard icon="📅" label="This Month" value={`₹${earnings.thisMonth.toLocaleString()}`} sub="Month to date" color="#d97706" />
          <StatCard icon="✅" label="Completed" value={earnings.completedCount} sub="bookings" color="#059669" />
          <StatCard icon="📋" label="Total Bookings" value={bookings.length} sub="all time" color="#2563eb" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="tab-bar">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((f) => (
          <button
            key={f}
            className={`tab-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span style={{ marginLeft: '5px', fontSize: '0.72rem', opacity: 0.7 }}>
                ({bookings.filter((b) => b.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          No bookings found
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((b) => {
          const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
          return (
            <div key={b._id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.97rem' }}>{b.userId?.name}</span>
                  {b.userId?.phone && (
                    <span style={{ color: 'var(--text3)', marginLeft: '8px', fontSize: '0.82rem' }}>{b.userId.phone}</span>
                  )}
                </div>
                <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.86rem', color: 'var(--text2)', marginBottom: b.notes ? '6px' : '0' }}>
                <span><b style={{ color: 'var(--text)' }}>{b.service}</b></span>
                <span>₹{b.price}</span>
                <span>{new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>🕐 {b.timeSlot}</span>
              </div>

              {b.notes && (
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text2)', fontStyle: 'italic' }}>"{b.notes}"</p>
              )}

              {(b.status === 'pending' || b.status === 'confirmed') && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(b._id, 'confirmed')} style={{ ...actionBtn, background: 'rgba(16,185,129,0.1)', color: '#059669', borderColor: 'rgba(16,185,129,0.25)' }}>
                        ✓ Confirm
                      </button>
                      <button onClick={() => updateStatus(b._id, 'cancelled')} style={{ ...actionBtn, background: 'rgba(239,68,68,0.08)', color: '#dc2626', borderColor: 'rgba(239,68,68,0.2)' }}>
                        ✕ Cancel
                      </button>
                    </>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => setCompletingBooking(b)} style={{ ...actionBtn, background: 'rgba(59,130,246,0.1)', color: '#2563eb', borderColor: 'rgba(59,130,246,0.25)' }}>
                      ✓ Mark Completed
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {completingBooking && (
        <CompleteOtpModal
          booking={completingBooking}
          onClose={() => setCompletingBooking(null)}
          onSubmit={(id, otp) => updateStatus(id, 'completed', otp)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
          {icon}
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
  gap: '14px',
  marginBottom: '24px',
};
const actionBtn = {
  padding: '7px 16px',
  border: '1px solid',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  background: 'transparent',
  transition: 'all 0.15s',
};

function CompleteOtpModal({ booking, onClose, onSubmit }) {
  const [step, setStep] = useState('send'); // 'send' | 'verify'
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/bookings/${booking._id}/send-completion-otp`);
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!otp.trim() || otp.length !== 4) {
      setError('Enter 4-digit code.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(booking._id, otp.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-box" style={{ maxWidth: '360px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
          {step === 'send' ? 'Send OTP' : 'Verify OTP'}
        </h3>
        
        {step === 'send' ? (
          <>
            <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.4 }}>
              Send verification code to <strong>{booking.userId?.name}</strong>.
            </p>
            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500, margin: '0 0 16px' }}>
                ⚠️ {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={handleSendOtp} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
              <button className="btn-ghost" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginBottom: '16px', lineHeight: 1.4 }}>
              Enter code sent to <strong>{booking.userId?.name}</strong>.
            </p>
            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 500, margin: '0 0 12px' }}>
                ⚠️ {error}
              </p>
            )}
            <div style={{ marginBottom: '16px' }}>
              <input
                className="field-input"
                type="text"
                placeholder="••••"
                maxLength={4}
                pattern="\d{4}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.4rem', fontWeight: 'bold' }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button className="btn-primary" onClick={submit} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button className="btn-ghost" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
                Go Back
              </button>
            </div>
            <p style={{ textAlign: 'center', margin: 0, fontSize: '0.8rem' }}>
              Didn't get the code? <a href="#" onClick={(e) => { e.preventDefault(); handleSendOtp(); }} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Resend</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
