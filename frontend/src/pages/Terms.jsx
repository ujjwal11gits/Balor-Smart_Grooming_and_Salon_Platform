import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <Link to="/" style={backLinkStyle}>← Back to Home</Link>
          <h1 style={titleStyle}>Terms of Service</h1>
          <p style={subtitleStyle}>Last updated: June 2026</p>
        </div>

        <div style={contentStyle}>
          <p style={paragraphStyle}>
            Welcome to Balor. These Terms of Service ("Terms") govern your use of our platform, mobile application, and grooming appointment scheduling services. By registering an account or accessing our services, you agree to be bound by these Terms.
          </p>

          <hr style={dividerStyle} />

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>1. Account Registration & Security</h2>
            <p style={paragraphStyle}>
              To book appointments or list a salon, you must register for an account using a valid email and phone number. You are responsible for safeguarding your credentials and agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>2. For Customers (Booking & Appointments)</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Bookings:</strong> Appointments are subject to real-time availability of the selected barber/salon.
              </li>
              <li style={listItemStyle}>
                <strong>Cancellations:</strong> If you cannot attend your scheduled service, please cancel or reschedule in advance via your dashboard.
              </li>
              <li style={listItemStyle}>
                <strong>Fees:</strong> Standard pricing is specified by individual salons. Currently, Balor does not charge platform fees to customers for bookings.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>3. For Salon Owners & Barbers</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Listing Accuracy:</strong> Salon owners must maintain accurate details, including services, pricing, operating hours, and barber availability.
              </li>
              <li style={listItemStyle}>
                <strong>Honoring Bookings:</strong> You agree to honor all verified customer appointments booked through the platform.
              </li>
              <li style={listItemStyle}>
                <strong>Staff Management:</strong> You are responsible for configuring staff member profiles and shifts accurately on your dashboard.
              </li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>4. Limitation of Liability</h2>
            <p style={paragraphStyle}>
              Balor provides an online marketplace platform connecting customers with barbers and salons. We are not responsible for the quality, safety, or legality of the physical grooming services provided. Any disputes regarding services or payments must be resolved directly between the customer and the salon.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>5. Termination of Service</h2>
            <p style={paragraphStyle}>
              We reserve the right to suspend or terminate accounts that violate our policies, engage in fraudulent behavior, or cause disruption to the booking ecosystem.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>6. Contact Us</h2>
            <p style={paragraphStyle}>
              If you have any questions or feedback regarding these Terms, please reach out to us at <a href="mailto:ujjwalakash11@gmail.com" style={emailLinkStyle}>ujjwalakash11@gmail.com</a>.
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
