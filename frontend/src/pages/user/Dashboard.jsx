import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  pending: { label: 'Pending', cls: 'badge-pending' },
  confirmed: { label: 'Confirmed', cls: 'badge-confirmed' },
  completed: { label: 'Completed', cls: 'badge-completed' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
};

function Stars({ rating }) {
  const full = Math.round(rating || 0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      <span style={{ color: 'var(--gold)', letterSpacing: '1px', fontSize: '0.85rem' }}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      <span style={{ color: 'var(--text2)', fontSize: '0.78rem', fontWeight: 600, marginLeft: '2px' }}>
        {(rating || 0).toFixed(1)}
      </span>
    </span>
  );
}

export default function UserDashboard() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfileAndBookings = () => {
    setError(null);
    Promise.all([
      api.get('/bookings/my'),
      api.get('/users/me')
    ])
      .then(([bookingsRes, userRes]) => {
        setBookings(bookingsRes.data);
        setUserProfile(userRes.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to connect to the server. Please check your internet connection.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfileAndBookings();
  }, []);

  const handleToggleFavoriteBarber = async (barberId) => {
    try {
      await api.post(`/users/favorites/barber/${barberId}`);
      // Fetch updated user profile data
      const { data } = await api.get('/users/me');
      setUserProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavoriteSalon = async (salonId) => {
    try {
      await api.post(`/users/favorites/salon/${salonId}`);
      // Fetch updated user profile data
      const { data } = await api.get('/users/me');
      setUserProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSkeleton rows={4} height={88} /></div>;

  const pending = bookings.filter((booking) => booking.status === 'pending').length;
  const confirmed = bookings.filter((booking) => booking.status === 'confirmed').length;
  const completed = bookings.filter((booking) => booking.status === 'completed').length;

  return (
    <div className="page-wrapper">
      {error && (
        <div className="alert-error" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => { setError(null); setLoading(true); fetchProfileAndBookings(); }} 
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            Retry
          </button>
        </div>
      )}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Customer Dashboard</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="stat-card"><div className="stat-label">Total Bookings</div><div className="stat-value">{bookings.length}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{pending}</div></div>
        <div className="stat-card"><div className="stat-label">Confirmed</div><div className="stat-value">{confirmed}</div></div>
        <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value">{completed}</div></div>
      </div>

      {/* Customer Profile Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          
          {/* Left: Avatar & Profile Info */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #e94560, #a0153e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden', border: '3px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt={userProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>
                  {(userProfile?.name || auth?.name)?.[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {userProfile?.name || auth?.name}
                </h3>
                <span className="badge badge-user" style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(233, 69, 96, 0.08)', color: 'var(--accent)' }}>
                  Customer
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text2)', fontSize: '0.88rem', flexWrap: 'wrap' }}>
                  <span>✉️ {userProfile?.email}</span>
                  {userProfile?.phone && (
                    <>
                      <span style={{ color: 'var(--text3)' }}>•</span>
                      <span>📞 {userProfile.phone}</span>
                    </>
                  )}
                </div>
                {userProfile?.createdAt && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 500 }}>
                    📅 Member since {new Date(userProfile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/salons')} style={{ fontSize: '0.83rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>🔍 Browse Salons</button>
            <button className="btn-ghost" onClick={() => navigate('/my-bookings')} style={{ fontSize: '0.83rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>📅 My Bookings</button>
          </div>

        </div>
      </div>

      {userProfile?.favoriteBarbers?.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⭐</span> Favorite Barbers
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {userProfile.favoriteBarbers.filter(Boolean).map(b => (
              <div 
                key={b._id} 
                className="card card-hover" 
                style={{ 
                  padding: '20px', 
                  position: 'relative', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}
              >
                {/* Heart toggle favorite button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavoriteBarber(b._id);
                  }} 
                  style={{ 
                    position: 'absolute', 
                    top: '14px', 
                    right: '14px', 
                    background: 'rgba(233, 69, 96, 0.08)', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '1.25rem', 
                    color: '#e94560',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s, transform 0.15s',
                    padding: 0
                  }}
                  title="Remove from favorites"
                >
                  ♥
                </button>

                {/* Top details: Avatar + Name & Salon */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <img
                    src={b.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=e94560&color=fff&size=64`}
                    alt={b.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.name}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ✂️ {b.salonId?.name || 'Independent'}
                    </p>
                    <div style={{ marginTop: '4px' }}>
                      <Stars rating={b.rating} />
                      <span style={{ color: 'var(--text3)', fontSize: '0.72rem', marginLeft: '6px' }}>({b.totalReviews || 0})</span>
                    </div>
                  </div>
                </div>

                {/* Specializations snippet */}
                {b.specializations?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    {b.specializations.slice(0, 2).map((s) => (
                      <span key={s} style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 8px', 
                        background: 'var(--border)', 
                        color: 'var(--text2)', 
                        borderRadius: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}>
                        {s}
                      </span>
                    ))}
                    {b.specializations.length > 2 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text3)', padding: '2px 4px', fontWeight: 500 }}>
                        +{b.specializations.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {/* CTA Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => navigate(`/book/${b._id}`)} 
                    style={{ 
                      flex: 1, 
                      fontSize: '0.82rem', 
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Book Now
                  </button>
                  <button 
                    className="btn-ghost" 
                    onClick={() => navigate(`/barbers/${b._id}`)} 
                    style={{ 
                      flex: 1, 
                      fontSize: '0.82rem', 
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      justifyContent: 'center',
                    }}
                  >
                    Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userProfile?.favoriteSalons?.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏢</span> Favorite Salons
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {userProfile.favoriteSalons.filter(Boolean).map(s => (
              <div 
                key={s._id} 
                className="card card-hover" 
                style={{ 
                  padding: '16px', 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}
                onClick={() => navigate(`/salons/${s._id}`)}
              >
                <img 
                  src={s.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=1a1a2e&color=e94560&size=48`} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border)' }} 
                  alt={s.name} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.78rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {s.address}</div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavoriteSalon(s._id);
                  }} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '1.25rem', 
                    color: '#e94560',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Remove from favorites"
                >
                  ♥
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Bookings</h3>
      </div>

      {bookings.length === 0 ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text2)' }}>No bookings yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bookings.slice(0, 4).map((booking) => {
            const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            return (
              <div key={booking._id} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{booking.barberId?.name}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{booking.salonId?.name}</div>
                  </div>
                  <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', color: 'var(--text2)', fontSize: '0.85rem' }}>
                  <span>{booking.service}</span>
                  <span>₹{booking.price}</span>
                  <span>{new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>🕐 {booking.timeSlot}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}