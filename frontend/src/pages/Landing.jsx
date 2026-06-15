import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=80',
    tag: 'Premium Experience',
    headline: 'Your Perfect\nHaircut Awaits',
    sub: 'Discover top-rated barbershops near you and book your slot in seconds.',
  },
  {
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=80',
    tag: 'Expert Barbers',
    headline: 'We Are Looking\nTo Make You Handsome',
    sub: 'Our verified barbers bring years of expertise to every cut, fade, and shave.',
  },
  {
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1600&q=80',
    tag: 'Instant Booking',
    headline: 'Book in 30\nSeconds Flat',
    sub: 'Choose your barber, pick a slot, confirm — no calls, no waiting.',
  },
  {
    image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1600&q=80',
    tag: 'Own a Salon?',
    headline: 'Grow Your Shop\nWith Balor',
    sub: 'Register as a Shop Owner, manage barbers, and track bookings — all in one place.',
  },
];

const FEATURES = [
  { icon: '🔍', title: 'Discover Salons', desc: 'Browse curated barbershops by location, rating, and specialization.' },
  { icon: '📅', title: 'Instant Booking', desc: 'Real-time slot availability. Book, reschedule, or cancel with one tap.' },
  { icon: '✂', title: 'Pick Your Barber', desc: 'View profiles, specializations, and ratings before you commit.' },
  { icon: '💬', title: 'Reviews & Ratings', desc: 'Honest reviews from real customers to help you choose the best.' },
  { icon: '🏪', title: 'Shop Dashboard', desc: 'Salon owners get a full management dashboard — barbers, bookings, stats.' },
  { icon: '🔔', title: 'Live Notifications', desc: 'Get notified when your booking is confirmed, updated, or cancelled.' },
];

const STATS = [
  { value: '500+', label: 'Partner Salons' },
  { value: '2,000+', label: 'Expert Barbers' },
  { value: '50,000+', label: 'Happy Customers' },
  { value: '4.8★', label: 'Average Rating' },
];

const TESTIMONIALS = [
  { name: 'Rahul Verma', role: 'Regular Customer', avatar: 'https://randomuser.me/api/portraits/men/11.jpg', text: 'Balor completely changed how I book my haircuts. Takes 30 seconds, and I always get my favourite barber.' },
  { name: 'Priya Mehta', role: 'Salon Owner', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', text: 'Managing my shop is so much easier now. I can see all bookings, add barbers, and track revenue in one place.' },
  { name: 'Arjun Das', role: 'Regular Customer', avatar: 'https://randomuser.me/api/portraits/men/36.jpg', text: 'Found an amazing barbershop near my office. The booking experience is smooth and the app looks great.' },
];

export default function LandingPage() {
  const { auth } = useAuth();
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);

  const [footerRating, setFooterRating] = useState(0);
  const [footerHoverRating, setFooterHoverRating] = useState(0);
  const [footerRated, setFooterRated] = useState(false);

  const handleFooterRateSubmit = (e) => {
    e.preventDefault();
    if (footerRating > 0) {
      setFooterRated(true);
    }
  };

  const goTo = (idx) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setSlide(idx);
      setAnimating(false);
    }, 400);
  };

  const next = () => goTo((slide + 1) % SLIDES.length);
  const prev = () => goTo((slide - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [slide]);

  const resetTimer = (fn) => { clearInterval(timerRef.current); fn(); };

  return (
    <div style={{ fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* ── Hero Slider ──────────────────────────────────────── */}
      <section style={heroSection}>
        {/* Slide background */}
        <div
          key={slide}
          style={{
            ...heroBg,
            backgroundImage: `url(${SLIDES[slide].image})`,
            opacity: animating ? 0 : 1,
            transform: animating ? 'scale(1.04)' : 'scale(1)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        />
        <div style={heroOverlay} />

        {/* Content */}
        <div style={{ ...heroContent, opacity: animating ? 0 : 1, transform: animating ? 'translateY(20px)' : 'translateY(0)', transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s' }}>
          <span style={slideTag}>{SLIDES[slide].tag}</span>
          <h1 style={heroTitle}>
            {SLIDES[slide].headline.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
          <p style={heroSub}>{SLIDES[slide].sub}</p>
          <div style={heroCTA}>
            {auth ? (
              auth.role === 'user' ? (
                <Link to="/salons" style={btnPrimary} id="hero-book-now">🔍 Find a Barber Near You</Link>
              ) : (
                <Link to={auth.role === 'shop' ? '/shop/dashboard' : '/admin/dashboard'} style={btnPrimary} id="hero-dashboard">Go to Dashboard</Link>
              )
            ) : (
              <>
                <Link to="/register" style={btnPrimary} id="hero-get-started">Get Started Free</Link>
                <Link to="/login" style={btnGhost} id="hero-login">Sign In</Link>
              </>
            )}
          </div>
        </div>

        {/* Arrows */}
        <button style={{ ...arrowBtn, left: '24px' }} onClick={() => resetTimer(prev)} aria-label="Previous">‹</button>
        <button style={{ ...arrowBtn, right: '24px' }} onClick={() => resetTimer(next)} aria-label="Next">›</button>

        {/* Dots */}
        <div style={dotsBar}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => resetTimer(() => goTo(i))} style={{ ...dot, ...(i === slide ? dotActive : {}) }} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <section style={statsBar}>
        <div style={statsInner}>
          {STATS.map((s) => (
            <div key={s.label} style={statItem}>
              <div style={statValue}>{s.value}</div>
              <div style={statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section style={section}>
        <div style={container}>
          <div style={sectionHeader}>
            <span style={sectionTag}>Why Balor?</span>
            <h2 style={sectionTitle}>Everything You Need, Nothing You Don't</h2>
            <p style={sectionSub}>A seamless experience for customers and shop owners alike.</p>
          </div>
          <div style={featuresGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} style={featureCard} className="feature-card">
                <div style={featureIcon}>{f.icon}</div>
                <h3 style={featureTitle}>{f.title}</h3>
                <p style={featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section style={{ ...section, background: 'linear-gradient(180deg, var(--bg) 0%, var(--card) 100%)' }}>
        <div style={container}>
          <div style={sectionHeader}>
            <span style={sectionTag}>Simple & Fast</span>
            <h2 style={sectionTitle}>Book in 3 Easy Steps</h2>
          </div>
          <div style={stepsGrid}>
            {[
              { n: '01', title: 'Find a Salon', desc: 'Search by location or browse top-rated barbershops near you.' },
              { n: '02', title: 'Pick a Barber', desc: 'View profiles, specializations, and real customer reviews.' },
              { n: '03', title: 'Book & Go', desc: 'Choose a time slot, confirm your booking, and show up fresh.' },
            ].map((step) => (
              <div key={step.n} style={stepCard}>
                <div style={stepNum}>{step.n}</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: '16px 0 8px', color: 'var(--text)' }}>{step.title}</h3>
                <p style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Philosophy & Mission ─────────────────────────────── */}
      <section style={{ ...section, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={container}>
          
          {/* Built by Professionals */}
          <div style={sectionHeader}>
            <span style={sectionTag}>Our Standards</span>
            <h2 style={{ ...sectionTitle, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 800 }}>Built by Professionals, For Professionals</h2>
            <p style={{ ...sectionSub, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              Our platform combines technology and deep grooming industry expertise to create the most intuitive booking experience.
            </p>
          </div>

          <div style={professionalGrid}>
            {[
              { icon: '⚡', title: 'Innovation First', desc: 'Constantly evolving our booking features to meet modern market needs.' },
              { icon: '🤝', title: 'Customer Centric', desc: 'Every platform decision starts with user and salon feedback.' },
              { icon: '🛡️', title: 'Quality Assured', desc: 'We verify barbers and salons to guarantee a premium experience at every touchpoint.' },
            ].map((p) => (
              <div key={p.title} style={professionalCard} className="prof-card">
                <div style={professionalIconCircle}>{p.icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.12rem', margin: '0 0 10px', color: 'var(--text)' }}>{p.title}</h3>
                <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Our Mission */}
          <div style={{ ...sectionHeader, marginTop: '80px', marginBottom: '48px' }}>
            <span style={sectionTag}>Our Vision</span>
            <h2 style={{ ...sectionTitle, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 800 }}>Our Mission</h2>
            <p style={{ ...sectionSub, maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
              Democratizing access to premium grooming. We empower barbers to focus on their craft while giving customers the confidence to find their perfect match.
            </p>
          </div>

          <div style={missionGrid}>
            <div style={missionCard} className="mission-card">
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '16px' }}>💈</span>
              <h3 style={{ fontWeight: 800, fontSize: '1.25rem', margin: '0 0 12px', color: 'var(--text)' }}>For Barbers</h3>
              <p style={{ color: 'var(--text2)', fontSize: '0.92rem', lineHeight: 1.75, margin: 0 }}>
                A dedicated platform to showcase your craft, manage bookings efficiently, handle staff shifts, and build a loyal customer base.
              </p>
            </div>
            <div style={missionCard} className="mission-card">
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '16px' }}>👤</span>
              <h3 style={{ fontWeight: 800, fontSize: '1.25rem', margin: '0 0 12px', color: 'var(--text)' }}>For Customers</h3>
              <p style={{ color: 'var(--text2)', fontSize: '0.92rem', lineHeight: 1.75, margin: 0 }}>
                Discover verified barbers, check real-time availability, select smart add-ons, and book with confidence in under 30 seconds.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section style={section}>
        <div style={container}>
          <div style={sectionHeader}>
            <span style={sectionTag}>Real Reviews</span>
            <h2 style={sectionTitle}>What Our Users Say</h2>
          </div>
          <div style={testimonialsGrid}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={testimonialCard}>
                <p style={testimonialText}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                  <img src={t.avatar} alt={t.name} style={avatarImg} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.name}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.78rem', marginTop: '2px' }}>{t.role}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: '0.9rem', fontWeight: 700 }}>★★★★★</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dynamic CTA Section ─────────────────────────────────── */}
      <section style={shopCTASection}>
        <div style={shopCTAOverlay} />
        {auth && auth.role === 'user' ? (
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '640px', margin: '0 auto', padding: '0 24px' }}>
            <span style={{ ...sectionTag, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>Premium Grooming</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', margin: '16px 0 14px', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
              Ready for a Fresh Look?<br />Book Your Barber Today
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '32px' }}>
              Browse top-rated local shops, compare service prices, and secure your perfect time slot instantly.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/salons" style={{ ...btnPrimary, background: '#fff', color: '#e94560' }} id="customer-explore-cta">🔍 Find Salons & Barbers</Link>
              <Link to="/my-bookings" style={{ ...btnGhost, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} id="customer-bookings-cta">View My Bookings</Link>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '640px', margin: '0 auto', padding: '0 24px' }}>
            <span style={{ ...sectionTag, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>For Business Owners</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', margin: '16px 0 14px', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
              Own a Barbershop?<br />Join Balor Today
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '32px' }}>
              Get a powerful dashboard to manage barbers, track bookings, and grow your business — completely free to start.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {auth ? (
                <Link to={auth.role === 'shop' ? '/shop/dashboard' : auth.role === 'admin' ? '/admin/dashboard' : '/dashboard'} style={{ ...btnPrimary, background: '#fff', color: '#e94560' }} id="shop-dashboard-cta">Go to Dashboard</Link>
              ) : (
                <>
                  <Link to="/register" style={{ ...btnPrimary, background: '#fff', color: '#e94560' }} id="shop-register-cta">Register Your Shop</Link>
                  <Link to="/login" style={{ ...btnGhost, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} id="shop-login-cta">Already a member? Sign In</Link>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      {!auth && (
        <section style={{ ...section, textAlign: 'center', padding: '80px 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '14px' }}>
            Ready for Your Best Haircut?
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '1rem', marginBottom: '32px' }}>Join thousands of customers already using Balor.</p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={btnPrimary} id="footer-register-cta">Create Free Account</Link>
            <Link to="/login" style={{ ...btnPrimary, background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)' }} id="footer-login-cta">Sign In</Link>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={footerStyle}>
        <div style={footerGrid}>
          {/* Column 1: Brand & Info */}
          <div style={footerCol}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ color: 'var(--accent)', fontSize: '1.4rem' }}>✂</span>
              <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.3rem', letterSpacing: '-0.01em' }}>Balor</span>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0, textAlign: 'left' }}>
              Elevating your grooming experience. Connecting you with premium barbers for seamless scheduling, wherever you are.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div style={footerCol}>
            <h4 style={footerColTitle}>Quick Links</h4>
            <div style={footerLinksList}>
              <Link to="/" style={footerLink} className="footer-link">Home</Link>
              {auth?.role === 'user' ? (
                <>
                  <Link to="/salons" style={footerLink} className="footer-link">Salons</Link>
                  <Link to="/dashboard" style={footerLink} className="footer-link">Dashboard</Link>
                  <Link to="/my-bookings" style={footerLink} className="footer-link">My Bookings</Link>
                </>
              ) : auth?.role === 'shop' ? (
                <>
                  <Link to="/shop/dashboard" style={footerLink} className="footer-link">Shop Dashboard</Link>
                  <Link to="/profile" style={footerLink} className="footer-link">Profile</Link>
                </>
              ) : auth?.role === 'admin' ? (
                <>
                  <Link to="/admin/dashboard" style={footerLink} className="footer-link">Admin Dashboard</Link>
                  <Link to="/profile" style={footerLink} className="footer-link">Profile</Link>
                </>
              ) : (
                <>
                  <Link to="/login" style={footerLink} className="footer-link">Login</Link>
                  <Link to="/register" style={footerLink} className="footer-link">Register</Link>
                  <Link to="/register?role=shop" style={footerLink} className="footer-link">Register your Salon</Link>
                </>
              )}
            </div>
          </div>

          {/* Column 3: Contact */}
          <div style={footerCol}>
            <h4 style={footerColTitle}>Support</h4>
            <div style={footerLinksList}>
              <a href="mailto:contact@balorapp.com" style={footerSubLink} className="footer-sublink">
                ✉ contact@balorapp.com
              </a>
              <a href="tel:+18005554247" style={footerSubLink} className="footer-sublink">
                📞 +1 (800) 555-HAIR
              </a>
              <span style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                📍 Metro Plaza, City Center
              </span>
            </div>
          </div>

          {/* Column 4: Rating Widget (Auth users only) */}
          {auth && (
            <div style={footerCol}>
              <h4 style={footerColTitle}>Send Feedback</h4>
              <div style={footerRateCard}>
                {footerRated ? (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>Feedback Submitted!</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.78rem', marginTop: '4px' }}>
                      Thank you for helping us improve Balor.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFooterRateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFooterRating(star)}
                          onMouseEnter={() => setFooterHoverRating(star)}
                          onMouseLeave={() => setFooterHoverRating(0)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '1.4rem',
                            color: star <= (footerHoverRating || footerRating) ? '#f59e0b' : 'var(--text3)',
                            transition: 'color 0.15s, transform 0.15s',
                            transform: star <= footerHoverRating ? 'scale(1.15)' : 'scale(1)',
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        disabled={footerRating === 0}
                        style={{
                          background: footerRating > 0 ? 'var(--text)' : 'var(--border)',
                          color: footerRating > 0 ? 'var(--bg2)' : 'var(--text3)',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: footerRating > 0 ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          boxShadow: footerRating > 0 ? 'var(--shadow-sm)' : 'none',
                        }}
                      >
                        Submit
                      </button>
                      <span style={{ color: 'var(--text2)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        {footerRating > 0 ? `${footerRating} Star${footerRating > 1 ? 's' : ''}` : 'Select rating above'}
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row */}
        <div style={footerBottom}>
          <p style={{ color: 'var(--text2)', fontSize: '0.82rem', margin: 0 }}>
            © {new Date().getFullYear()} Balor Barber Shop. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link to="/privacy" style={footerSubLink} className="footer-sublink">
              Privacy
            </Link>
            <Link to="/terms" style={footerSubLink} className="footer-sublink">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      <style>{`
        .feature-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .feature-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(233,69,96,0.12); }
        .footer-link:hover { color: var(--accent) !important; padding-left: 4px; }
        .footer-sublink:hover { color: var(--accent) !important; }
        .prof-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .prof-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.3) !important; }
        .mission-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .mission-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(233,69,96,0.08); border-color: var(--accent) !important; }
      `}</style>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const heroSection = {
  position: 'relative',
  height: 'calc(100vh - 60px)',
  minHeight: '560px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};
const heroBg = {
  position: 'absolute', inset: 0,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  willChange: 'opacity, transform',
};
const heroOverlay = {
  position: 'absolute', inset: 0,
  background: 'linear-gradient(120deg, rgba(5,5,15,0.82) 0%, rgba(5,5,15,0.45) 60%, rgba(5,5,15,0.65) 100%)',
};
const heroContent = {
  position: 'relative', zIndex: 2,
  maxWidth: '680px',
  padding: '0 32px',
  willChange: 'opacity, transform',
};
const slideTag = {
  display: 'inline-block',
  padding: '5px 14px',
  borderRadius: '20px',
  background: 'rgba(233,69,96,0.25)',
  border: '1px solid rgba(233,69,96,0.5)',
  color: '#e94560',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '18px',
};
const heroTitle = {
  fontSize: 'clamp(2.4rem, 6vw, 4rem)',
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1.1,
  letterSpacing: '-0.04em',
  margin: '0 0 20px',
};
const heroSub = {
  fontSize: '1.05rem',
  color: 'rgba(255,255,255,0.72)',
  lineHeight: 1.7,
  marginBottom: '32px',
  maxWidth: '500px',
};
const heroCTA = { display: 'flex', gap: '14px', flexWrap: 'wrap' };
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center',
  padding: '13px 28px',
  background: 'linear-gradient(135deg, #e94560, #a0153e)',
  color: '#fff',
  fontWeight: 700, fontSize: '0.95rem',
  borderRadius: '10px',
  textDecoration: 'none',
  boxShadow: '0 6px 24px rgba(233,69,96,0.35)',
  transition: 'transform 0.18s, box-shadow 0.18s',
  border: 'none',
};
const btnGhost = {
  display: 'inline-flex', alignItems: 'center',
  padding: '13px 28px',
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  fontWeight: 600, fontSize: '0.95rem',
  borderRadius: '10px',
  textDecoration: 'none',
  border: '1.5px solid rgba(255,255,255,0.25)',
  transition: 'background 0.18s',
  backdropFilter: 'blur(8px)',
};
const arrowBtn = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  zIndex: 3,
  width: '44px', height: '44px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff',
  fontSize: '1.6rem',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(6px)',
  transition: 'background 0.18s',
  fontFamily: 'inherit',
  lineHeight: 1,
};
const dotsBar = {
  position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
  zIndex: 3, display: 'flex', gap: '8px',
};
const dot = {
  width: '8px', height: '8px', borderRadius: '50%',
  background: 'rgba(255,255,255,0.35)',
  border: 'none', cursor: 'pointer', padding: 0,
  transition: 'background 0.2s, transform 0.2s',
};
const dotActive = {
  background: '#e94560',
  transform: 'scale(1.35)',
  width: '22px',
  borderRadius: '4px',
};

const statsBar = {
  background: 'linear-gradient(135deg, #e94560, #a0153e)',
  padding: '28px 24px',
};
const statsInner = {
  maxWidth: '900px', margin: '0 auto',
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '20px', textAlign: 'center',
};
const statItem = {};
const statValue = { fontSize: '1.9rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' };
const statLabel = { fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', marginTop: '4px', fontWeight: 500 };

const section = { padding: '80px 24px' };
const container = { maxWidth: '1100px', margin: '0 auto' };
const sectionHeader = { textAlign: 'center', marginBottom: '56px' };
const sectionTag = {
  display: 'inline-block',
  padding: '5px 14px', borderRadius: '20px',
  background: 'rgba(233,69,96,0.1)', color: '#e94560',
  fontSize: '0.78rem', fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  border: '1px solid rgba(233,69,96,0.2)',
  marginBottom: '14px',
};
const sectionTitle = {
  fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)',
  fontWeight: 900, letterSpacing: '-0.03em',
  color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.2,
};
const sectionSub = { color: 'var(--text2)', fontSize: '1rem', margin: 0 };

const featuresGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
  gap: '20px',
};
const featureCard = {
  padding: '28px',
  background: 'var(--card)',
  borderRadius: '16px',
  border: '1px solid var(--border)',
};
const featureIcon = { fontSize: '2rem', marginBottom: '14px' };
const featureTitle = { fontWeight: 800, fontSize: '1rem', margin: '0 0 8px', color: 'var(--text)' };
const featureDesc = { color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 };

const stepsGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '24px',
};
const stepCard = {
  padding: '32px 28px',
  background: 'var(--card)',
  borderRadius: '18px',
  border: '1px solid var(--border)',
  position: 'relative',
};
const stepNum = {
  fontSize: '3rem', fontWeight: 900,
  color: 'rgba(233,69,96,0.18)',
  lineHeight: 1, letterSpacing: '-0.04em',
};

const testimonialsGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
  gap: '20px',
};
const testimonialCard = {
  padding: '28px',
  background: 'var(--card)',
  borderRadius: '16px',
  border: '1px solid var(--border)',
};
const testimonialText = {
  color: 'var(--text2)', fontSize: '0.92rem', lineHeight: 1.75,
  fontStyle: 'italic', margin: 0,
};
const avatarImg = {
  width: '40px', height: '40px', borderRadius: '50%',
  objectFit: 'cover', border: '2px solid rgba(233,69,96,0.35)',
};

const shopCTASection = {
  padding: '100px 24px',
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%)',
};
const shopCTAOverlay = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(ellipse at 50% 50%, rgba(233,69,96,0.22) 0%, transparent 70%)',
  pointerEvents: 'none',
};
const footerStyle = {
  background: 'var(--bg2)',
  borderTop: '1px solid var(--border)',
  padding: '60px 24px 30px',
  width: '100%',
  transition: 'background 0.25s ease, border-color 0.25s ease',
};

const footerGrid = {
  maxWidth: '1100px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '40px',
  marginBottom: '50px',
};

const footerCol = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};

const footerColTitle = {
  fontSize: '0.82rem',
  fontWeight: 700,
  color: 'var(--text)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '20px',
};

const footerLinksList = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '100%',
};

const footerLink = {
  color: 'var(--text2)',
  textDecoration: 'none',
  fontSize: '0.88rem',
  transition: 'color 0.15s ease, padding-left 0.15s ease',
  display: 'inline-block',
};

const footerSubLink = {
  color: 'var(--text2)',
  textDecoration: 'none',
  fontSize: '0.88rem',
  transition: 'color 0.15s ease',
};

const footerRateCard = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '16px',
  width: '100%',
  boxShadow: 'var(--shadow-sm)',
  transition: 'background 0.25s ease, border-color 0.25s ease',
};

const footerBottom = {
  maxWidth: '1100px',
  margin: '0 auto',
  paddingTop: '24px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px',
};

const professionalGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '24px',
  marginBottom: '64px',
};
const professionalCard = {
  padding: '32px 24px',
  background: 'var(--card)',
  borderRadius: '16px',
  border: '1px solid var(--border)',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};
const professionalIconCircle = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  background: 'rgba(37,99,235,0.08)',
  color: '#2563eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.4rem',
  marginBottom: '20px',
  border: '1px solid rgba(37,99,235,0.18)',
};
const missionGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '30px',
};
const missionCard = {
  padding: '36px 30px',
  background: 'var(--card)',
  borderRadius: '18px',
  border: '1px solid var(--border)',
};
