import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   cls: 'badge-pending',   dot: '#d97706' },
  confirmed: { label: 'Confirmed', cls: 'badge-confirmed', dot: '#059669' },
  completed: { label: 'Completed', cls: 'badge-completed', dot: '#2563eb' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled', dot: '#dc2626' },
};

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await onSubmit(booking._id, rating, comment);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Rate {booking.barberId?.name}</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '16px' }}>How was your experience?</p>
        
        {error && (
          <div style={{ 
            marginBottom: '12px', 
            padding: '8px 12px', 
            fontSize: '0.8rem', 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#dc2626', 
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            fontWeight: 500
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              style={{
                fontSize: '1.8rem', cursor: 'pointer',
                color: s <= rating ? '#f59e0b' : 'var(--border)',
                background: 'none', border: 'none',
                padding: '2px', transition: 'transform 0.1s',
                transform: s <= rating ? 'scale(1.1)' : 'scale(1)',
              }}
            >★</button>
          ))}
        </div>
        <textarea
          className="field-input"
          style={{ height: '90px', resize: 'vertical', marginBottom: '16px' }}
          placeholder="Share your experience (optional)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary" onClick={submit} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Submitting…' : 'Submit Review'}
          </button>
          <button className="btn-ghost" onClick={onClose} disabled={loading} style={{ flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ booking, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Cancellation reason is required.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(booking._id, reason.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Cancel Booking</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Please specify a reason for cancelling your appointment with <b>{booking.barberId?.name}</b>.
        </p>
        {error && (
          <div className="alert-error" style={{ marginBottom: '12px', padding: '8px 12px', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}
        <textarea
          className="field-input"
          style={{ height: '90px', resize: 'vertical', marginBottom: '16px' }}
          placeholder="Reason for cancellation (required)…"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (e.target.value.trim()) setError('');
          }}
          required
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary" onClick={submit} disabled={loading} style={{ flex: 1, backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
            {loading ? 'Cancelling…' : 'Confirm Cancel'}
          </button>
          <button className="btn-ghost" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());
  const navigate = useNavigate();

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      setBookings(data);
      const reviewedIds = data.filter(b => b.isReviewed).map(b => b._id);
      setReviewed(new Set(reviewedIds));
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const cancel = async (id, reason) => {
    await api.patch(`/bookings/${id}/cancel`, { cancelReason: reason });
    fetchBookings();
  };

  const submitReview = async (bookingId, rating, comment) => {
    await api.post('/reviews', { bookingId, rating, comment });
    setReviewed((s) => new Set([...s, bookingId]));
  };

  if (loading) return <div className="page-wrapper"><LoadingSkeleton rows={4} height={100} /></div>;

  return (
    <div className="page-wrapper">
      {reviewingBooking && (
        <ReviewModal booking={reviewingBooking} onClose={() => setReviewingBooking(null)} onSubmit={submitReview} />
      )}
      {cancellingBooking && (
        <CancelModal booking={cancellingBooking} onClose={() => setCancellingBooking(null)} onSubmit={cancel} />
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em' }}>My Bookings</h2>
        <p style={{ color: 'var(--text2)', marginTop: '5px' }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
      </div>

      {bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📅</div>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No bookings yet</p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '20px' }}>Find a salon and book your first appointment</p>
          <button className="btn-primary" onClick={() => navigate('/salons')}>Browse Salons</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {bookings.map((b) => {
          const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
          return (
            <div key={b._id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{b.barberId?.name}</span>
                    <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>at {b.salonId?.name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                  {b.status === 'cancelled' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>by {b.cancelledBy || 'unknown'}</span>
                  )}
                  {['pending', 'confirmed'].includes(b.status) && b.completionOtp && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text2)', fontWeight: 500, marginTop: '2px' }}>
                      Completion OTP: <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>{b.completionOtp}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div style={metaRow}>
                <MetaItem icon="✂" text={b.service} />
                <MetaItem icon="📅" text={new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                <MetaItem icon="🕐" text={b.timeSlot} />
                <MetaItem icon="₹" text={b.price} bold />
              </div>

              {b.notes && (
                <p style={{ margin: '8px 0 0', fontSize: '0.83rem', color: 'var(--text2)', fontStyle: 'italic' }}>
                  "{b.notes}"
                </p>
              )}

              {b.status === 'cancelled' && b.cancelReason && (
                <div style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.04)', border: '1px dashed rgba(239,68,68,0.18)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '4px' }}>
                    Reason for Cancellation ({b.cancelledBy === 'shop' ? 'Shop Owner' : b.cancelledBy === 'customer' ? 'You' : 'Barber'}):
                  </span>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{b.cancelReason}"
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                {['pending', 'confirmed'].includes(b.status) && (
                  <button onClick={() => setCancellingBooking(b)} style={{ ...actionBtn, background: 'rgba(239,68,68,0.08)', color: '#dc2626', borderColor: 'rgba(239,68,68,0.2)' }}>
                    Cancel
                  </button>
                )}
                {b.status === 'completed' && !reviewed.has(b._id) && (
                  <button onClick={() => setReviewingBooking(b)} style={{ ...actionBtn, background: 'rgba(245,158,11,0.08)', color: '#d97706', borderColor: 'rgba(245,158,11,0.2)' }}>
                    ★ Leave Review
                  </button>
                )}
                {b.status === 'completed' && reviewed.has(b._id) && (
                  <span style={{ fontSize: '0.83rem', color: '#059669', fontWeight: 500 }}>✓ Reviewed</span>
                )}
                <button className="btn-ghost" onClick={() => navigate(`/barbers/${b.barberId?._id}`)} style={{ fontSize: '0.83rem', padding: '6px 14px' }}>
                  View Barber
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetaItem({ icon, text, bold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: bold ? 'var(--text)' : 'var(--text2)', fontWeight: bold ? 700 : 400 }}>
      <span style={{ fontSize: '0.78rem' }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

const metaRow = { display: 'flex', flexWrap: 'wrap', gap: '14px' };
const actionBtn = {
  padding: '6px 14px',
  border: '1px solid',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  background: 'transparent',
  transition: 'all 0.15s',
};
