import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { isShopActive, formatTime12 } from '../../utils/status';

const SERVICE_ICONS = {
  'Haircut': '✂', 'Beard Trim': '🪒', 'Hair Color': '🎨',
  'Hot Towel Shave': '🔥', 'Keratin Treatment': '💆', 'Fade Cut': '💈',
  'default': '✨'
};

export default function BookingForm() {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const [barber, setBarber] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [form, setForm] = useState({ date: '', timeSlot: '', services: [], notes: '', phone: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    api.get(`/barbers/${barberId}`).then(({ data }) => setBarber(data));
  }, [barberId]);

  const selectedServices = barber?.salonId?.services?.filter((service) => form.services.includes(service.name)) || [];
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + Number(service.duration || 30), 0) || 30;

  useEffect(() => {
    let active = true;
    const fetchSlots = async () => {
      if (!form.date) return;
      setSlotsLoading(true);
      setAvailableSlots([]);
      try {
        const { data } = await api.get(`/barbers/${barberId}/available-slots`, { 
          params: { date: form.date, duration: totalDuration } 
        });
        if (!active) return;
        setUnavailable(data.unavailable || false);
        const slots = data.slots || [];
        setAvailableSlots(slots);
        
        // Preserve selected timeSlot if it remains in the updated available slots
        setForm((f) => {
          if (f.timeSlot && slots.includes(f.timeSlot)) {
            return f;
          }
          return { ...f, timeSlot: '' };
        });
      } catch {
        if (!active) return;
        setForm((f) => ({ ...f, timeSlot: '' }));
      }
      if (active) {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
    return () => {
      active = false;
    };
  }, [form.date, totalDuration, barberId]);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setForm((f) => ({ ...f, date, timeSlot: '' }));
  };

  const handleWaitlist = async () => {
    setError('');
    setWaitlistLoading(true);
    try {
      await api.post('/waitlist', { barberId, date: form.date });
      setSuccess('You have been added to the waitlist! We will notify you if a slot opens up.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join waitlist');
    }
    setWaitlistLoading(false);
  };

  const toggleService = (serviceName) => {
    setForm((current) => {
      const services = current.services.includes(serviceName)
        ? current.services.filter((name) => name !== serviceName)
        : [...current.services, serviceName];
      return { ...current, services };
    });
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
        barberId,
        salonId: barber.salonId._id,
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

  const isActive = barber?.salonId ? isShopActive(barber.salonId.openingTime, barber.salonId.closingTime) : true;

  if (!barber) return <div className="page-wrapper"><LoadingSkeleton rows={5} height={50} /></div>;

  return (
    <div className="page-wrapper" style={{ maxWidth: '560px' }}>
      <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>

      {/* Barber info card */}
      <div className="card" style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '18px 20px', marginBottom: '24px' }}>
        <img
          src={barber.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=1a1a2e&color=e94560&size=60`}
          alt={barber.name}
          style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)' }}
        />
        <div>
          <h2 style={{ margin: '0 0 3px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Book with {barber.name}</h2>
          <p style={{ margin: 0, color: 'var(--text2)', fontSize: '0.85rem' }}>
            📍 {barber.salonId?.name} — {barber.salonId?.address}
          </p>
        </div>
      </div>

      {success ? (
        <div style={successBox}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text)' }}>Booking Submitted!</h3>
          <p style={{ color: 'var(--text2)', margin: '0 0 20px', fontSize: '0.92rem' }}>The barber will review your request shortly.</p>
          <button className="btn-primary" onClick={() => navigate('/my-bookings')}>View My Bookings</button>
        </div>
      ) : (
        <div className="card" style={{ padding: '24px' }}>
          {!isActive && (
            <div className="alert-error" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem' }}>Shop is Currently Closed!</strong>
                <div style={{ fontSize: '0.8rem', marginTop: '2px', opacity: 0.9 }}>
                  Operating hours: {formatTime12(barber.salonId?.openingTime || '09:00')} - {formatTime12(barber.salonId?.closingTime || '21:00')}. Bookings are disabled during off-hours.
                </div>
              </div>
            </div>
          )}
          {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Date */}
            <div className="field-group">
              <label className="field-label">Date</label>
              <input
                className="field-input"
                type="date"
                value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={handleDateChange}
                required
                disabled={!isActive}
                style={!isActive ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
            </div>

            {unavailable && (
              <div className="alert-error">Barber is unavailable on this date. Please choose another.</div>
            )}

            {/* Time slots */}
            {form.date && !unavailable && (
              <div className="field-group">
                <label className="field-label" style={{ marginBottom: '8px' }}>Select Time Slot</label>
                {slotsLoading ? (
                  <p style={{ color: 'var(--text2)', fontSize: '0.88rem' }}>Loading slots…</p>
                ) : (() => {
                  const allHourlySlots = [
                    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
                    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
                    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
                  ];

                  const workingSlots = barber.workingSlots && barber.workingSlots.length > 0
                    ? barber.workingSlots
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
                    if (!barber || !barber.salonId) return true;
                    const { openingTime, closingTime } = barber.salonId;
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

                  const getSlotStyle = (state) => {
                    const base = {
                      padding: '10px 8px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'center',
                      border: '1.5px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    };
                    switch (state) {
                      case 'selected':
                        return { 
                          ...base, 
                          background: 'var(--accent)', 
                          color: '#fff', 
                          borderColor: 'var(--accent)', 
                          boxShadow: '0 4px 12px rgba(233, 69, 96, 0.35)' 
                        };
                      case 'fast-filling':
                        return { 
                          ...base, 
                          background: 'rgba(217, 119, 6, 0.06)', 
                          color: '#d97706', 
                          borderColor: 'rgba(217, 119, 6, 0.25)' 
                        };
                      case 'booked':
                        return { 
                          ...base, 
                          background: 'rgba(0, 0, 0, 0.01)', 
                          color: 'var(--text3)', 
                          borderColor: 'var(--border)', 
                          textDecoration: 'line-through', 
                          opacity: 0.65, 
                          cursor: 'not-allowed', 
                          pointerEvents: 'none' 
                        };
                      case 'closed':
                        return { 
                          ...base, 
                          background: 'rgba(0, 0, 0, 0.02)', 
                          color: 'var(--text3)', 
                          borderColor: 'var(--border)', 
                          borderStyle: 'dashed',
                          opacity: 0.45, 
                          cursor: 'not-allowed', 
                          pointerEvents: 'none' 
                        };
                      case 'available':
                      default:
                        return { 
                          ...base, 
                          background: 'rgba(5, 150, 105, 0.06)', 
                          color: '#059669', 
                          borderColor: 'rgba(5, 150, 105, 0.25)' 
                        };
                    }
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

                  const CATEGORIES = [
                    { id: 'morning', label: 'Morning', emoji: '🌅' },
                    { id: 'afternoon', label: 'Afternoon', emoji: '☀️' },
                    { id: 'evening', label: 'Evening', emoji: '🌆' }
                  ];

                  const hasAvailable = sortedSlots.some((slot) => {
                    const state = getSlotState(slot);
                    return state === 'available' || state === 'fast-filling';
                  });

                  return (
                    <div>
                      {/* Legend */}
                      <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', fontSize: '0.78rem', color: 'var(--text2)', fontWeight: 600, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></span> Available</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }}></span> Fast Filling</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text3)', opacity: 0.5 }}></span> Booked</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px dashed var(--text3)', opacity: 0.3 }}></span> Closed / Off-hours</div>
                      </div>

                      {/* Grids */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {CATEGORIES.map((cat) => {
                          const slots = groupedSlots[cat.id];
                          if (slots.length === 0) return null;
                          return (
                            <div key={cat.id} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: '8px' }}>
                                {cat.emoji} {cat.label}
                              </span>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '8px' }}>
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
                      </div>

                      {!hasAvailable && (
                        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                          <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 10px', fontWeight: 500 }}>All slots on this date are fully booked or closed.</p>
                          <button type="button" className="btn-ghost" onClick={handleWaitlist} disabled={waitlistLoading} style={{ fontSize: '0.85rem', color: '#dc2626', borderColor: 'rgba(239,68,68,0.2)', padding: '6px 12px' }}>
                            {waitlistLoading ? 'Joining...' : 'Join Waitlist for this date'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Service */}
            <div className="field-group">
              <label className="field-label">Service</label>
              {barber.salonId?.services && barber.salonId.services.length > 0 ? (
                <>
                  <p style={{ color: 'var(--text2)', fontSize: '0.83rem', margin: '0 0 10px' }}>Select one or more services.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {barber.salonId.services.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      disabled={!isActive}
                      onClick={() => toggleService(s.name)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                        padding: '12px',
                        border: `1.5px solid ${form.services.includes(s.name) ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        cursor: isActive ? 'pointer' : 'not-allowed',
                        background: form.services.includes(s.name) ? 'rgba(233,69,96,0.07)' : 'var(--card)',
                        color: form.services.includes(s.name) ? 'var(--accent)' : 'var(--text)',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        opacity: isActive ? 1 : 0.6
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: form.services.includes(s.name) ? 700 : 500 }}>
                        <span>{SERVICE_ICONS[s.name] || SERVICE_ICONS.default}</span>
                        <span>{s.name}</span>
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: form.services.includes(s.name) ? 'var(--accent)' : 'var(--text)' }}>
                        ₹{s.price}
                      </div>
                    </button>
                  ))}
                  </div>

                  {/* Smart Add-ons and Up-selling */}
                  {(() => {
                    const recommended = barber.salonId.services.filter((s) => !form.services.includes(s.name));
                    if (form.services.length === 0 || recommended.length === 0) return null;
                    return (
                      <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(233,69,96,0.02)', border: '1.5px dashed rgba(233,69,96,0.15)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                          ✨ Recommended Add-ons
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {recommended.slice(0, 3).map((s) => (
                            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.2rem' }}>{SERVICE_ICONS[s.name] || SERVICE_ICONS.default}</span>
                                <div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{s.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text2)', display: 'block' }}>+{s.duration || 30} mins</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>₹{s.price}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleService(s.name)}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'rgba(233,69,96,0.08)',
                                    color: 'var(--accent)',
                                    border: '1px solid rgba(233,69,96,0.2)',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
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
                </>
              ) : (
                <p style={{ color: 'var(--text2)', fontSize: '0.88rem' }}>No services configured by this shop.</p>
              )}
            </div>

            {/* Price & Phone */}
            <div className="booking-form-grid">
              <div className="field-group">
                <label className="field-label">Price (₹)</label>
                <input className="field-input" type="number" placeholder="Select a service" value={totalPrice || ''} readOnly required style={{ background: 'var(--bg2)', cursor: 'not-allowed', color: 'var(--text)', fontWeight: 600 }} />
              </div>
              <div className="field-group">
                <label className="field-label">Phone</label>
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
                  style={!isActive ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="field-group">
              <label className="field-label">Notes (optional)</label>
              <textarea
                className="field-input"
                placeholder="Any special requests or preferences…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                disabled={!isActive}
                style={!isActive ? { height: '80px', resize: 'vertical', opacity: 0.6, cursor: 'not-allowed' } : { height: '80px', resize: 'vertical' }}
              />
            </div>

            <button
              className={isActive ? "btn-primary" : ""}
              type="submit"
              disabled={bookingLoading || !form.timeSlot || form.services.length === 0 || unavailable || !isActive}
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '0.95rem',
                marginTop: '4px',
                backgroundColor: isActive ? 'var(--accent)' : 'var(--border)',
                color: isActive ? '#fff' : 'var(--text3)',
                cursor: isActive ? 'pointer' : 'not-allowed',
                border: 'none',
                opacity: isActive ? 1 : 0.7
              }}
            >
              {bookingLoading ? 'Submitting booking...' : isActive ? 'Confirm Booking' : 'Shop Closed'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const backBtn = {
  background: 'none', border: 'none', color: 'var(--accent)',
  cursor: 'pointer', fontSize: '0.9rem', marginBottom: '20px',
  padding: '6px 0', fontFamily: 'inherit', fontWeight: 500,
};
const successBox = {
  textAlign: 'center', padding: '48px 24px',
  background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)',
};
