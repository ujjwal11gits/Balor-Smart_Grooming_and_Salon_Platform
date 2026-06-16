import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname) || location.pathname.startsWith('/reset-password');
  const showFeedback = auth ? (auth.role !== 'admin') : isAuthPage;

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="nav-container">
        <Link to="/" style={brandStyle} className="nav-brand">
          <img src="/logo.png" alt="Balor Logo" style={logoImgStyle} />
          <span>Bal<span style={{ color: '#fff', fontWeight: 300 }}>or</span></span>
        </Link>

        {/* Desktop Links */}
        <div className="nav-links-desktop">
          {auth?.role === 'user' && (
            <>
              <NavLink to="/dashboard" active={isActive('/dashboard')}>Dashboard</NavLink>
              <NavLink to="/salons" active={isActive('/salons')}>Salons</NavLink>
              <NavLink to="/my-bookings" active={isActive('/my-bookings')}>My Bookings</NavLink>
            </>
          )}
          {auth?.role === 'admin' && (
            <NavLink to="/admin/dashboard" active={isActive('/admin/dashboard')}>Dashboard</NavLink>
          )}
          {auth?.role === 'shop' && (
            <NavLink to="/shop/dashboard" active={isActive('/shop/dashboard')}>My Dashboard</NavLink>
          )}

          <button onClick={toggle} style={themeBtnStyle} title="Toggle theme">
            {theme === 'dark' ? '☀' : '🌙'}
          </button>

          {auth ? (
            <>
              <NotificationBell />
              <Link to="/profile" style={avatarLinkStyle} title="My Profile">
                {auth.avatar
                  ? <img src={auth.avatar} alt="avatar" style={avatarImgStyle} />
                  : <span style={avatarFallbackStyle}>{auth.name?.[0]?.toUpperCase()}</span>
                }
              </Link>
              <span style={nameStyle} className="hide-mobile">{auth.name}</span>
              <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" active={isActive('/login')}>Login</NavLink>
              <Link to="/register" style={registerBtnStyle}>Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="nav-controls-mobile">
          <button onClick={toggle} className="nav-theme-btn-mobile" title="Toggle theme">
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          
          {auth && <NotificationBell />}
          
          {auth && (
            <Link to="/profile" style={avatarLinkStyle} title="My Profile">
              {auth.avatar
                ? <img src={auth.avatar} alt="avatar" style={avatarImgStyle} />
                : <span style={avatarFallbackStyle}>{auth.name?.[0]?.toUpperCase()}</span>
              }
            </Link>
          )}
          
          <button 
            className={`hamburger ${menuOpen ? 'open' : ''}`} 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer menu */}
      <div className={`mobile-menu-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <Link to="/" style={brandStyle} onClick={() => setMenuOpen(false)}>
            <img src="/logo.png" alt="Balor Logo" style={logoImgStyle} />
            <span>Bal<span style={{ color: '#fff', fontWeight: 300 }}>or</span></span>
          </Link>
          <button className="drawer-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <div className="drawer-links">
          {auth?.role === 'user' && (
            <>
              <MobileNavLink to="/dashboard" active={isActive('/dashboard')} onClick={() => setMenuOpen(false)}>Dashboard</MobileNavLink>
              <MobileNavLink to="/salons" active={isActive('/salons')} onClick={() => setMenuOpen(false)}>Salons</MobileNavLink>
              <MobileNavLink to="/my-bookings" active={isActive('/my-bookings')} onClick={() => setMenuOpen(false)}>My Bookings</MobileNavLink>
            </>
          )}
          {auth?.role === 'admin' && (
            <MobileNavLink to="/admin/dashboard" active={isActive('/admin/dashboard')} onClick={() => setMenuOpen(false)}>Dashboard</MobileNavLink>
          )}
          {auth?.role === 'shop' && (
            <MobileNavLink to="/shop/dashboard" active={isActive('/shop/dashboard')} onClick={() => setMenuOpen(false)}>My Dashboard</MobileNavLink>
          )}

          {auth ? (
            <>
              <MobileNavLink to="/profile" active={isActive('/profile')} onClick={() => setMenuOpen(false)}>Profile Settings</MobileNavLink>
              {showFeedback && (
                <button 
                  onClick={() => {
                    setMenuOpen(false);
                    window.dispatchEvent(new Event('open-feedback-drawer'));
                  }}
                  className="drawer-feedback-btn"
                >
                  <span>🪲</span> Report an Issue
                </button>
              )}
              <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '12px', paddingLeft: '8px' }}>
                  Logged in as <strong style={{ color: 'var(--text)' }}>{auth.name}</strong>
                </div>
                <button onClick={handleLogout} className="drawer-logout-btn">Logout</button>
              </div>
            </>
          ) : (
            <>
              {showFeedback && (
                <button 
                  onClick={() => {
                    setMenuOpen(false);
                    window.dispatchEvent(new Event('open-feedback-drawer'));
                  }}
                  className="drawer-feedback-btn"
                >
                  <span>🪲</span> Report an Issue
                </button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <Link to="/login" className="drawer-login-link" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="drawer-register-btn" onClick={() => setMenuOpen(false)}>Get Started</Link>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Drawer backdrop */}
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}
      
      <style>{`
        .nav-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 28px;
          height: 60px;
          background: var(--navbar-bg);
          backdrop-filter: blur(16px);
          WebkitBackdropFilter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-links-desktop {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-controls-mobile {
          display: none;
          align-items: center;
          gap: 12px;
        }

        /* Hamburger button styling */
        .hamburger {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 22px;
          height: 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          box-sizing: border-box;
          outline: none;
        }
        .hamburger span {
          width: 100%;
          height: 2px;
          background: #fff;
          border-radius: 2px;
          transition: all 0.25s ease-in-out;
        }
        .hamburger.open span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }
        .hamburger.open span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* Drawer menu */
        .mobile-menu-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 280px;
          background: var(--card);
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.25);
          z-index: 1200;
          display: flex;
          flex-direction: column;
          padding: 24px;
          box-sizing: border-box;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mobile-menu-drawer.open {
          transform: translateX(0);
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .drawer-close {
          background: none;
          border: none;
          font-size: 1.4rem;
          color: var(--text2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .drawer-close:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .drawer-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .drawer-logout-btn {
          width: 100%;
          background: rgba(233,69,96,0.1);
          color: #e94560;
          border: 1px solid rgba(233,69,96,0.2);
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s;
        }
        .drawer-logout-btn:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .drawer-login-link {
          text-align: center;
          color: var(--text);
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          padding: 10px;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          transition: all 0.2s;
        }
        .drawer-login-link:hover {
          border-color: var(--text2);
        }
        .drawer-register-btn {
          text-align: center;
          background: var(--accent);
          color: #fff;
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 600;
          padding: 11px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .drawer-register-btn:hover {
          background: var(--accent-hover);
        }

        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(3px);
          z-index: 1150;
        }

        .nav-theme-btn-mobile {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 7px;
          font-size: 1rem;
          cursor: pointer;
          padding: 5px 8px;
          line-height: 1;
          color: #fff;
        }

        @media (max-width: 768px) {
          .nav-container {
            padding: 0 16px;
          }
          .nav-links-desktop {
            display: none;
          }
          .nav-controls-mobile {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link to={to} style={{
      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
      textDecoration: 'none',
      fontSize: '0.88rem',
      fontWeight: active ? 600 : 400,
      padding: '5px 10px',
      borderRadius: '6px',
      background: active ? 'rgba(233,69,96,0.25)' : 'transparent',
      transition: 'all 0.18s',
    }}>
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children, active, onClick }) {
  return (
    <Link to={to} onClick={onClick} style={{
      color: active ? 'var(--accent)' : 'var(--text2)',
      textDecoration: 'none',
      fontSize: '0.96rem',
      fontWeight: active ? 700 : 500,
      padding: '12px 14px',
      borderRadius: '8px',
      background: active ? 'rgba(233,69,96,0.08)' : 'transparent',
      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
      transition: 'all 0.15s',
      display: 'block',
      boxSizing: 'border-box'
    }}>
      {children}
    </Link>
  );
}

const brandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  fontWeight: 800,
  fontSize: '1.15rem',
  color: '#e94560',
  textDecoration: 'none',
  letterSpacing: '-0.01em',
};
const logoImgStyle = {
  width: '24px',
  height: '24px',
  borderRadius: '4px',
  objectFit: 'contain',
};
const themeBtnStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '5px 8px',
  lineHeight: 1,
  transition: 'background 0.18s',
  color: '#fff',
};
const nameStyle = { color: 'rgba(255,255,255,0.55)', fontSize: '0.83rem', marginLeft: '2px' };
const logoutBtnStyle = {
  background: 'rgba(233,69,96,0.15)',
  color: '#e94560',
  border: '1px solid rgba(233,69,96,0.3)',
  padding: '6px 14px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  transition: 'all 0.18s',
};
const registerBtnStyle = {
  background: '#e94560',
  color: '#fff',
  padding: '7px 16px',
  borderRadius: '7px',
  fontSize: '0.87rem',
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'background 0.18s',
};
const avatarLinkStyle = { textDecoration: 'none' };
const avatarImgStyle = { width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle', border: '2px solid rgba(233,69,96,0.4)' };
const avatarFallbackStyle = {
  width: '30px', height: '30px', borderRadius: '50%',
  background: 'linear-gradient(135deg, #e94560, #a0153e)',
  color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '0.82rem', fontWeight: 700,
};
