import { useEffect, useState } from 'react';
import api from '../../api/axios';

const ALL_SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

export default function Availability() {
  const [workingSlots, setWorkingSlots] = useState([]);
  const [unavailableInput, setUnavailableInput] = useState('');
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [barber, setBarber] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/users/me').then(async ({ data: user }) => {
      const allSalons = await api.get('/salons');
      for (const s of allSalons.data) {
        const { data } = await api.get(`/salons/${s._id}`);
        const found = data.barbers.find((b) => String(b.userId) === String(user._id));
        if (found) {
          setBarber(found);
          setWorkingSlots(found.workingSlots || ALL_SLOTS);
          setUnavailableDates((found.unavailableDates || []).map((d) => d.split('T')[0]));
          break;
        }
      }
    });
  }, []);

  const toggleSlot = (slot) => {
    setWorkingSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot].sort()
    );
  };

  const addUnavailable = () => {
    if (unavailableInput && !unavailableDates.includes(unavailableInput)) {
      setUnavailableDates((d) => [...d, unavailableInput].sort());
      setUnavailableInput('');
    }
  };

  const removeUnavailable = (date) => setUnavailableDates((d) => d.filter((x) => x !== date));

  const save = async () => {
    await api.put('/barbers/working-slots', {
      workingSlots,
      unavailableDates: unavailableDates.map((d) => new Date(d).toISOString()),
    });
    setSuccess('Availability saved!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (!barber) return (
    <div className="page-wrapper" style={{ maxWidth: '600px' }}>
      <div style={{ padding: '40px', textAlign: 'center', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
        <p style={{ color: 'var(--text2)', fontSize: '0.92rem' }}>Loading barber profile… Make sure your account is linked to a barber profile by the admin.</p>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper" style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Manage Availability</h2>
        <p style={{ color: 'var(--text2)', marginTop: '5px' }}>Set your working hours and time off</p>
      </div>

      {success && <div className="alert-success" style={{ marginBottom: '20px' }}>{success}</div>}

      {/* Working slots */}
      <div className="card" style={{ padding: '22px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '0.97rem', fontWeight: 700 }}>Working Time Slots</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.86rem', marginBottom: '16px' }}>Toggle the hours you're available for bookings.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => toggleSlot(slot)}
              className={`slot-btn${workingSlots.includes(slot) ? ' selected' : ''}`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Unavailable dates */}
      <div className="card" style={{ padding: '22px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '0.97rem', fontWeight: 700 }}>Unavailable Dates</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.86rem', marginBottom: '16px' }}>Mark holidays or personal days off.</p>

        <div className="add-date-row" style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            type="date"
            value={unavailableInput}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setUnavailableInput(e.target.value)}
            className="field-input"
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={addUnavailable} style={{ padding: '10px 18px', flexShrink: 0 }}>
            Add Date
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {unavailableDates.map((d) => (
            <span key={d} style={{
              background: 'rgba(239,68,68,0.08)', color: '#dc2626',
              border: '1px solid rgba(239,68,68,0.2)',
              padding: '5px 12px', borderRadius: '20px', fontSize: '0.83rem',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}>
              📅 {d}
              <button
                onClick={() => removeUnavailable(d)}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0', fontSize: '1rem', lineHeight: 1, fontWeight: 700 }}
              >×</button>
            </span>
          ))}
          {unavailableDates.length === 0 && (
            <span style={{ color: 'var(--text3)', fontSize: '0.86rem' }}>No unavailable dates set</span>
          )}
        </div>
      </div>

      <button className="btn-primary" onClick={save} style={{ padding: '12px 32px', fontSize: '0.95rem' }}>
        Save Availability
      </button>
      <style>{`
        @media (max-width: 400px) {
          .add-date-row {
            flex-direction: column !important;
            width: 100% !important;
          }
          .add-date-row input, .add-date-row button {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
