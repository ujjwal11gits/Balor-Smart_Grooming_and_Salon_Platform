import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
  user:   { cls: 'badge-user',   label: 'Customer' },
  barber: { cls: 'badge-barber', label: 'Barber' },
  shop:   { cls: 'badge-confirmed', label: 'Shop Owner' },
  admin:  { cls: 'badge-admin',  label: 'Admin' },
};

export default function Profile() {
  const { auth, login } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', avatar: '' });
  const [profileData, setProfileData] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setForm({ name: data.name || '', phone: data.phone || '', avatar: data.avatar || '' });
      setProfileData(data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const { data } = await api.patch('/users/profile', form);
      setSuccess('Profile updated!');
      login({ ...auth, name: data.name, avatar: data.avatar });
      setProfileData(prev => ({ ...prev, name: data.name, phone: data.phone, avatar: data.avatar }));
      localStorage.setItem('name', data.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const displayAvatar = form.avatar || profileData?.avatar;
  const displayName = profileData?.name || auth?.name;
  const displayEmail = profileData?.email;
  const displayRole = profileData?.role || auth?.role;
  const roleCfg = ROLE_CONFIG[displayRole] || ROLE_CONFIG.user;

  if (loading) return (
    <div className="page-wrapper" style={{ maxWidth: '520px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[80, 40, 40, 40].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: '8px' }} />)}
      </div>
    </div>
  );

  return (
    <div className="page-wrapper" style={{ maxWidth: '520px' }}>
      {/* Profile header */}
      <div className="card profile-header-card" style={{ padding: '24px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        {displayAvatar
          ? <img src={displayAvatar} alt="avatar" style={avatarStyle} />
          : (
            <div style={{ ...avatarStyle, background: 'linear-gradient(135deg, #e94560, #a0153e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>
              {displayName?.[0]?.toUpperCase()}
            </div>
          )
        }
        <div>
          <h2 style={{ margin: '0 0 5px', fontSize: '1.25rem', fontWeight: 700 }}>{displayName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${roleCfg.cls}`}>{roleCfg.label}</span>
          </div>
          {displayEmail && <p style={{ margin: '5px 0 0', fontSize: '0.83rem', color: 'var(--text2)' }}>{displayEmail}</p>}
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700 }}>Edit Profile</h3>

        {success && <div className="alert-success" style={{ marginBottom: '16px' }}>{success}</div>}
        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="field-group">
            <label className="field-label">Full Name</label>
            <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field-group">
            <label className="field-label">Phone</label>
            <input className="field-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 99999 00000" />
          </div>
          <div className="field-group">
            <label className="field-label">Avatar URL</label>
            <input className="field-input" placeholder="https://example.com/photo.jpg" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
            {form.avatar && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={form.avatar} alt="preview" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Preview</span>
              </div>
            )}
          </div>
          <button className="btn-primary" type="submit" style={{ padding: '11px', fontSize: '0.95rem' }}>Save Changes</button>
        </form>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .profile-header-card {
            flex-direction: column !important;
            text-align: center !important;
            align-items: center !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

const avatarStyle = {
  width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
  border: '2px solid var(--border)',
};

