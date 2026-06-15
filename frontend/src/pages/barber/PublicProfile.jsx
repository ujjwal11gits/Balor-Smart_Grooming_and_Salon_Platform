import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';

function Stars({ rating, big }) {
  const full = Math.round(rating);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#f59e0b', fontSize: big ? '1.1rem' : '0.92rem', letterSpacing: '1px' }}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      <span style={{ color: 'var(--text2)', fontSize: '0.83rem', fontWeight: 500 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [barber, setBarber] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({ barbers: [] });

  useEffect(() => {
    const requests = [
      api.get(`/barbers/${id}`),
      api.get(`/reviews/barber/${id}`),
    ];

    if (auth?.role === 'user') requests.push(api.get('/bookings/my'));

    Promise.all(requests).then(([b, r, myBookings, me]) => {
      setBarber(b.data);
      setReviews(r.data);
      if (myBookings?.data) setBookings(myBookings.data);
      setLoading(false);
    });

    api.get('/users/me').then(({ data }) => {
      if (data) setFavorites({ barbers: data.favoriteBarbers?.map(b => b._id || b) || [] });
    }).catch(() => {});
  }, [auth?.role, id]);

  const toggleFavoriteBarber = async () => {
    try {
      const { data } = await api.post(`/users/favorites/barber/${id}`);
      setFavorites(f => ({ ...f, barbers: data }));
    } catch {}
  };

  const reviewedBookingIds = new Set(reviews.map((review) => String(review.bookingId)));
  const eligibleBookings = bookings.filter(
    (booking) =>
      String(booking.barberId?._id || booking.barberId) === id &&
      booking.status === 'completed' &&
      !reviewedBookingIds.has(String(booking._id))
  );

  const submitReview = async () => {
    if (!ratingBooking) return;
    setSubmitting(true);
    await api.post('/reviews', { bookingId: ratingBooking._id, rating, comment });
    const { data } = await api.get(`/reviews/barber/${id}`);
    setReviews(data);
    setRatingBooking(null);
    setRating(5);
    setComment('');
    setSubmitting(false);
  };

  if (loading) return <div className="page-wrapper" style={{ maxWidth: '720px' }}><LoadingSkeleton rows={4} height={100} /></div>;
  if (!barber) return <div className="page-wrapper"><p style={{ color: 'var(--text2)' }}>Barber not found.</p></div>;

  return (
    <div className="page-wrapper" style={{ maxWidth: '720px' }}>
      {ratingBooking && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Rate {barber.name}</h3>
            <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '16px' }}>How was your experience?</p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
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
              <button className="btn-primary" onClick={submitReview} disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
              <button className="btn-ghost" onClick={() => setRatingBooking(null)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>

      {/* Profile hero */}
      <div className="card barber-profile-card" style={{ padding: '28px', marginBottom: '20px' }}>
        <div className="barber-profile-info-wrap" style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <img
            src={barber.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=1a1a2e&color=e94560&size=100`}
            alt={barber.name}
            style={avatar}
          />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>{barber.name}</h2>
              <button onClick={toggleFavoriteBarber} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: favorites.barbers.includes(id) ? '#e94560' : 'var(--text3)' }}>
                {favorites.barbers.includes(id) ? '♥' : '♡'}
              </button>
            </div>
            <p style={{ margin: '0 0 8px', color: 'var(--text2)', fontSize: '0.9rem' }}>
              📍 {barber.salonId?.name} — {barber.salonId?.address}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Stars rating={barber.rating} big />
              <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>{barber.totalReviews} reviews</span>
            </div>
            {barber.specializations?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {barber.specializations.map((s) => (
                  <span key={s} className="tag">{s}</span>
                ))}
              </div>
            )}
            {barber.bio && (
              <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{barber.bio}</p>
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <div className="barber-profile-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate(`/book/${barber._id}`)} style={{ padding: '11px 32px', fontSize: '0.95rem' }}>
              Book Appointment
            </button>
            {auth?.role === 'user' && eligibleBookings.length > 0 && (
              <button className="btn-ghost" onClick={() => setRatingBooking(eligibleBookings[0])} style={{ padding: '11px 20px', fontSize: '0.95rem' }}>
                Rate Barber
              </button>
            )}
          </div>
        </div>
      </div>

      {auth?.role === 'user' && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>Rate this barber</h3>
          <p style={{ margin: '0 0 14px', color: 'var(--text2)', fontSize: '0.88rem' }}>
            Ratings are available after a completed booking with this barber.
          </p>
          {eligibleBookings.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: '0.88rem' }}>
              Complete a booking first, then come back here to leave a review.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {eligibleBookings.map((booking) => (
                <div key={booking._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg2)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {booking.timeSlot}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.84rem' }}>{booking.service}</div>
                  </div>
                  <button className="btn-primary" onClick={() => setRatingBooking(booking)} style={{ padding: '9px 18px', fontSize: '0.88rem' }}>
                    Give Rating
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>Reviews</h3>
        <span style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>({reviews.length})</span>
      </div>

      {reviews.length === 0 && (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text2)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          No reviews yet. Be the first to leave one!
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {reviews.map((r) => (
          <div key={r._id} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {r.userId?.avatar
                  ? <img src={r.userId.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#e94560,#a0153e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
                      {(r.userId?.name || 'A')[0].toUpperCase()}
                    </div>
                }
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{r.userId?.name || 'Anonymous'}</span>
              </div>
              <span style={{ color: '#f59e0b', fontSize: '0.88rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            </div>
            {r.comment && <p style={{ margin: '0 0 6px', color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.5, fontStyle: 'italic' }}>"{r.comment}"</p>}
            <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text3)' }}>
              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 480px) {
          .barber-profile-card {
            padding: 16px !important;
          }
          .barber-profile-info-wrap {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 16px !important;
          }
          .barber-profile-actions {
            width: 100% !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .barber-profile-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}

const backBtn = {
  background: 'none', border: 'none', color: 'var(--accent)',
  cursor: 'pointer', fontSize: '0.9rem', marginBottom: '20px',
  padding: '6px 0', fontFamily: 'inherit', fontWeight: 500,
};
const avatar = {
  width: '100px', height: '100px', borderRadius: '50%',
  objectFit: 'cover', flexShrink: 0,
  border: '3px solid var(--border)',
  boxShadow: 'var(--shadow)',
};
