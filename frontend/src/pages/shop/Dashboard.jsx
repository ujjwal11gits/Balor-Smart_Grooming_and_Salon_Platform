import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { isShopActive, formatTime12, formatAddress } from '../../utils/status';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const STATUS_CONFIG = {
  pending:   { cls: 'badge-pending',   label: 'Pending' },
  confirmed: { cls: 'badge-confirmed', label: 'Confirmed' },
  completed: { cls: 'badge-completed', label: 'Completed' },
  cancelled: { cls: 'badge-cancelled', label: 'Cancelled' },
};

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Yes, Remove', cancelText = 'Cancel' }) {
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

// ── Overview Tab ───────────────────────────────────────────
function OverviewTab({ salon, setSalon, stats }) {
  const navigate = useNavigate();
  const { updateAuthName } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', ownerName: '', address: '', city: '', state: '', zipCode: '', description: '', imageUrl: '', phone: '', openingTime: '09:00', closingTime: '21:00' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setForm({
      name: salon.name,
      ownerName: salon.ownerId?.name || '',
      address: salon.address,
      city: salon.city || '',
      state: salon.state || '',
      zipCode: salon.zipCode || '',
      description: salon.description || '',
      imageUrl: salon.imageUrl || '',
      phone: salon.phone || '',
      openingTime: salon.openingTime || '09:00',
      closingTime: salon.closingTime || '21:00',
    });
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.put('/shop/my-salon', form);
      setSalon(data);
      if (form.ownerName) {
        updateAuthName(form.ownerName);
      }
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save salon details.');
    } finally {
      setSaving(false);
    }
  };

  const statCards = stats ? [
    { icon: '📋', label: 'Total Bookings', value: stats.totalBookings, color: '#e94560' },
    { icon: '📅', label: "Today's Bookings", value: stats.todayBookings, color: '#7c3aed' },
    { icon: '✂', label: 'Barbers', value: stats.totalBarbers, color: '#059669' },
    { icon: '💰', label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, color: '#d97706' },
  ] : [];

  const barData = stats ? {
    labels: stats.bookingsPerDay.map((d) => d._id),
    datasets: [{ label: 'Bookings', data: stats.bookingsPerDay.map((d) => d.count), backgroundColor: '#e94560', borderRadius: 6 }],
  } : null;

  const doughnutData = stats ? {
    labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    datasets: [{
      data: ['pending','confirmed','completed','cancelled'].map((s) => {
        const found = stats.statusCounts.find((c) => c._id === s);
        return found ? found.count : 0;
      }),
      backgroundColor: ['#d97706','#059669','#2563eb','#dc2626'],
      borderWidth: 0,
    }],
  } : null;

  const isActive = isShopActive(salon.openingTime, salon.closingTime);
  const statusLabel = isActive ? 'Active' : 'Inactive';
  const statusBadgeCls = isActive ? 'badge-confirmed' : 'badge-cancelled';

  return (
    <div>
      {/* Salon Info Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', position: 'relative' }}>
        {!editing ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Shop Profile</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text2)', marginTop: '2px' }}>Overview and operating configuration of your salon</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-ghost" onClick={() => navigate(`/salons/${salon._id}`)} style={{ fontSize: '0.83rem', padding: '6px 14px' }}>👁 View as Customer</button>
                <button className="btn-ghost" onClick={startEdit} style={{ fontSize: '0.83rem', padding: '6px 14px' }}>✏ Edit Profile</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={salonIconBoxLarge}>
                {salon.imageUrl
                  ? <img src={salon.imageUrl} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '18px' }} />
                  : <span style={{ fontSize: '2.5rem' }}>🏪</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: '16px' }}>
                  <div>
                    <span style={infoLabel}>Shop Name</span>
                    <div style={infoValue}>{salon.name}</div>
                  </div>
                  <div>
                    <span style={infoLabel}>Owner Name</span>
                    <div style={infoValue}>{salon.ownerId?.name || 'Not Available'}</div>
                  </div>
                  <div>
                    <span style={infoLabel}>Status</span>
                    <div>
                      <span className={`badge ${statusBadgeCls}`} style={{ marginTop: '4px', fontSize: '0.8rem', padding: '4px 12px' }}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text2)', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📞</span> <strong>{salon.phone || 'No phone number'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text2)', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📍</span> <strong>{formatAddress(salon)}</strong>
                  </div>
                </div>
 
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', maxWidth: '400px' }}>
                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.04)', border: '1.5px dashed rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius)' }}>
                    <span style={{ ...infoLabel, color: '#059669' }}>Opening Time</span>
                    <div style={{ ...infoValue, fontSize: '1.1rem', color: '#059669', fontWeight: 800 }}>{formatTime12(salon.openingTime || '09:00')}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.04)', border: '1.5px dashed rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)' }}>
                    <span style={{ ...infoLabel, color: '#dc2626' }}>Closing Time</span>
                    <div style={{ ...infoValue, fontSize: '1.1rem', color: '#dc2626', fontWeight: 800 }}>{formatTime12(salon.closingTime || '21:00')}</div>
                  </div>
                </div>
              </div>
            </div>
            {salon.description && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={infoLabel}>About Salon</span>
                <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginTop: '4px', lineHeight: 1.5 }}>{salon.description}</p>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: '0 0 8px', fontWeight: 700 }}>Edit Salon Info</h4>
            {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
            <div className="dashboard-form-grid">
              <div className="field-group" style={{ gridColumn: '1 / -1' }}><label className="field-label">Salon Name</label><input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="field-group" style={{ gridColumn: '1 / -1' }}><label className="field-label">Owner Name</label><input className="field-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required /></div>
              
              {/* Modern address inputs grouping */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 Address Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="field-group" style={{ margin: 0 }}>
                    <label className="field-label">Street Address</label>
                    <input className="field-input" placeholder="e.g. Flat/Room No, Building name, Street" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">City / Area</label>
                      <input className="field-input" placeholder="e.g. Siwan" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                    </div>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">State / Region</label>
                      <input className="field-input" placeholder="e.g. Bihar" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                    </div>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">PIN / ZIP Code</label>
                      <input className="field-input" placeholder="e.g. 841224" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="field-group" style={{ gridColumn: '1 / -1' }}><label className="field-label">Description</label><input className="field-input" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="field-group"><label className="field-label">Image URL</label><input className="field-input" placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
              <div className="field-group"><label className="field-label">Contact Phone</label><input className="field-input" placeholder="e.g. 7894561230" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field-group"><label className="field-label">Opening Time</label><input className="field-input" type="time" value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} required /></div>
              <div className="field-group"><label className="field-label">Closing Time</label><input className="field-input" type="time" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} required /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" type="submit" disabled={saving} style={{ fontSize: '0.88rem' }}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn-ghost" type="button" onClick={() => setEditing(false)} style={{ fontSize: '0.88rem' }}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Stat Cards */}
      {!stats ? <LoadingSkeleton rows={2} height={80} /> : (
        <>
          <div style={statsGrid}>
            {statCards.map((c) => (
              <div key={c.label} className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{c.icon}</div>
                  <span className="stat-label">{c.label}</span>
                </div>
                <div className="stat-value">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-charts-grid">
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem' }}>Bookings — Last 7 Days</h4>
              <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } } } }} />
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem' }}>Bookings by Status</h4>
              <Doughnut data={doughnutData} options={{ responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } } } }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Services Tab ───────────────────────────────────────────
function ServicesTab({ salon, setSalon }) {
  const [open, setOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [form, setForm] = useState({ name: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, idx: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const updatedServices = [...(salon.services || [])];
    const newService = { name: form.name, price: Number(form.price) };
    if (editingIdx !== null) {
      updatedServices[editingIdx] = newService;
    } else {
      updatedServices.push(newService);
    }
    const { data } = await api.put('/shop/my-salon', { services: updatedServices });
    setSalon(data);
    setForm({ name: '', price: '' });
    setEditingIdx(null);
    setOpen(false);
    setSaving(false);
  };

  const handleEdit = (idx) => {
    setEditingIdx(idx);
    setForm({ name: salon.services[idx].name, price: salon.services[idx].price });
    setOpen(true);
  };

  const handleDeleteClick = (idx) => {
    setConfirmDelete({ isOpen: true, idx });
  };

  const handleConfirmDelete = async () => {
    const idx = confirmDelete.idx;
    setConfirmDelete({ isOpen: false, idx: null });
    const updatedServices = salon.services.filter((_, i) => i !== idx);
    const { data } = await api.put('/shop/my-salon', { services: updatedServices });
    setSalon(data);
  };

  const services = salon.services || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Your Services ({services.length})</h3>
        {!open && <button className="btn-primary" onClick={() => setOpen(true)} style={{ fontSize: '0.85rem', padding: '7px 16px' }}>+ Add Service</button>}
      </div>

      {open && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem' }}>{editingIdx !== null ? 'Edit Service' : 'Add New Service'}</h4>
          <form onSubmit={handleSubmit} className="dashboard-form-grid">
            <div className="field-group"><label className="field-label">Service Name</label><input className="field-input" placeholder="e.g. Haircut" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="field-group"><label className="field-label">Price (₹)</label><input className="field-input" type="number" min="0" placeholder="e.g. 500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
            <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
              <button className="btn-primary" type="submit" disabled={saving} style={{ fontSize: '0.88rem' }}>{saving ? 'Saving...' : (editingIdx !== null ? 'Update' : 'Add Service')}</button>
              <button className="btn-ghost" type="button" onClick={() => { setOpen(false); setEditingIdx(null); setForm({ name: '', price: '' }); }} style={{ fontSize: '0.88rem' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {services.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💰</div>
          <p style={{ fontWeight: 600, marginBottom: '6px' }}>No services yet</p>
          <p style={{ fontSize: '0.88rem' }}>Add your first service to let customers book</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {services.map((s, idx) => (
            <div key={idx} className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{s.name}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--accent)', fontWeight: 800, fontSize: '1.1rem' }}>₹{s.price}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button style={editBtn} onClick={() => handleEdit(idx)}>Edit</button>
                <button style={deleteBtn} onClick={() => handleDeleteClick(idx)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, idx: null })}
        onConfirm={handleConfirmDelete}
        title="Remove Service"
        message={`Are you sure you want to remove the service "${services[confirmDelete.idx]?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}

// ── Barbers Tab ───────────────────────────────────────────
function BarbersTab() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', specializations: '', bio: '', imageUrl: '' });
  const [viewingProfile, setViewingProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [fetchingReviews, setFetchingReviews] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  const fetchBarbers = async () => {
    setLoading(true);
    const { data } = await api.get('/shop/my-salon');
    setBarbers(data.barbers);
    setLoading(false);
  };
  useEffect(() => { fetchBarbers(); }, []);

  const handleViewProfile = async (b) => {
    setViewingProfile(b);
    setFetchingReviews(true);
    try {
      const { data } = await api.get(`/reviews/barber/${b._id}`);
      setReviews(data);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setFetchingReviews(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (editing) { await api.put(`/shop/barbers/${editing}`, payload); setEditing(null); }
    else { await api.post('/shop/barbers', payload); }
    setForm({ name: '', specializations: '', bio: '', imageUrl: '' });
    setOpen(false);
    fetchBarbers();
  };

  const handleEdit = (b) => {
    setEditing(b._id);
    setForm({ name: b.name, specializations: (b.specializations || []).join(', '), bio: b.bio || '', imageUrl: b.imageUrl || '' });
    setOpen(true);
  };

  const handleDeleteClick = (id, name) => {
    setConfirmDelete({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ isOpen: false, id: null, name: '' });
    await api.delete(`/shop/barbers/${id}`);
    fetchBarbers();
  };

  const handleCancel = () => { setEditing(null); setForm({ name: '', specializations: '', bio: '', imageUrl: '' }); setOpen(false); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Your Barbers ({barbers.length})</h3>
        {!open && <button className="btn-primary" onClick={() => setOpen(true)} style={{ fontSize: '0.85rem', padding: '7px 16px' }}>+ Add Barber</button>}
      </div>

      {open && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.92rem' }}>{editing ? 'Edit Barber' : 'Add New Barber'}</h4>
          <form onSubmit={handleSubmit} className="dashboard-form-grid">
            <div className="field-group"><label className="field-label">Name</label><input className="field-input" placeholder="Barber's full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="field-group"><label className="field-label">Specializations</label><input className="field-input" placeholder="Fade, Beard Trim, Color" value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Bio</label><input className="field-input" placeholder="Short bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <div className="field-group"><label className="field-label">Photo URL</label><input className="field-input" placeholder="https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
              <button className="btn-primary" type="submit" style={{ fontSize: '0.88rem' }}>{editing ? 'Update' : 'Add Barber'}</button>
              <button className="btn-ghost" type="button" onClick={handleCancel} style={{ fontSize: '0.88rem' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={3} height={64} /> : (
        barbers.length === 0 ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text2)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✂</div>
            <p style={{ fontWeight: 600, marginBottom: '6px' }}>No barbers yet</p>
            <p style={{ fontSize: '0.88rem' }}>Add your first barber to get started</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {barbers.map((b) => (
              <div key={b._id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={barberAvatarBox}>
                    {b.imageUrl
                      ? <img src={b.imageUrl} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : <span style={{ fontSize: '1.4rem' }}>✂</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{b.name}</p>
                    <p style={{ margin: '2px 0 0', color: 'var(--text2)', fontSize: '0.78rem' }}>
                      ★ {b.rating?.toFixed(1)} · {b.totalReviews} reviews
                    </p>
                  </div>
                </div>
                {b.bio && <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.5 }}>{b.bio}</p>}
                {b.specializations?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    {b.specializations.map((s) => (
                      <span key={s} style={specBadge}>{s}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button style={profileBtn} onClick={() => handleViewProfile(b)}>View Profile</button>
                  <button style={editBtn} onClick={() => handleEdit(b)}>Edit</button>
                  <button style={deleteBtn} onClick={() => handleDeleteClick(b._id, b.name)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {viewingProfile && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-box" style={{ maxWidth: '640px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
            
            {/* Header / Top Info bar */}
            <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
              <button 
                onClick={() => setViewingProfile(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text3)' }}
              >✕</button>

              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2.5px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                {viewingProfile.imageUrl
                  ? <img src={viewingProfile.imageUrl} alt={viewingProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #e94560, #a0153e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', fontWeight: 700 }}>
                      {viewingProfile.name?.[0]?.toUpperCase()}
                    </div>
                }
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>{viewingProfile.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--gold)', fontSize: '0.95rem' }}>
                    {'★'.repeat(Math.round(viewingProfile.rating || 0))}{'☆'.repeat(5 - Math.round(viewingProfile.rating || 0))}
                  </span>
                  <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text2)' }}>
                    {(viewingProfile.rating || 0).toFixed(1)} ({viewingProfile.totalReviews || 0} reviews)
                  </span>
                </div>
                
                {viewingProfile.specializations?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {viewingProfile.specializations.map((s) => (
                      <span key={s} style={{ ...specBadge, margin: 0 }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div style={{ padding: '20px 24px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Bio Section */}
              {viewingProfile.bio && (
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)' }}>Bio / About</h4>
                  <p style={{ margin: 0, color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.6 }}>{viewingProfile.bio}</p>
                </div>
              )}

              {/* Reviews Section */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)' }}>Customer Reviews ({reviews.length})</h4>
                
                {fetchingReviews ? (
                  <LoadingSkeleton rows={2} height={60} />
                ) : reviews.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                    No reviews received yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {reviews.map((r) => (
                      <div key={r._id} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.userId?.name || 'Anonymous'}</span>
                          <span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        {r.comment && <p style={{ margin: '0 0 4px', color: 'var(--text2)', fontSize: '0.82rem', lineHeight: 1.4 }}>"{r.comment}"</p>}
                        <span style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--table-head)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-primary" 
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                onClick={() => {
                  const b = viewingProfile;
                  setViewingProfile(null);
                  handleEdit(b);
                }}
              >
                ✏ Edit Barber
              </button>
              <button 
                className="btn-ghost" 
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                onClick={() => setViewingProfile(null)}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={handleConfirmDelete}
        title="Remove Barber"
        message={`Are you sure you want to remove the barber "${confirmDelete.name}"? This action cannot be undone.`}
      />
    </div>
  );
}

// ── Bookings Tab ───────────────────────────────────────────
function ShopCancelModal({ booking, onClose, onSubmit }) {
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
        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Cancel Confirmed Booking</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Please specify a reason for cancelling the confirmed appointment for <b>{booking.userId?.name}</b>.
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

function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // { id, status }

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/shop/bookings', { params: { page: 1, limit: 50 } });
      setBookings(data.bookings || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id, status, cancelReason = undefined, otp = undefined) => {
    setActionLoading({ id, status });
    try {
      await api.patch(`/shop/bookings/${id}/status`, { status, cancelReason, otp });
      await fetchBookings();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed');
  const pastBookings = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled');

  return (
    <div>
      {cancellingBooking && (
        <ShopCancelModal
          booking={cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onSubmit={(id, reason) => updateStatus(id, 'cancelled', reason)}
        />
      )}
      {completingBooking && (
        <CompleteOtpModal
          booking={completingBooking}
          onClose={() => setCompletingBooking(null)}
          onSubmit={(id, otp) => updateStatus(id, 'completed', undefined, otp)}
        />
      )}
      {loading ? (
        <LoadingSkeleton rows={5} height={60} />
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
          <p style={{ fontWeight: 600, marginBottom: '6px' }}>No bookings yet</p>
          <p style={{ fontSize: '0.88rem' }}>Bookings will appear here once customers book your barbers</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* 1. Active & New Booking Requests Section */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                📥 Active Bookings & Requests ({activeBookings.length})
              </h3>
              {activeBookings.some(b => b.status === 'pending') && (
                <span className="badge badge-pending" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>Action Required</span>
              )}
            </div>

            {activeBookings.length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: '0.88rem', fontStyle: 'italic', margin: '10px 0' }}>
                No active or pending bookings.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Barber</th>
                      <th>Date & Time</th>
                      <th>Service</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBookings.map((b) => {
                      const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                      return (
                        <tr key={b._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.userId?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{b.userId?.phone}</div>
                          </td>
                          <td style={{ color: 'var(--text2)' }}>{b.barberId?.name}</td>
                          <td style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>
                            {new Date(b.date).toLocaleDateString()} {b.timeSlot}
                          </td>
                          <td style={{ color: 'var(--text2)' }}>{b.service}</td>
                          <td style={{ fontWeight: 600 }}>₹{b.price}</td>
                          <td>
                            <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {b.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => updateStatus(b._id, 'confirmed')}
                                    disabled={actionLoading !== null}
                                    style={{ padding: '5px 10px', background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading !== null ? 0.6 : 1 }}
                                  >
                                    {actionLoading?.id === b._id && actionLoading?.status === 'confirmed' ? 'Confirming...' : '✓ Confirm'}
                                  </button>
                                  <button
                                    onClick={() => updateStatus(b._id, 'cancelled')}
                                    disabled={actionLoading !== null}
                                    style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading !== null ? 0.6 : 1 }}
                                  >
                                    {actionLoading?.id === b._id && actionLoading?.status === 'cancelled' ? 'Cancelling...' : '✕ Cancel'}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setCompletingBooking(b)}
                                    disabled={actionLoading !== null}
                                    style={{ padding: '5px 10px', background: 'rgba(59,130,246,0.1)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading !== null ? 0.6 : 1 }}
                                  >
                                    {actionLoading?.id === b._id && actionLoading?.status === 'completed' ? 'Completing...' : '✓ Complete'}
                                  </button>
                                  <button
                                    onClick={() => setCancellingBooking(b)}
                                    disabled={actionLoading !== null}
                                    style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading !== null ? 0.6 : 1 }}
                                  >
                                    ✕ Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. Completed & Cancelled Bookings Section */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
              📋 Completed & Cancelled Bookings ({pastBookings.length})
            </h3>

            {pastBookings.length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: '0.88rem', fontStyle: 'italic', margin: '10px 0' }}>
                No completed or cancelled bookings yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Barber</th>
                      <th>Date & Time</th>
                      <th>Service</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastBookings.map((b) => {
                      const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                      return (
                        <tr key={b._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.userId?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{b.userId?.phone}</div>
                          </td>
                          <td style={{ color: 'var(--text2)' }}>{b.barberId?.name}</td>
                          <td style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>
                            {new Date(b.date).toLocaleDateString()} {b.timeSlot}
                          </td>
                          <td style={{ color: 'var(--text2)' }}>{b.service}</td>
                          <td style={{ fontWeight: 600 }}>₹{b.price}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                              {b.status === 'cancelled' && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
                                  by {b.cancelledBy || 'unknown'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {b.status === 'cancelled' ? (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text3)', maxWidth: '180px', wordBreak: 'break-word', display: 'block', fontStyle: 'italic' }}>
                                  {b.cancelReason ? `"${b.cancelReason}"` : 'No reason given'}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ──────────────────────────────────────────
function AnalyticsTab({ stats }) {
  if (!stats) return <LoadingSkeleton rows={4} height={70} />;

  const peakData = stats.peakHours ? {
    labels: stats.peakHours.map((h) => h._id),
    datasets: [{
      label: 'Bookings',
      data: stats.peakHours.map((h) => h.count),
      backgroundColor: '#7c3aed',
      borderRadius: 6
    }],
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Row */}
      <div style={statsGrid}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(233,69,96,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏆</div>
            <span className="stat-label">Top Performing Barber</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>
            {stats.leaderboard?.[0]?.name || 'No data'}
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🔥</div>
            <span className="stat-label">Peak Time Slot</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.2rem', color: '#7c3aed' }}>
            {stats.peakHours?.[0]?._id || 'No data'}
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(5,150,105,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🔄</div>
            <span className="stat-label">Barber Retention</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.2rem', color: '#059669' }}>
            {stats.leaderboard?.length > 0 
              ? Math.round(stats.leaderboard.reduce((acc, curr) => acc + curr.retentionRate, 0) / stats.leaderboard.length) 
              : 0}%
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-charts-grid">
        {/* Leaderboard card */}
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.95rem' }}>💈 Barber Performance Leaderboard</h4>
          {(!stats.leaderboard || stats.leaderboard.length === 0) ? (
            <p style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: '0.88rem' }}>No booking revenue data recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.leaderboard.map((b, index) => (
                <div key={b.barberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text2)', fontSize: '0.95rem', minWidth: '20px' }}>#{index + 1}</span>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1.5px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border)' }}>
                      {b.imageUrl
                        ? <img src={b.imageUrl} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '1rem' }}>✂</span>
                      }
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', display: 'block' }}>{b.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>★ {b.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1rem', display: 'block' }}>₹{b.revenue.toLocaleString()}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>
                      {b.completedCount} cuts · <strong style={{ color: '#059669' }}>{b.retentionRate}% repeat</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak Hours card */}
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.95rem' }}>⏰ Peak Appointment Hours</h4>
          {(!stats.peakHours || stats.peakHours.length === 0) ? (
            <p style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: '0.88rem' }}>No appointment data recorded yet.</p>
          ) : (
            <Bar
              data={peakData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } }
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Shop Dashboard ────────────────────────────────────
const TABS = [
  { id: 'Overview',  icon: '🏪' },
  { id: 'Services',  icon: '💰' },
  { id: 'Barbers',   icon: '✂' },
  { id: 'Bookings',  icon: '📋' },
  { id: 'Analytics', icon: '📈' },
];

export default function ShopDashboard() {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('shopActiveTab') || 'Overview');
  const [salon, setSalon] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('shopActiveTab', activeTab);
  }, [activeTab]);

  const fetchShopData = () => {
    setError('');
    Promise.all([
      api.get('/shop/my-salon'),
      api.get('/shop/stats')
    ])
      .then(([{ data: salonData }, { data: statsData }]) => {
        setSalon(salonData.salon);
        setStats(statsData);
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to connect to the server. Please check your internet connection.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchShopData();
  }, []);

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
            onClick={() => { setError(''); setLoading(true); fetchShopData(); }} 
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            Shop Dashboard
          </h2>
          <p style={{ color: 'var(--text2)', marginTop: '5px', fontSize: '0.92rem' }}>
            Welcome back, <strong>{auth?.name}</strong>{salon ? <> · Managing <span style={{ color: 'var(--accent)' }}>{salon.name}</span></> : ''}
          </p>
        </div>
      </div>

      {salon && stats ? (
        <>
          {/* Tabs */}
          <div className="tab-bar">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span style={{ marginRight: '5px' }}>{t.icon}</span>{t.id}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && <OverviewTab salon={salon} setSalon={setSalon} stats={stats} />}
          {activeTab === 'Services' && <ServicesTab salon={salon} setSalon={setSalon} />}
          {activeTab === 'Barbers'  && <BarbersTab />}
          {activeTab === 'Bookings' && <BookingsTab />}
          {activeTab === 'Analytics' && <AnalyticsTab stats={stats} />}
        </>
      ) : (
        !error && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text2)' }}>No salon profile associated with this account.</div>
      )}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const statsGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '12px', marginBottom: '20px',
};
const salonIconBox = {
  width: '64px', height: '64px', borderRadius: '14px',
  background: 'rgba(233,69,96,0.08)', border: '1.5px solid rgba(233,69,96,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, overflow: 'hidden',
};
const barberAvatarBox = {
  width: '52px', height: '52px', borderRadius: '50%',
  background: 'rgba(233,69,96,0.08)', border: '1.5px solid rgba(233,69,96,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, overflow: 'hidden',
};
const specBadge = {
  padding: '4px 10px', borderRadius: '6px',
  background: 'var(--bg)', color: 'var(--text2)',
  fontSize: '0.74rem', fontWeight: 600, border: '1.5px solid var(--border)',
};
const profileBtn = {
  padding: '4px 12px', background: 'rgba(233,69,96,0.08)', color: 'var(--accent)',
  border: '1px solid rgba(233,69,96,0.2)', borderRadius: '5px', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
};
const editBtn = {
  padding: '4px 12px', background: 'rgba(59,130,246,0.1)', color: '#2563eb',
  border: '1px solid rgba(59,130,246,0.25)', borderRadius: '5px', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
};
const deleteBtn = {
  padding: '4px 12px', background: 'rgba(239,68,68,0.08)', color: '#dc2626',
  border: '1px solid rgba(239,68,68,0.2)', borderRadius: '5px', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
};
const salonIconBoxLarge = {
  width: '96px', height: '96px', borderRadius: '18px',
  background: 'rgba(233,69,96,0.08)', border: '1.5px solid rgba(233,69,96,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, overflow: 'hidden',
};
const infoLabel = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px'
};
const infoValue = {
  fontSize: '0.98rem', fontWeight: 700, color: 'var(--text)'
};
