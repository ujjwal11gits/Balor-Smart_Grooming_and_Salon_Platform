import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const handleOpen = async () => {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      await api.patch('/notifications/read');
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    }
  };

  const handleItemClick = (link) => {
    setOpen(false);
    if (link) navigate(link);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <style>{`
        .notification-item {
          cursor: pointer;
        }
        .notification-item:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
        @media (max-width: 360px) {
          .notification-dropdown {
            width: 280px !important;
          }
        }
      `}</style>
      <button onClick={handleOpen} style={bellStyle} title="Notifications">
        🔔
        {unread > 0 && (
          <span style={badgeStyle}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" style={dropdownStyle}>
          <div style={dropHeaderStyle}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
            {unread === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>All caught up</span>}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🔕</div>
              <p style={{ color: 'var(--text2)', fontSize: '0.85rem', margin: 0 }}>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleItemClick(n.link)}
                className="notification-item"
                style={{ ...itemStyle, background: n.read ? 'transparent' : 'rgba(233,69,96,0.06)' }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e94560', flexShrink: 0, marginTop: '5px' }} />}
                  <div style={{ flex: 1, paddingLeft: n.read ? '17px' : '0' }}>
                    <p style={{ margin: '0 0 3px', fontSize: '0.86rem', color: 'var(--text)', lineHeight: 1.4 }}>{n.message}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text3)' }}>
                      {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const bellStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '5px 8px',
  position: 'relative',
  lineHeight: 1,
  transition: 'background 0.18s',
};
const badgeStyle = {
  position: 'absolute', top: '-5px', right: '-5px',
  background: '#e94560', color: '#fff', borderRadius: '10px',
  minWidth: '17px', height: '17px', padding: '0 3px',
  fontSize: '0.62rem', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '2px solid var(--navbar-bg)',
};
const dropdownStyle = {
  position: 'absolute', right: 0, top: '42px',
  width: '310px',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-lg)',
  zIndex: 100,
  maxHeight: '380px',
  overflowY: 'auto',
  animation: 'slideUp 0.15s ease',
};
const dropHeaderStyle = {
  padding: '14px 16px',
  fontWeight: 600,
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
const itemStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border)',
  transition: 'background 0.15s',
};
