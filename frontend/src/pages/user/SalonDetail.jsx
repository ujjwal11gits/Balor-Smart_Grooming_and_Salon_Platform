import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { isShopActive, formatTime12 } from '../../utils/status';
import { useAuth } from '../../context/AuthContext';

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#f59e0b', letterSpacing: '1px', fontSize: '0.95rem' }}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      <span style={{ color: 'var(--text2)', fontSize: '0.82rem', fontWeight: 500 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

export default function SalonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [salon, setSalon] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [favorites, setFavorites] = useState({ salons: [], barbers: [] });

  useEffect(() => {
    api.get(`/salons/${id}`).then(({ data }) => {
      setSalon(data.salon);
      setBarbers(data.barbers);
    });
    api.get('/users/me').then(({ data }) => {
      if (data) setFavorites({ 
        salons: data.favoriteSalons?.map(s => s._id || s) || [], 
        barbers: data.favoriteBarbers?.map(b => b._id || b) || [] 
      });
    }).catch(() => {});
  }, [id]);

  const toggleFavoriteSalon = async () => {
    try {
      const { data } = await api.post(`/users/favorites/salon/${id}`);
      setFavorites(f => ({ ...f, salons: data }));
    } catch {}
  };

  const toggleFavoriteBarber = async (barberId) => {
    try {
      const { data } = await api.post(`/users/favorites/barber/${barberId}`);
      setFavorites(f => ({ ...f, barbers: data }));
    } catch {}
  };

  if (!salon) return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '12px' }} />)}
      </div>
    </div>
  );

  const isActive = isShopActive(salon.openingTime, salon.closingTime);

  return (
    <div className="page-wrapper">
      <button 
        onClick={() => {
          if (auth?.role === 'shop') {
            navigate('/shop/dashboard');
          } else {
            navigate('/salons');
          }
        }} 
        style={backBtn}
      >
        {auth?.role === 'shop' ? '← Back to Dashboard' : '← Back to Salons'}
      </button>

      {/* Closed Banner */}
      {!isActive && (
        <div className="alert-error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>⚠️</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Salon is Currently Closed!</strong>
            <div style={{ fontSize: '0.82rem', marginTop: '2px', opacity: 0.9 }}>
              Operating Hours: {formatTime12(salon.openingTime || '09:00')} - {formatTime12(salon.closingTime || '21:00')}. Bookings are disabled during off-hours.
            </div>
          </div>
        </div>
      )}

      {/* Salon header */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '28px' }}>
        {salon.imageUrl && (
          <div style={{ height: '200px', overflow: 'hidden' }}>
            <img src={salon.imageUrl} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 800 }}>{salon.name}</h2>
            <button onClick={toggleFavoriteSalon} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: favorites.salons.includes(id) ? '#e94560' : 'var(--text3)' }}>
              {favorites.salons.includes(id) ? '♥' : '♡'}
            </button>
          </div>
          <p style={{ color: 'var(--text2)', margin: '0 0 8px', fontSize: '0.9rem' }}>📍 {salon.address}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', margin: '12px 0', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text2)' }}>
              <span>📞</span> <strong>{salon.phone || 'No contact phone'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text2)' }}>
              <span>🕒</span> <strong>Hours: {formatTime12(salon.openingTime || '09:00')} - {formatTime12(salon.closingTime || '21:00')}</strong>
            </div>
            {salon.liveQueue && salon.liveQueue.activeCount > 0 && isActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706' }}>
                <span>⏳</span> <strong>Queue: {salon.liveQueue.activeCount} waiting (~{salon.liveQueue.estWaitMins} mins wait)</strong>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge ${isActive ? 'badge-confirmed' : 'badge-cancelled'}`} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                {isActive ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>

          {salon.description && <p style={{ color: 'var(--text)', margin: 0, fontSize: '0.93rem', lineHeight: 1.6 }}>{salon.description}</p>}
        </div>
      </div>

      {/* Barbers section */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Our Barbers</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginTop: '4px' }}>{barbers.length} professionals available</p>
      </div>

      {barbers.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          No barbers listed yet.
        </div>
      )}

      <div style={barberGrid}>
        {barbers.map((b) => (
          <div key={b._id} className="card barber-detail-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <img
              src={b.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=1a1a2e&color=e94560&size=80`}
              alt={b.name}
              style={avatarStyle}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>{b.name}</h3>
                <button onClick={() => toggleFavoriteBarber(b._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: favorites.barbers.includes(b._id) ? '#e94560' : 'var(--text3)' }}>
                  {favorites.barbers.includes(b._id) ? '♥' : '♡'}
                </button>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <Stars rating={b.rating} />
                <span style={{ color: 'var(--text3)', fontSize: '0.78rem', marginLeft: '6px' }}>{b.totalReviews} reviews</span>
              </div>
              {b.specializations?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                  {b.specializations.map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                </div>
              )}
              {b.bio && <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '12px', lineHeight: 1.5 }}>{b.bio}</p>}
              <div className="barber-actions" style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  disabled={!isActive}
                  onClick={() => navigate(`/book/${b._id}`)}
                  style={{
                    fontSize: '0.85rem',
                    padding: '7px 18px',
                    backgroundColor: isActive ? 'var(--accent)' : 'var(--border)',
                    color: isActive ? '#fff' : 'var(--text3)',
                    cursor: isActive ? 'pointer' : 'not-allowed',
                    border: 'none',
                    opacity: isActive ? 1 : 0.7
                  }}
                >
                  {isActive ? 'Book Now' : 'Shop Closed'}
                </button>
                <button className="btn-ghost" onClick={() => navigate(`/barbers/${b._id}`)} style={{ fontSize: '0.82rem', padding: '7px 14px' }}>
                  View Profile
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 600px) {
          .barber-detail-card {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 16px !important;
            padding: 24px 16px !important;
          }
          .barber-detail-card img {
            width: 80px !important;
            height: 80px !important;
            margin: 0 auto !important;
          }
          .barber-detail-card .tag {
            justify-content: center;
          }
          .barber-actions {
            width: 100% !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .barber-actions button {
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
  display: 'flex', alignItems: 'center', gap: '4px',
};
const barberGrid = { display: 'flex', flexDirection: 'column', gap: '14px' };
const avatarStyle = {
  width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
  border: '2px solid var(--border)',
};
