import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { isShopActive, formatTime12 } from '../../utils/status';
import { useAuth } from '../../context/AuthContext';

const SERVICE_ICONS = {
  'Haircut': '✂', 'Beard Trim': '🪒', 'Hair Color': '🎨',
  'Hot Towel Shave': '🔥', 'Keratin Treatment': '💆', 'Fade Cut': '💈',
  'default': '✨'
};

export default function Salons() {
  const { auth } = useAuth();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [favorites, setFavorites] = useState({ salons: [], barbers: [] });
  const [quickBarbers, setQuickBarbers] = useState([]);
  const [selectedQuickBarber, setSelectedQuickBarber] = useState(null);
  const [userPhone, setUserPhone] = useState('');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const navigate = useNavigate();

  const fetchSalons = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/salons');
      setSalons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons();
    if (auth && auth.role === 'user') {
      Promise.all([
        api.get('/users/me').catch(() => null),
        api.get('/bookings/my').catch(() => null)
      ]).then(([userRes, bookingsRes]) => {
        const userData = userRes?.data;
        if (userData) {
          setUserPhone(userData.phone || '');
          setFavorites({ 
            salons: userData.favoriteSalons?.filter(Boolean).map(s => s._id || s) || [],
            barbers: userData.favoriteBarbers?.filter(Boolean).map(b => b._id || b) || []
          });
        }

        const favoritesList = userData?.favoriteBarbers?.filter(Boolean) || [];
        const bookingsList = bookingsRes?.data || [];

        // Extract unique barbers from bookings
        const bookedBarbers = bookingsList
          .map(b => b.barberId)
          .filter(Boolean)
          .map(barb => ({
            _id: barb._id,
            name: barb.name,
            imageUrl: barb.imageUrl,
            salonId: bookingsList.find(b => b.barberId?._id === barb._id)?.salonId || null
          }));

        // Combine favorites and booked
        const combined = [...favoritesList];
        bookedBarbers.forEach(bb => {
          if (!combined.some(c => c._id === bb._id)) {
            combined.push(bb);
          }
        });

        // Ensure we only include barbers that have valid salon information
        const validBarbers = combined.filter(b => b && b.salonId);
        setQuickBarbers(validBarbers.slice(0, 10));
      }).catch(err => console.error('Error loading user data:', err));
    }
  }, [auth]);

  const handleReset = () => {
    setSearch('');
    setRatingFilter('all');
    setPriceFilter('all');
    setServiceFilter('all');
    setShopFilter('all');
  };

  // Filter logic (real-time client-side)
  const filteredSalons = salons.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const addrMatch = s.address?.toLowerCase().includes(q);
      const cityMatch = s.city?.toLowerCase().includes(q);
      if (!nameMatch && !addrMatch && !cityMatch) return false;
    }

    if (ratingFilter !== 'all') {
      const minRate = parseFloat(ratingFilter);
      if ((s.avgRating || 0) < minRate) return false;
    }

    if (priceFilter !== 'all') {
      const maxPrice = parseFloat(priceFilter);
      const prices = s.services?.map((ser) => ser.price) || [];
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      if (minPrice > maxPrice) return false;
    }

    if (serviceFilter !== 'all') {
      const serviceQuery = serviceFilter.toLowerCase();
      const hasService = s.services?.some((ser) => {
        const name = ser.name.toLowerCase();
        if (serviceQuery === 'haircut') return name.includes('hair') || name.includes('cut');
        if (serviceQuery === 'beard') return name.includes('beard');
        if (serviceQuery === 'styling') return name.includes('style');
        if (serviceQuery === 'shave') return name.includes('shave') || name.includes('shaving');
        if (serviceQuery === 'spa') return name.includes('spa');
        if (serviceQuery === 'facial') return name.includes('facial') || name.includes('face');
        return name.includes(serviceQuery);
      });
      if (!hasService) return false;
    }

    if (shopFilter === 'favorites') {
      const isFavSalon = favorites.salons.includes(s._id);
      const hasFavBarber = s.barbers?.some(b => favorites.barbers.includes(b._id || b));
      if (!isFavSalon && !hasFavBarber) return false;
    }

    return true;
  });

  const activeFilterCount = [
    ratingFilter !== 'all',
    priceFilter !== 'all',
    serviceFilter !== 'all',
    shopFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="page-wrapper">
      {/* Premium Search Banner Section */}
      <div className="search-banner">
        <h1 className="search-title">
          Find Your <span className="highlight-text">Perfect Barber</span>
        </h1>
        <p className="search-subtitle">Browse top-rated barbershops near you and book instantly.</p>
        
        <div className="filter-card">
          <div className="search-input-wrapper">
            <span className="search-input-icon">🔍</span>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search by shop name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button 
            type="button" 
            className="mobile-filter-toggle-btn"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          >
            <span>{showFiltersMobile ? '✕ Hide Filters' : '⚙️ Filter Options'}</span>
            {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>
          
          <div className={`selectors-grid ${showFiltersMobile ? 'mobile-show' : ''}`}>
            <div className="select-wrapper">
              <select
                className={`filter-select ${ratingFilter !== 'all' ? 'filter-active' : ''}`}
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="all">Any rating</option>
                <option value="4">4★ and above</option>
                <option value="3">3★ and above</option>
                <option value="2">2★ and above</option>
              </select>
            </div>
            
            <div className="select-wrapper">
              <select
                className={`filter-select ${priceFilter !== 'all' ? 'filter-active' : ''}`}
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="all">Any price</option>
                <option value="200">Under ₹200</option>
                <option value="500">Under ₹500</option>
                <option value="1000">Under ₹1000</option>
              </select>
            </div>

            <div className="select-wrapper">
              <select
                className={`filter-select ${serviceFilter !== 'all' ? 'filter-active' : ''}`}
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                <option value="all">All Services</option>
                <option value="haircut">Haircut</option>
                <option value="beard">Beard</option>
                <option value="styling">Styling</option>
                <option value="shave">Shave</option>
                <option value="spa">Spa</option>
                <option value="facial">Facial</option>
              </select>
            </div>

            <div className="select-wrapper">
              <select
                className={`filter-select ${shopFilter !== 'all' ? 'filter-active' : ''}`}
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
              >
                <option value="all">All Shops</option>
                <option value="favorites">Favorites Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Book Again Widget */}
      {auth && auth.role === 'user' && quickBarbers.length > 0 && (
        <div className="quick-book-card">
          <h3 className="quick-book-title">
            <span className="pulse-lightning">⚡</span> Quick Book Again
          </h3>
          <div className="quick-book-list">
            {quickBarbers.map((b) => (
              <div
                key={b._id}
                onClick={() => setSelectedQuickBarber(b)}
                className="quick-book-avatar-item"
              >
                <div className="quick-book-avatar-ring">
                  <img
                    src={b.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=e94560&color=fff&size=52`}
                    alt={b.name}
                    className="quick-book-avatar-img"
                  />
                  <span className="quick-book-badge">⚡</span>
                </div>
                <span className="quick-book-avatar-name">
                  {b.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '10px' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--text2)', fontWeight: 600 }}>
          {filteredSalons.length} {filteredSalons.length === 1 ? 'shop' : 'shops'} found
        </span>
        {(search || ratingFilter !== 'all' || priceFilter !== 'all' || serviceFilter !== 'all' || shopFilter !== 'all') && (
          <button
            onClick={handleReset}
            className="reset-btn-link"
          >
            Reset filters
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={3} height={220} />
      ) : (
        <>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
            
            .quick-book-avatar {
              transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .quick-book-avatar:hover {
              transform: scale(1.08);
            }
            .drawer-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.5);
              backdrop-filter: blur(4px);
              z-index: 1100;
              display: flex;
              justify-content: flex-end;
              animation: fadeIn 0.25s ease;
            }
            .drawer-content {
              width: 100%;
              max-width: 420px;
              height: 100%;
              background: var(--card);
              box-shadow: -4px 0 24px rgba(0,0,0,0.15);
              display: flex;
              flex-direction: column;
              padding: 24px;
              box-sizing: border-box;
              animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .drawer-close-btn {
              background: none;
              border: none;
              color: var(--text2);
              font-size: 1.3rem;
              cursor: pointer;
              transition: all 0.15s ease;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              width: 32px;
              height: 32px;
            }
            .drawer-close-btn:hover {
              color: var(--accent);
              background: rgba(233,69,96,0.08);
            }
            .drawer-scroll-area {
              flex: 1;
              overflow-y: auto;
              margin-right: -12px;
              padding-right: 12px;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .drawer-scroll-area::-webkit-scrollbar {
              width: 6px;
            }
            .drawer-scroll-area::-webkit-scrollbar-track {
              background: transparent;
            }
            .drawer-scroll-area::-webkit-scrollbar-thumb {
              background: var(--border);
              border-radius: 10px;
            }
            .drawer-footer {
              padding-top: 16px;
              border-top: 1px solid var(--border);
              margin-top: auto;
            }
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            .search-banner {
              margin-bottom: 32px;
              text-align: left;
            }
            .search-title {
              font-family: 'Playfair Display', 'Georgia', serif;
              font-size: 2.5rem;
              font-weight: 800;
              color: var(--text);
              margin: 0 0 8px;
              letter-spacing: -0.02em;
              line-height: 1.2;
            }
            .highlight-text {
              background: linear-gradient(135deg, var(--accent), var(--gold));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              font-weight: 900;
            }
            .search-subtitle {
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-size: 1rem;
              color: var(--text2);
              margin: 0 0 28px;
              font-weight: 500;
              opacity: 0.9;
            }
            .filter-card {
              background: var(--card);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
              border: 1px solid var(--border);
              padding: 24px;
              border-radius: var(--radius-lg);
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            body.dark .filter-card {
              background: rgba(26, 26, 45, 0.65);
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            body:not(.dark) .filter-card {
              background: rgba(255, 255, 255, 0.75);
            }
            .search-input-wrapper {
              position: relative;
              width: 100%;
            }
            .search-input-icon {
              position: absolute;
              left: 16px;
              top: 50%;
              transform: translateY(-50%);
              font-size: 1.05rem;
              color: var(--accent);
              pointer-events: none;
              transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .search-input-wrapper:focus-within .search-input-icon {
              transform: translateY(-50%) scale(1.15);
            }
            .search-input-field {
              width: 100% !important;
              padding: 14px 16px 14px 44px !important;
              border-radius: 12px !important;
              border: 1.5px solid var(--border) !important;
              background: var(--input-bg) !important;
              color: var(--text) !important;
              font-size: 0.94rem !important;
              outline: none !important;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02) !important;
            }
            .search-input-field:focus {
              border-color: var(--accent) !important;
              box-shadow: 0 4px 20px rgba(233, 69, 96, 0.15), 0 0 0 3px rgba(233, 69, 96, 0.1) !important;
              background: var(--bg2) !important;
            }
            .selectors-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
            }
            .mobile-filter-toggle-btn {
              display: none;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              padding: 11px 16px;
              background: var(--bg);
              border: 1.5px solid var(--border);
              border-radius: 10px;
              color: var(--text);
              font-size: 0.88rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              outline: none;
            }
            .mobile-filter-toggle-btn:hover {
              border-color: var(--accent);
            }
            .filter-badge {
              background: var(--accent);
              color: #fff;
              font-size: 0.72rem;
              font-weight: 800;
              padding: 2px 7px;
              border-radius: 10px;
              line-height: 1;
            }
            @media (max-width: 768px) {
              .mobile-filter-toggle-btn {
                display: flex;
              }
              .selectors-grid {
                display: none;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-top: 6px;
              }
              .selectors-grid.mobile-show {
                display: grid;
              }
            }
            @media (max-width: 480px) {
              .selectors-grid {
                grid-template-columns: 1fr;
              }
              .search-title {
                font-size: 2rem;
              }
            }
            .select-wrapper {
              position: relative;
            }
            .filter-select {
              width: 100% !important;
              padding: 11px 14px !important;
              border-radius: 12px !important;
              border: 1.5px solid var(--border) !important;
              background: var(--input-bg) !important;
              color: var(--text) !important;
              font-size: 0.88rem !important;
              cursor: pointer !important;
              outline: none !important;
              transition: all 0.2s ease !important;
              appearance: none !important;
              background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
              background-repeat: no-repeat !important;
              background-position: right 12px center !important;
              background-size: 14px !important;
              padding-right: 32px !important;
            }
            .filter-select:focus {
              border-color: var(--accent) !important;
              box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1) !important;
            }
            .filter-select.filter-active {
              border-color: var(--accent) !important;
              background-color: rgba(233, 69, 96, 0.04) !important;
              color: var(--accent) !important;
              font-weight: 600 !important;
            }
            body.dark .filter-select.filter-active {
              background-color: rgba(233, 69, 96, 0.1) !important;
            }
            .reset-btn-link {
              background: none;
              border: none;
              color: var(--accent);
              cursor: pointer;
              font-size: 0.86rem;
              font-weight: 600;
              padding: 0;
              transition: opacity 0.15s;
            }
            .reset-btn-link:hover {
              opacity: 0.8;
              text-decoration: underline;
            }

            /* Quick Book Card */
            .quick-book-card {
              margin-bottom: 28px;
              padding: 20px 24px;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius-lg);
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
            }
            .quick-book-title {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.82rem;
              font-weight: 800;
              color: var(--text2);
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin: 0 0 16px;
            }
            .pulse-lightning {
              display: inline-block;
              color: #f59e0b;
              animation: lightningPulse 1.6s infinite ease-in-out;
            }
            @keyframes lightningPulse {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(245, 158, 11, 0)); }
              50% { transform: scale(1.15); filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.6)); }
            }
            .quick-book-list {
              display: flex;
              gap: 20px;
              overflow-x: auto;
              padding-bottom: 8px;
              scrollbar-width: none;
              -webkit-overflow-scrolling: touch;
            }
            .quick-book-list::-webkit-scrollbar {
              display: none;
            }
            .quick-book-avatar-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              cursor: pointer;
              flex-shrink: 0;
              width: 72px;
              transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .quick-book-avatar-item:hover {
              transform: translateY(-2px);
            }
            .quick-book-avatar-ring {
              position: relative;
              width: 58px;
              height: 58px;
              border-radius: 50%;
              padding: 2px;
              background: var(--card);
              border: 2.5px solid var(--border);
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .quick-book-avatar-item:hover .quick-book-avatar-ring {
              border-color: var(--accent);
              box-shadow: 0 4px 12px rgba(233, 69, 96, 0.2);
            }
            .quick-book-avatar-img {
              width: 100%;
              height: 100%;
              border-radius: 50%;
              object-fit: cover;
            }
            .quick-book-badge {
              position: absolute;
              bottom: -2px;
              right: -2px;
              background: var(--accent);
              color: #fff;
              font-size: 0.6rem;
              font-weight: 800;
              padding: 2px 5px;
              border-radius: 10px;
              border: 2.5px solid var(--card);
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 1;
            }
            .quick-book-avatar-name {
              font-size: 0.76rem;
              font-weight: 700;
              color: var(--text);
              text-overflow: ellipsis;
              overflow: hidden;
              white-space: nowrap;
              width: 100%;
              text-align: center;
              transition: color 0.15s;
            }
            .quick-book-avatar-item:hover .quick-book-avatar-name {
              color: var(--accent);
            }
            
            /* Card & grid styling */
            .salon-card {
              display: flex;
              flex-direction: column;
              height: 100%;
              overflow: hidden;
              border-radius: var(--radius);
              background: var(--card);
              border: 1px solid var(--border);
              box-shadow: var(--shadow-sm);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .salon-card:hover {
              transform: translateY(-4px);
              box-shadow: var(--shadow-lg);
              border-color: rgba(233, 69, 96, 0.18);
            }
            .salon-card-img-wrap {
              position: relative;
              height: 190px;
              overflow: hidden;
            }
            .salon-card-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .salon-card:hover .salon-card-img {
              transform: scale(1.04);
            }
            .top-rated-badge {
              background: rgba(212, 168, 67, 0.12);
              color: var(--gold);
              border: 1px solid rgba(212, 168, 67, 0.2);
              font-size: 0.72rem;
              font-weight: 700;
              padding: 3px 9px;
              border-radius: 20px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              flex-shrink: 0;
            }
            .salon-ghost-btn {
              transition: all 0.2s ease !important;
            }
            .salon-ghost-btn:hover {
              border-color: var(--accent) !important;
              color: var(--accent) !important;
              background: rgba(233, 69, 96, 0.04) !important;
            }
            .salon-primary-btn {
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            .salon-primary-btn:hover {
              background: var(--accent-hover) !important;
              border-color: var(--accent-hover) !important;
              box-shadow: 0 4px 12px rgba(233, 69, 96, 0.35) !important;
              transform: translateY(-1px);
            }
          `}</style>
          {filteredSalons.length === 0 && (
            <div style={emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✂</div>
              <p style={{ fontWeight: 600, color: 'var(--text)' }}>No salons found</p>
              <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Try adjusting your search filters</p>
            </div>
          )}
          <div style={grid}>
            {filteredSalons.map((s) => {
              const prices = s.services?.map(ser => ser.price) || [];
              const minPrice = prices.length > 0 ? Math.min(...prices) : null;
              const shortLoc = s.city || (s.address ? s.address.split(',')[0] : 'Location');
              const isActive = isShopActive(s.openingTime, s.closingTime);
              const statusBadgeClass = isActive ? 'badge-confirmed' : 'badge-cancelled';
              const statusLabel = isActive ? 'Open' : 'Closed';

              return (
                <div
                  key={s._id}
                  className="salon-card"
                  onClick={() => navigate(`/salons/${s._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="salon-card-img-wrap" style={imgWrap}>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt={s.name} className="salon-card-img" style={cardImg} />
                    ) : (
                      <div style={imgFallback}><span style={{ fontSize: '2.5rem' }}>✂</span></div>
                    )}
                    <div style={imgOverlay} />
                  </div>
                  <div style={cardBody}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={cardTitleStyle}>
                        {s.name}
                        <span className={`badge ${statusBadgeClass}`} style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '0.62rem', textTransform: 'uppercase', borderRadius: '4px', fontWeight: 700, verticalAlign: 'middle', display: 'inline-block' }}>
                          {statusLabel}
                        </span>
                      </h3>
                      {s.avgRating >= 4.5 && (
                        <span className="top-rated-badge" style={{ flexShrink: 0 }}>Top Rated</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex' }}>
                        {renderStars(s.avgRating)}
                      </div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
                        {s.avgRating ? s.avgRating.toFixed(1) : '0.0'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>
                        ({s.barbers?.length || 0} barber{s.barbers?.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                      <span style={locationStyle}>📍 {shortLoc}</span>
                      {s.liveQueue && s.liveQueue.activeCount > 0 && isActive && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', background: 'rgba(217, 119, 6, 0.05)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                          ⏳ Queue: {s.liveQueue.activeCount} waiting (~{s.liveQueue.estWaitMins}m wait)
                        </span>
                      )}
                    </div>
                    
                    {minPrice !== null ? (
                      <p style={priceStyle}>Starts from <span style={{ color: 'var(--accent)', fontWeight: 800 }}>₹{minPrice}</span></p>
                    ) : (
                      <p style={pricePlaceholderStyle}>Services details inside</p>
                    )}

                    {s.services?.length > 0 && (
                      <div style={tagsContainerStyle}>
                        {s.services.slice(0, 3).map((ser, idx) => (
                          <span key={idx} style={tagStyle}>
                            {ser.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                      <button
                        className="salon-ghost-btn"
                        style={ghostBtnStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/salons/${s._id}`);
                        }}
                      >
                        View barbers
                      </button>
                      <button
                        className={isActive ? "salon-primary-btn" : ""}
                        style={isActive ? primaryBtnStyle : disabledBtnStyle}
                        disabled={!isActive}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/salons/${s._id}`);
                        }}
                      >
                        {isActive ? 'Book Now' : 'Closed'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Quick Booking Drawer */}
      {selectedQuickBarber && (
        <QuickBookingDrawer
          barber={selectedQuickBarber}
          userPhone={userPhone}
          onClose={() => setSelectedQuickBarber(null)}
        />
      )}
    </div>
  );
}

function renderStars(rating) {
  const stars = [];
  const floor = Math.floor(rating || 0);
  for (let i = 1; i <= 5; i++) {
    if (i <= floor) {
      stars.push(<span key={i} style={{ color: '#f59e0b', marginRight: '2px', fontSize: '0.92rem' }}>★</span>);
    } else {
      stars.push(<span key={i} style={{ color: 'var(--text3)', marginRight: '2px', fontSize: '0.92rem', opacity: 0.35 }}>★</span>);
    }
  }
  return stars;
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
  gap: '22px',
};
const imgWrap = { position: 'relative', height: '190px', overflow: 'hidden' };
const cardImg = { width: '100%', height: '100%', objectFit: 'cover' };
const imgFallback = {
  width: '100%', height: '100%',
  background: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)',
};
const imgOverlay = {
  position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
  background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
  pointerEvents: 'none',
};
const cardBody = { padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 };
const cardTitleStyle = { fontSize: '1.12rem', fontWeight: 700, margin: 0, color: 'var(--text)', flex: 1, lineHeight: 1.3 };
const locationStyle = { color: 'var(--text2)', fontSize: '0.85rem', margin: '0 0 6px', fontWeight: 500 };
const priceStyle = { fontSize: '0.88rem', color: 'var(--text2)', margin: '0 0 10px', fontWeight: 500 };
const pricePlaceholderStyle = { fontSize: '0.88rem', color: 'var(--text3)', margin: '0 0 10px', fontStyle: 'italic' };
const tagsContainerStyle = { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 12px' };
const tagStyle = {
  background: 'rgba(233, 69, 96, 0.05)',
  color: 'var(--accent)',
  border: '1px solid rgba(233, 69, 96, 0.12)',
  borderRadius: '20px',
  padding: '4px 10px',
  fontSize: '0.74rem',
  fontWeight: 600,
};
const ghostBtnStyle = {
  flex: 1,
  padding: '9px 12px',
  borderRadius: '10px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text2)',
  transition: 'all 0.2s ease',
  textAlign: 'center',
  fontFamily: 'inherit',
};
const primaryBtnStyle = {
  flex: 1,
  padding: '9px 12px',
  borderRadius: '10px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1.5px solid var(--accent)',
  background: 'var(--accent)',
  color: '#fff',
  transition: 'all 0.2s ease',
  textAlign: 'center',
  fontFamily: 'inherit',
};
const emptyState = {
  textAlign: 'center', padding: '60px 24px',
  background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)',
};
const disabledBtnStyle = {
  flex: 1,
  padding: '9px 12px',
  borderRadius: '10px',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'not-allowed',
  border: '1.5px solid var(--border)',
  background: 'rgba(0,0,0,0.05)',
  color: 'var(--text3)',
  textAlign: 'center',
  fontFamily: 'inherit',
};

function QuickBookingDrawer({ barber, userPhone, onClose }) {
  const [fullBarber, setFullBarber] = useState(null);
  const [loadingBarber, setLoadingBarber] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [form, setForm] = useState({ date: '', timeSlot: '', services: [], notes: '', phone: userPhone || '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoadingBarber(true);
    api.get(`/barbers/${barber._id}`)
      .then(({ data }) => {
        setFullBarber(data);
        setLoadingBarber(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load barber details');
        setLoadingBarber(false);
      });
  }, [barber._id]);

  useEffect(() => {
    if (userPhone) {
      setForm(f => ({ ...f, phone: userPhone }));
    }
  }, [userPhone]);

  const selectedServices = fullBarber?.salonId?.services?.filter((service) => form.services.includes(service.name)) || [];
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + Number(service.duration || 30), 0) || 30;

  useEffect(() => {
    if (!form.date || !fullBarber) return;
    let active = true;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setAvailableSlots([]);
      try {
        const { data } = await api.get(`/barbers/${barber._id}/available-slots`, {
          params: { date: form.date, duration: totalDuration }
        });
        if (!active) return;
        setUnavailable(data.unavailable || false);
        const slots = data.slots || [];
        setAvailableSlots(slots);
        
        setForm((f) => {
          if (f.timeSlot && slots.includes(f.timeSlot)) {
            return f;
          }
          return { ...f, timeSlot: '' };
        });
      } catch {
        if (!active) return;
        setForm((f) => ({ ...f, timeSlot: '' }));
      } finally {
        if (active) setSlotsLoading(false);
      }
    };
    fetchSlots();
    return () => {
      active = false;
    };
  }, [form.date, totalDuration, fullBarber, barber._id]);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setForm((f) => ({ ...f, date, timeSlot: '' }));
  };

  const toggleService = (serviceName) => {
    setForm((current) => {
      const services = current.services.includes(serviceName)
        ? current.services.filter((name) => name !== serviceName)
        : [...current.services, serviceName];
      return { ...current, services };
    });
  };

  const handleWaitlist = async () => {
    setError('');
    setWaitlistLoading(true);
    try {
      await api.post('/waitlist', { barberId: barber._id, date: form.date });
      setSuccess('You have been added to the waitlist! We will notify you if a slot opens up.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBookingLoading(true);
    try {
      const selectedServiceNames = selectedServices.map((service) => service.name);
      await api.post('/bookings', {
        ...form,
        service: selectedServiceNames.join(', '),
        barberId: barber._id,
        salonId: fullBarber.salonId._id,
        price: totalPrice,
        duration: totalDuration,
      });
      setSuccess('Booking submitted! The barber will review your request shortly.');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const isActive = fullBarber?.salonId ? isShopActive(fullBarber.salonId.openingTime, fullBarber.salonId.closingTime) : true;

  const CATEGORIES = [
    { id: 'morning', label: 'Morning', emoji: '🌅' },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️' },
    { id: 'evening', label: 'Evening', emoji: '🌆' }
  ];

  const getSlotStyle = (state) => {
    const base = {
      padding: '8px 4px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      textAlign: 'center',
      border: '1.5px solid transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px'
    };
    switch (state) {
      case 'selected':
        return { ...base, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', boxShadow: '0 4px 10px rgba(233, 69, 96, 0.25)' };
      case 'fast-filling':
        return { ...base, background: 'rgba(217, 119, 6, 0.06)', color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.25)' };
      case 'booked':
        return { ...base, background: 'rgba(0,0,0,0.01)', color: 'var(--text3)', borderColor: 'var(--border)', textDecoration: 'line-through', opacity: 0.65, cursor: 'not-allowed', pointerEvents: 'none' };
      case 'closed':
        return { ...base, background: 'rgba(0,0,0,0.02)', color: 'var(--text3)', borderColor: 'var(--border)', borderStyle: 'dashed', opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' };
      case 'available':
      default:
        return { ...base, background: 'rgba(5, 150, 105, 0.06)', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.25)' };
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={barber.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=e94560&color=fff&size=42`}
              alt={barber.name}
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent)' }}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>{barber.name}</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text2)', fontWeight: 500 }}>⚡ Quick Booking</span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close drawer">✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: '1.2rem', fontWeight: 700 }}>Booking Submitted!</h3>
            <p style={{ color: 'var(--text2)', margin: '0 0 24px', fontSize: '0.88rem', lineHeight: 1.5 }}>
              Your repeat booking has been submitted. The barber will review it shortly.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                className="salon-primary-btn"
                style={{ ...primaryBtnStyle, width: '100%', flex: 'none', padding: '11px' }}
                onClick={() => {
                  onClose();
                  navigate('/my-bookings');
                }}
              >
                View My Bookings
              </button>
              <button
                className="salon-ghost-btn"
                style={{ ...ghostBtnStyle, width: '100%', flex: 'none', padding: '11px' }}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : loadingBarber ? (
          <div style={{ padding: '20px 0', flex: 1 }}>
            <LoadingSkeleton rows={5} height={42} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)', flex: 1 }}>
            <div className="drawer-scroll-area">
              {!isActive && (
                <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', fontSize: '0.82rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <strong style={{ display: 'block' }}>Shop is Currently Closed!</strong>
                    <span style={{ fontSize: '0.74rem', marginTop: '2px', opacity: 0.9, display: 'block' }}>
                      Operating hours: {formatTime12(fullBarber.salonId?.openingTime || '09:00')} - {formatTime12(fullBarber.salonId?.closingTime || '21:00')}.
                    </span>
                  </div>
                </div>
              )}

              {error && <div className="alert-error" style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>{error}</div>}

              {/* Date */}
              <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="field-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>Date</label>
                <input
                  className="field-input"
                  type="date"
                  value={form.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleDateChange}
                  required
                  disabled={!isActive}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: !isActive ? 0.6 : 1,
                    cursor: !isActive ? 'not-allowed' : 'default'
                  }}
                />
              </div>

              {unavailable && (
                <div className="alert-error" style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  Barber is unavailable on this date. Please choose another.
                </div>
              )}

              {/* Services selection */}
              <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="field-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', display: 'block' }}>Select Services</label>
                {fullBarber.salonId?.services && fullBarber.salonId.services.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {fullBarber.salonId.services.map((s) => {
                      const isSelected = form.services.includes(s.name);
                      return (
                        <button
                          key={s.name}
                          type="button"
                          disabled={!isActive}
                          onClick={() => toggleService(s.name)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px',
                            padding: '10px 12px',
                            border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: '8px',
                            cursor: isActive ? 'pointer' : 'not-allowed',
                            background: isSelected ? 'rgba(233,69,96,0.06)' : 'var(--card)',
                            color: isSelected ? 'var(--accent)' : 'var(--text)',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                            opacity: isActive ? 1 : 0.6,
                            textAlign: 'left'
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>{SERVICE_ICONS[s.name] || SERVICE_ICONS.default}</span>
                            <span>{s.name}</span>
                          </span>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>₹{s.price}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text2)', fontSize: '0.82rem', margin: 0 }}>No services configured.</p>
                )}
              </div>

              {/* Upsell Add-ons */}
              {(() => {
                const recommended = fullBarber.salonId?.services?.filter((s) => !form.services.includes(s.name));
                if (form.services.length === 0 || !recommended || recommended.length === 0) return null;
                return (
                  <div style={{ padding: '12px', background: 'rgba(233,69,96,0.02)', border: '1.5px dashed rgba(233,69,96,0.15)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                      ✨ Recommended Add-ons
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {recommended.slice(0, 2).map((s) => (
                        <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '1rem' }}>{SERVICE_ICONS[s.name] || SERVICE_ICONS.default}</span>
                            <div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{s.name}</span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text2)', display: 'block' }}>+{s.duration || 30}m</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)' }}>₹{s.price}</span>
                            <button
                              type="button"
                              onClick={() => toggleService(s.name)}
                              style={{
                                padding: '4px 8px',
                                background: 'rgba(233,69,96,0.06)',
                                color: 'var(--accent)',
                                border: '1px solid rgba(233,69,96,0.15)',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              ＋ Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Time Slots */}
              {form.date && !unavailable && (
                <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label className="field-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', display: 'block' }}>Select Time Slot</label>
                  {slotsLoading ? (
                    <p style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>Loading slots…</p>
                  ) : (() => {
                    const allHourlySlots = [
                      '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
                      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
                      '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
                    ];

                    const workingSlots = fullBarber.workingSlots && fullBarber.workingSlots.length > 0
                      ? fullBarber.workingSlots
                      : ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

                    const combinedSlots = Array.from(new Set([...allHourlySlots, ...workingSlots]));
                    const sortedSlots = combinedSlots.sort((a, b) => {
                      const [hA, mA] = a.split(':').map(Number);
                      const [hB, mB] = b.split(':').map(Number);
                      return (hA * 60 + mA) - (hB * 60 + mB);
                    });

                    const isToday = form.date === new Date().toISOString().split('T')[0];
                    const isSlotInPast = (slotStr) => {
                      if (!isToday) return false;
                      const [slotH, slotM] = slotStr.split(':').map(Number);
                      const now = new Date();
                      const currentH = now.getHours();
                      const currentM = now.getMinutes();
                      return (slotH * 60 + slotM) <= (currentH * 60 + currentM);
                    };

                    const isFastFilling = (slotStr) => {
                      if (availableSlots.length <= 3) return true;
                      if (isToday) {
                        const [slotH, slotM] = slotStr.split(':').map(Number);
                        const now = new Date();
                        const currentH = now.getHours();
                        const currentM = now.getMinutes();
                        const slotMins = slotH * 60 + slotM;
                        const currentMins = currentH * 60 + currentM;
                        return slotMins > currentMins && slotMins <= currentMins + 180;
                      }
                      return false;
                    };

                    const timeToMins = (t) => {
                      const [h, m] = t.split(':').map(Number);
                      return h * 60 + m;
                    };

                    const isWithinShopHours = (slotStr) => {
                      if (!fullBarber || !fullBarber.salonId) return true;
                      const { openingTime, closingTime } = fullBarber.salonId;
                      if (!openingTime || !closingTime) return true;

                      const slotStart = timeToMins(slotStr);
                      const openStart = timeToMins(openingTime);
                      const closeEnd = timeToMins(closingTime);

                      if (openStart < closeEnd) {
                        return slotStart >= openStart && slotStart < closeEnd;
                      } else {
                        return slotStart >= openStart || slotStart < closeEnd;
                      }
                    };

                    const getSlotState = (slotStr) => {
                      if (!isWithinShopHours(slotStr)) return 'closed';
                      const isAvailable = availableSlots.includes(slotStr) && !isSlotInPast(slotStr);
                      if (!isAvailable) return 'booked';
                      if (form.timeSlot === slotStr) return 'selected';
                      if (isFastFilling(slotStr)) return 'fast-filling';
                      return 'available';
                    };

                    const getSlotCategory = (timeStr) => {
                      const hour = parseInt(timeStr.split(':')[0], 10);
                      if (hour < 12) return 'morning';
                      if (hour < 17) return 'afternoon';
                      return 'evening';
                    };

                    const formatTimeSlotForDisplay = (slotStr) => {
                      const [hoursStr, minutesStr] = slotStr.split(':');
                      const hours = parseInt(hoursStr, 10);
                      const minutes = parseInt(minutesStr, 10);
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const displayHours = hours % 12 || 12;
                      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
                      return `${displayHours}:${displayMinutes} ${ampm}`;
                    };

                    const groupedSlots = { morning: [], afternoon: [], evening: [] };
                    sortedSlots.forEach((slot) => {
                      const cat = getSlotCategory(slot);
                      groupedSlots[cat].push(slot);
                    });

                    const hasAvailable = sortedSlots.some((slot) => {
                      const state = getSlotState(slot);
                      return state === 'available' || state === 'fast-filling';
                    });

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '8px 12px', marginBottom: '4px', fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span> Available</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}></span> Fast</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text3)', opacity: 0.5 }}></span> Booked</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px dashed var(--text3)', opacity: 0.3 }}></span> Closed</div>
                        </div>

                        {CATEGORIES.map((cat) => {
                          const slots = groupedSlots[cat.id];
                          if (slots.length === 0) return null;
                          return (
                            <div key={cat.id} style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>
                                {cat.emoji} {cat.label}
                              </span>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: '6px' }}>
                                {slots.map((slot) => {
                                  const state = getSlotState(slot);
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      onClick={() => setForm((f) => ({ ...f, timeSlot: slot }))}
                                      style={getSlotStyle(state)}
                                    >
                                      {formatTimeSlotForDisplay(slot)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {!hasAvailable && (
                          <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center' }}>
                            <p style={{ color: '#dc2626', fontSize: '0.78rem', margin: '0 0 8px', fontWeight: 500 }}>All slots are booked or closed.</p>
                            <button type="button" className="salon-ghost-btn" onClick={handleWaitlist} disabled={waitlistLoading} style={{ ...ghostBtnStyle, fontSize: '0.78rem', color: '#dc2626', borderColor: 'rgba(239,68,68,0.15)', padding: '5px 10px', flex: 'none', width: '100%' }}>
                              {waitlistLoading ? 'Joining...' : 'Join Waitlist'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Phone number */}
              <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="field-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>Phone Number</label>
                <input
                  className="field-input"
                  placeholder="e.g. 9876543210"
                  type="tel"
                  pattern="[6-9][0-9]{9}"
                  title="10-digit Indian mobile number starting with 6-9"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  disabled={!isActive}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: !isActive ? 0.6 : 1,
                    cursor: !isActive ? 'not-allowed' : 'default'
                  }}
                />
              </div>

              {/* Notes */}
              <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="field-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>Notes (optional)</label>
                <textarea
                  className="field-input"
                  placeholder="Any special requests or preferences…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  disabled={!isActive}
                  style={{
                    width: '100%',
                    height: '60px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    opacity: !isActive ? 0.6 : 1,
                    cursor: !isActive ? 'not-allowed' : 'default'
                  }}
                />
              </div>
            </div>

            {/* Sticky Bottom Footer inside form */}
            <div className="drawer-footer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text3)', display: 'block', fontWeight: 500 }}>Total Price</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>₹{totalPrice}</span>
                </div>
                {form.services.length > 0 && (
                  <span style={{ fontSize: '0.72rem', background: 'var(--bg2)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text2)' }}>
                    ⏱ {totalDuration} mins
                  </span>
                )}
              </div>
              <button
                className="salon-primary-btn"
                type="submit"
                disabled={bookingLoading || !form.timeSlot || form.services.length === 0 || unavailable || !isActive}
                style={{
                  ...primaryBtnStyle,
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.9rem',
                  flex: 'none',
                  backgroundColor: isActive && form.timeSlot && form.services.length > 0 ? 'var(--accent)' : 'var(--border)',
                  cursor: isActive && form.timeSlot && form.services.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                {bookingLoading ? 'Submitting...' : isActive ? 'Confirm Booking' : 'Shop Closed'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
