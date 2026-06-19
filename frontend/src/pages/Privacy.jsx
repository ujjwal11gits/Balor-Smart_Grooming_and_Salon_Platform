import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <Link to="/" style={backLinkStyle}>← Back to Home</Link>
          <h1 style={titleStyle}>Privacy Policy</h1>
          <p style={subtitleStyle}>Last updated: June 2026</p>
        </div>

        <div style={contentStyle}>
          <p style={paragraphStyle}>
            Welcome to Balor. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and salon booking services.
          </p>

          <hr style={dividerStyle} />

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>1. Information We Collect</h2>
            <p style={paragraphStyle}>
              We collect information to provide a better booking experience to all our users.
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Personal Credentials:</strong> Name, email address, password, and telephone number when you create an account or verify with OTP.
              </li>
              <li style={listItemStyle}>
                <strong>Salon Information:</strong> For salon owners, we collect salon names, business registration numbers, street addresses, city, and active barber details.
              </li>
              <li style={listItemStyle}>
                <strong>Location Data:</strong> With your permission, we use reverse geocoding to find nearby salons and shops automatically.
              </li>
              <li style={listItemStyle}>
                <strong>Activity Logs:</strong> Feedback, ratings, and booking histories to optimize salon operations.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>2. How We Use Your Information</h2>
            <p style={paragraphStyle}>
              We use the collected information for the following purposes:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>To facilitate and manage your appointments and scheduling.</li>
              <li style={listItemStyle}>To verify your identity using OTP emails and prevent fraud.</li>
              <li style={listItemStyle}>To notify you about appointment updates, cancellations, and status changes.</li>
              <li style={listItemStyle}>To maintain a reliable rating system and feedback loop for quality assurance.</li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>3. Information Sharing</h2>
            <p style={paragraphStyle}>
              We do not sell or lease your personal information. Your contact and booking details are shared only with the specific salon or barber you choose to book with, solely to fulfill the grooming service.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>4. Security of Data</h2>
            <p style={paragraphStyle}>
              We implement industry-standard security and encryption practices to keep your credentials and booking transactions safe. However, please remember that no transmission method over the internet is 100% secure.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>5. Your Rights</h2>
            <p style={paragraphStyle}>
              You have the right to access, edit, or delete your account information at any time from your profile dashboard. If you wish to delete your entire account permanently, please contact our support team at <a href="mailto:ujjwalakash11@gmail.com" style={emailLinkStyle}>ujjwalakash11@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: 'calc(100vh - 60px)',
  background: 'var(--bg)',
  padding: '40px 16px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  boxSizing: 'border-box',
};

const cardStyle = {
  width: '100%',
  maxWidth: '800px',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '40px',
  boxShadow: 'var(--shadow-sm)',
  boxSizing: 'border-box',
};

const headerStyle = {
  marginBottom: '32px',
};

const backLinkStyle = {
  color: 'var(--accent)',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '0.9rem',
  display: 'inline-block',
  marginBottom: '16px',
};

const titleStyle = {
  fontSize: '2.2rem',
  fontWeight: 800,
  color: 'var(--text)',
  margin: '0 0 8px 0',
  letterSpacing: '-0.02em',
};

const subtitleStyle = {
  color: 'var(--text3)',
  margin: 0,
  fontSize: '0.9rem',
};

const contentStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const paragraphStyle = {
  color: 'var(--text2)',
  lineHeight: 1.7,
  fontSize: '0.96rem',
  margin: 0,
};

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const sectionTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: 'var(--text)',
  margin: 0,
};

const listStyle = {
  margin: 0,
  paddingLeft: '20px',
  color: 'var(--text2)',
  lineHeight: 1.75,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const listItemStyle = {
  fontSize: '0.95rem',
};

const dividerStyle = {
  border: 'none',
  borderTop: '1px solid var(--border)',
  margin: '8px 0',
};

const emailLinkStyle = {
  color: 'var(--accent)',
  textDecoration: 'none',
  fontWeight: 600,
};
