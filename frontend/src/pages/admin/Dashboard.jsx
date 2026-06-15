import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../../api/axios';
import Pagination from '../../components/Pagination';
import LoadingSkeleton from '../../components/LoadingSkeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const STATUS_CONFIG = {
  pending:   { cls: 'badge-pending',   label: 'Pending' },
  confirmed: { cls: 'badge-confirmed', label: 'Confirmed' },
  completed: { cls: 'badge-completed', label: 'Completed' },
  cancelled: { cls: 'badge-cancelled', label: 'Cancelled' },
};

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{icon}</div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Yes, Delete', cancelText = 'Cancel' }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-box" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1.5px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          color: '#dc2626',
          margin: '0 auto 16px'
        }}>
          ⚠️
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
            {cancelText}
          </button>
          <button className="btn-primary" onClick={onConfirm} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', fontWeight: 600, backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Tab ─────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(({ data }) => setStats(data)); }, []);
  if (!stats) return <LoadingSkeleton rows={4} height={80} />;

  const statusMap = Object.fromEntries(stats.statusCounts.map((s) => [s._id, s.count]));
  const barData = {
    labels: stats.bookingsPerDay.map((d) => d._id),
    datasets: [{ label: 'Bookings', data: stats.bookingsPerDay.map((d) => d.count), backgroundColor: '#e94560', borderRadius: 6 }],
  };
  const doughnutData = {
    labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    datasets: [{ data: ['pending','confirmed','completed','cancelled'].map((s) => statusMap[s] || 0), backgroundColor: ['#d97706','#059669','#2563eb','#dc2626'], borderWidth: 0 }],
  };

  return (
    <div>
      <div style={statsGrid}>
        <StatCard icon="📋" label="Total Bookings" value={stats.totalBookings} color="#e94560" />
        <StatCard icon="💰" label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} color="#d97706" />
        <StatCard icon="👤" label="Total Users" value={stats.totalUsers} color="#059669" />
        <StatCard icon="🏪" label="Salons" value={stats.totalSalons} color="#2563eb" />
        <StatCard icon="✂" label="Barbers" value={stats.totalBarbers} color="#7c3aed" />
      </div>

      <div className="dashboard-charts-grid">
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>Bookings — Last 7 Days</h4>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } } }} />
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>Bookings by Status</h4>
          <Doughnut data={doughnutData} options={{ responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } } }} />
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>Top Barbers by Rating</h4>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Salon</th><th>Rating</th><th>Reviews</th></tr></thead>
          <tbody>
            {stats.topBarbers.map((b) => (
              <tr key={b._id}>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td style={{ color: 'var(--text2)' }}>{b.salonId?.name}</td>
                <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>{'★'.repeat(Math.round(b.rating))} {b.rating}</span></td>
                <td style={{ color: 'var(--text2)' }}>{b.totalReviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Salons Tab ────────────────────────────────────────────
function SalonsTab() {
  const [salons, setSalons] = useState([]);
  const [owners, setOwners] = useState([]);
  const [form, setForm] = useState({ name: '', address: '', description: '', imageUrl: '', ownerId: '' });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  const fetchSalons = () => api.get('/salons').then(({ data }) => setSalons(data));
  const fetchOwners = () => api.get('/admin/shop-owners').then(({ data }) => setOwners(data));
  useEffect(() => { fetchSalons(); fetchOwners(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) { await api.put(`/salons/${editing}`, form); setEditing(null); }
    else { await api.post('/salons', form); }
    setForm({ name: '', address: '', description: '', imageUrl: '', ownerId: '' });
    setOpen(false);
    fetchSalons();
  };

  const handleEdit = (s) => { setEditing(s._id); setForm({ name: s.name, address: s.address, description: s.description || '', imageUrl: s.imageUrl || '', ownerId: s.ownerId?._id || '' }); setOpen(true); };
  
  const handleDeleteClick = (id, name) => {
    setConfirmDelete({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ isOpen: false, id: null, name: '' });
    await api.delete(`/salons/${id}`);
    fetchSalons();
  };

  const handleCancel = () => { setEditing(null); setForm({ name: '', address: '', description: '', imageUrl: '', ownerId: '' }); setOpen(false); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Salons ({salons.length})</h3>
        {!open && <button className="btn-primary" onClick={() => setOpen(true)} style={{ fontSize: '0.85rem', padding: '7px 16px' }}>+ Add Salon</button>}
      </div>

      {open && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem' }}>{editing ? 'Edit Salon' : 'New Salon'}</h4>
          <form onSubmit={handleSubmit} className="dashboard-form-grid">
            <div className="field-group"><label className="field-label">Name</label><input className="field-input" placeholder="Salon name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="field-group"><label className="field-label">Address</label><input className="field-input" placeholder="Street, City" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
            <div className="field-group">
              <label className="field-label">Shop Owner</label>
              <select className="field-input" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} required>
                <option value="">Select Owner</option>
                {owners.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.email})</option>)}
              </select>
            </div>
            <div className="field-group"><label className="field-label">Image URL</label><input className="field-input" placeholder="https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
            <div className="field-group" style={{ gridColumn: '1 / -1' }}><label className="field-label">Description</label><input className="field-input" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
              <button className="btn-primary" type="submit" style={{ fontSize: '0.88rem' }}>{editing ? 'Update' : 'Add'}</button>
              <button className="btn-ghost" type="button" onClick={handleCancel} style={{ fontSize: '0.88rem' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card responsive-table-card" style={{ overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Name</th><th>Address</th><th>Owner</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {salons.map((s) => (
              <tr key={s._id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ color: 'var(--text2)' }}>{s.address}</td>
                <td style={{ color: 'var(--text2)' }}>{s.ownerId ? `${s.ownerId.name} (${s.ownerId.email})` : 'Unassigned'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button style={editBtn} onClick={() => handleEdit(s)}>Edit</button>
                  <button style={deleteBtn} onClick={() => handleDeleteClick(s._id, s.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Salon"
        message={`Are you sure you want to delete the salon "${confirmDelete.name}"? This action cannot be undone.`}
      />
    </div>
  );
}

// ── Barbers Tab ───────────────────────────────────────────
function BarbersTab() {
  const [barbers, setBarbers] = useState([]);
  const [salons, setSalons] = useState([]);
  const [form, setForm] = useState({ name: '', salonId: '', specializations: '', rating: 0, bio: '', imageUrl: '' });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  const fetchData = async () => {
    const salonList = (await api.get('/salons')).data;
    setSalons(salonList);
    const all = [];
    for (const s of salonList) {
      const { data } = await api.get(`/salons/${s._id}`);
      all.push(...data.barbers.map((b) => ({ ...b, salonName: s.name })));
    }
    setBarbers(all);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean), rating: Number(form.rating) };
    if (editing) { await api.put(`/barbers/${editing}`, payload); setEditing(null); }
    else { await api.post('/barbers', payload); }
    setForm({ name: '', salonId: '', specializations: '', rating: 0, bio: '', imageUrl: '' });
    setOpen(false);
    fetchData();
  };

  const handleEdit = (b) => {
    setEditing(b._id);
    setForm({ name: b.name, salonId: b.salonId?._id || b.salonId, specializations: (b.specializations || []).join(', '), rating: b.rating, bio: b.bio || '', imageUrl: b.imageUrl || '' });
    setOpen(true);
  };
  
  const handleDeleteClick = (id, name) => {
    setConfirmDelete({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ isOpen: false, id: null, name: '' });
    await api.delete(`/barbers/${id}`);
    fetchData();
  };

  const handleCancel = () => { setEditing(null); setForm({ name: '', salonId: '', specializations: '', rating: 0, bio: '', imageUrl: '' }); setOpen(false); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Barbers ({barbers.length})</h3>
        {!open && <button className="btn-primary" onClick={() => setOpen(true)} style={{ fontSize: '0.85rem', padding: '7px 16px' }}>+ Add Barber</button>}
      </div>

      {open && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem' }}>{editing ? 'Edit Barber' : 'New Barber'}</h4>
          <form onSubmit={handleSubmit} className="dashboard-form-grid">
            <div className="field-group"><label className="field-label">Name</label><input className="field-input" placeholder="Barber name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="field-group">
              <label className="field-label">Salon</label>
              <select className="field-input" value={form.salonId} onChange={(e) => setForm({ ...form, salonId: e.target.value })} required>
                <option value="">Select Salon</option>
                {salons.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field-group"><label className="field-label">Specializations</label><input className="field-input" placeholder="Fade, Beard Trim, Color" value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Rating (0-5)</label><input className="field-input" type="number" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} min="0" max="5" step="0.1" /></div>
            <div className="field-group"><label className="field-label">Bio</label><input className="field-input" placeholder="Short bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Image URL</label><input className="field-input" placeholder="https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
              <button className="btn-primary" type="submit" style={{ fontSize: '0.88rem' }}>{editing ? 'Update' : 'Add'}</button>
              <button className="btn-ghost" type="button" onClick={handleCancel} style={{ fontSize: '0.88rem' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card responsive-table-card" style={{ overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Name</th><th>Salon</th><th>Rating</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {barbers.map((b) => (
              <tr key={b._id}>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td style={{ color: 'var(--text2)' }}>{b.salonName}</td>
                <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>★ {b.rating}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button style={editBtn} onClick={() => handleEdit(b)}>Edit</button>
                  <button style={deleteBtn} onClick={() => handleDeleteClick(b._id, b.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Barber"
        message={`Are you sure you want to delete the barber "${confirmDelete.name}"? This action cannot be undone.`}
      />
    </div>
  );
}

// ── Bookings Tab ──────────────────────────────────────────
function AdminCompleteOtpModal({ booking, onClose, onSubmit }) {
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
                Cancel
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

function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [completingBooking, setCompletingBooking] = useState(null);

  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const fetchBookings = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/bookings', { 
        params: { 
          page: p, 
          limit: 10,
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined
        } 
      });
      setBookings(data.bookings);
      setPages(data.pages);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, [debouncedSearch, statusFilter]);

  const updateStatus = async (id, status, otp = undefined) => {
    try {
      await api.patch(`/admin/bookings/${id}/status`, { status, otp });
      fetchBookings(page);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return (
    <div>
      {completingBooking && (
        <AdminCompleteOtpModal
          booking={completingBooking}
          onClose={() => setCompletingBooking(null)}
          onSubmit={(id, otp) => updateStatus(id, 'completed', otp)}
        />
      )}
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, marginRight: 'auto' }}>All Bookings</h3>
        
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search customer, barber, salon..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{ 
              fontSize: '0.85rem', 
              padding: '8px 12px 8px 34px', 
              width: '100%',
              margin: 0
            }}
          />
          <span style={{ 
            position: 'absolute', 
            left: '10px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--text3)', 
            fontSize: '0.9rem',
            pointerEvents: 'none'
          }}>
            🔍
          </span>
        </div>

        {/* Status Filter */}
        <select
          className="field-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            fontSize: '0.85rem', 
            padding: '8px 12px !important', 
            width: '160px',
            margin: 0
          }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <LoadingSkeleton rows={5} height={50} /> : (
        <>
          <div className="card responsive-table-card" style={{ overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Customer</th><th>Barber</th><th className="hide-mobile">Salon</th><th className="hide-tablet">Date</th><th className="hide-tablet">Service</th><th>Price</th><th>Status</th><th>Change</th></tr></thead>
              <tbody>
                {bookings.map((b) => {
                  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                  const isTerminal = b.status === 'completed' || b.status === 'cancelled';
                  return (
                    <tr key={b._id}>
                      <td style={{ fontWeight: 600 }}>{b.userId?.name}</td>
                      <td style={{ color: 'var(--text2)' }}>{b.barberId?.name}</td>
                      <td className="hide-mobile" style={{ color: 'var(--text2)' }}>{b.salonId?.name}</td>
                      <td className="hide-tablet" style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>{new Date(b.date).toLocaleDateString()} {b.timeSlot}</td>
                      <td className="hide-tablet" style={{ color: 'var(--text2)' }}>{b.service}</td>
                      <td style={{ fontWeight: 600 }}>₹{b.price}</td>
                      <td><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                      <td>
                        <select
                          disabled={isTerminal}
                          value={b.status}
                          onChange={(e) => {
                            const nextStatus = e.target.value;
                            if (nextStatus === 'completed') {
                              setCompletingBooking(b);
                            } else {
                              updateStatus(b._id, nextStatus);
                            }
                          }}
                          style={{ 
                            fontSize: '0.78rem', 
                            padding: '4px 6px', 
                            background: 'var(--input-bg)', 
                            color: 'var(--text)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '4px', 
                            fontFamily: 'inherit',
                            opacity: isTerminal ? 0.6 : 1,
                            cursor: isTerminal ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {['pending','confirmed','completed','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} onPage={fetchBookings} />
        </>
      )}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  const fetchUsers = async (p = 1) => {
    setLoading(true);
    const { data } = await api.get('/admin/users', { params: { page: p, limit: 10 } });
    setUsers(data.users);
    setPages(data.pages);
    setPage(p);
    setLoading(false);
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleDeleteClick = (id, name) => {
    setConfirmDelete({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ isOpen: false, id: null, name: '' });
    await api.delete(`/admin/users/${id}`);
    fetchUsers(page);
  };

  const roleMap = { admin: 'badge-admin', barber: 'badge-barber', user: 'badge-user' };

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>All Users</h3>
      {loading ? <LoadingSkeleton rows={5} height={50} /> : (
        <>
          <div className="card responsive-table-card" style={{ overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th className="hide-mobile">Phone</th><th>Action</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{u.email}</td>
                    <td><span className={`badge ${roleMap[u.role] || 'badge-user'}`}>{u.role}</span></td>
                    <td className="hide-mobile" style={{ color: 'var(--text2)' }}>{u.phone || '—'}</td>
                    <td>{u.role !== 'admin' && <button style={deleteBtn} onClick={() => handleDeleteClick(u._id, u.name)}>Delete</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} onPage={fetchUsers} />
        </>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${confirmDelete.name}"? This action cannot be undone.`}
      />
    </div>
  );
}

// ── Feedback Tab ──────────────────────────────────────────
function FeedbackTabContent({ onStatusUpdated }) {
  const [feedback, setFeedback] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

  const fetchFeedback = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/feedback', {
        params: {
          page: p,
          limit: 10,
          type: typeFilter || undefined,
          status: statusFilter || undefined
        }
      });
      setFeedback(data.feedback);
      setPages(data.pages);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(1);
  }, [typeFilter, statusFilter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const oldItem = feedback.find(f => f._id === id);
      const { data } = await api.patch(`/admin/feedback/${id}/status`, { status: newStatus });
      setFeedback(feedback.map(f => f._id === id ? data : f));
      if (oldItem && oldItem.status === 'pending' && newStatus !== 'pending' && onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const id = confirmDelete.id;
    const itemToDelete = feedback.find(f => f._id === id);
    setConfirmDelete({ isOpen: false, id: null });
    try {
      await api.delete(`/admin/feedback/${id}`);
      fetchFeedback(page);
      if (itemToDelete && itemToDelete.status === 'pending' && onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      console.error('Failed to delete feedback', err);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const categoryMap = {
    bug: { label: 'Bug / Technical Issue', style: { backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)' } },
    suggestion: { label: 'Suggestion / Idea', style: { backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' } },
    other: { label: 'Other', style: { backgroundColor: 'rgba(107, 114, 128, 0.08)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.2)' } }
  };

  const statusColors = {
    pending: { color: '#d97706', label: 'Pending' },
    reviewed: { color: '#2563eb', label: 'Reviewed' },
    resolved: { color: '#059669', label: 'Resolved' }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Feedback Reports</h3>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <option value="">All Categories</option>
            <option value="bug">Bugs</option>
            <option value="suggestion">Suggestions</option>
            <option value="other">Other</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? <LoadingSkeleton rows={5} height={55} /> : (
        <>
          {feedback.length === 0 ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text2)' }}>
              💬 No feedback reports found matching the criteria.
            </div>
          ) : (
            <div className="card responsive-table-card" style={{ overflow: 'hidden' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th></th>
                    <th>User</th>
                    <th>Category</th>
                    <th className="hide-mobile">URL Path</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f) => {
                    const isExpanded = expandedId === f._id;
                    const cat = categoryMap[f.type] || { label: f.type, style: {} };
                    const relativeUrl = f.url ? new URL(f.url).pathname : '—';
                    
                    return (
                      <optgroup style={{ border: 'none' }} key={f._id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(f._id)}>
                          <td style={{ width: '30px', fontSize: '0.8rem', color: 'var(--text2)', textAlign: 'center' }}>
                            {isExpanded ? '▼' : '▶'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{f.userName || 'Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{f.userEmail || 'No Email'}</div>
                          </td>
                          <td>
                            <span 
                              style={{ 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                ...cat.style
                              }}
                            >
                              {cat.label}
                            </span>
                          </td>
                          <td className="hide-mobile" style={{ color: 'var(--text2)', fontSize: '0.82rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.url}>
                            {relativeUrl}
                          </td>
                          <td style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>
                            {new Date(f.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select
                              value={f.status}
                              onChange={(e) => handleStatusChange(f._id, e.target.value)}
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.8rem', 
                                fontWeight: 600, 
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                color: statusColors[f.status]?.color || 'inherit'
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button 
                              style={deleteBtn} 
                              onClick={() => handleDeleteClick(f._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: 'var(--bg)' }}>
                            <td colSpan={7} style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                <div>
                                  <h5 style={{ margin: '0 0 6px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.03em' }}>Description</h5>
                                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                    {f.description}
                                  </p>
                                </div>
                                
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                                  <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block' }}>Full URL</span>
                                    <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                      {f.url || '—'}
                                    </a>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block' }}>Screen Size</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{f.screenSize || '—'}</span>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block' }}>User Agent</span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text)' }} title={f.userAgent}>
                                      {f.userAgent || '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </optgroup>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {feedback.length > 0 && (
            <Pagination page={page} pages={pages} onPage={fetchFeedback} />
          )}
        </>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback report? This action cannot be undone."
      />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────
const TABS = [
  { id: 'Stats',    icon: '📊' },
  { id: 'Salons',   icon: '🏪' },
  { id: 'Barbers',  icon: '✂' },
  { id: 'Bookings', icon: '📋' },
  { id: 'Users',    icon: '👥' },
  { id: 'Feedback', icon: '💬' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'Stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

  const checkConnection = () => {
    setError(null);
    setLoading(true);
    api.get('/admin/stats')
      .then(({ data }) => {
        setPendingFeedbackCount(data.pendingFeedbackCount || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to connect to the server. Please check your internet connection.");
        setLoading(false);
      });
  };

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  if (loading) return (
    <div className="page-wrapper">
      <LoadingSkeleton rows={4} height={80} />
    </div>
  );

  return (
    <div className="page-wrapper">
      {error && (
        <div className="alert-error" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => checkConnection()} 
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            Retry
          </button>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Admin Dashboard</h2>
        <p style={{ color: 'var(--text2)', marginTop: '5px' }}>Manage your platform</p>
      </div>

      {!error && (
        <>
          <div className="tab-bar">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span style={{ marginRight: '5px' }}>{t.icon}</span>{t.id}
                {t.id === 'Feedback' && pendingFeedbackCount > 0 && (
                  <span style={{
                    marginLeft: '6px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}>
                    {pendingFeedbackCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'Stats'    && <StatsTab />}
          {activeTab === 'Salons'   && <SalonsTab />}
          {activeTab === 'Barbers'  && <BarbersTab />}
          {activeTab === 'Bookings' && <BookingsTab />}
          {activeTab === 'Users'    && <UsersTab />}
          {activeTab === 'Feedback' && <FeedbackTabContent onStatusUpdated={() => setPendingFeedbackCount(prev => Math.max(0, prev - 1))} />}
        </>
      )}
    </div>
  );
}

const statsGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
  gap: '12px', marginBottom: '20px',
};
const editBtn = {
  padding: '4px 12px', background: 'rgba(59,130,246,0.1)', color: '#2563eb',
  border: '1px solid rgba(59,130,246,0.25)', borderRadius: '5px', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', marginRight: '6px', transition: 'all 0.15s',
};
const deleteBtn = {
  padding: '4px 12px', background: 'rgba(239,68,68,0.08)', color: '#dc2626',
  border: '1px solid rgba(239,68,68,0.2)', borderRadius: '5px', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
};
