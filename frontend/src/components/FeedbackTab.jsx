import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function FeedbackTab() {
  const { auth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const drawerRef = useRef(null);

  // Do not render feedback system for admins at all
  if (auth?.role === 'admin') {
    return null;
  }

  // Pre-fill email if logged in
  useEffect(() => {
    if (auth?.email) {
      setEmail(auth.email);
    } else {
      setEmail('');
    }
  }, [auth]);

  // Handle outside click to close drawer
  useEffect(() => {
    function handleClickOutside(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target) && !event.target.closest('.feedback-trigger-btn') && !event.target.closest('.drawer-feedback-btn')) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Listen to open events from other components (like mobile navbar button)
  useEffect(() => {
    const handleOpenFeedback = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-feedback-drawer', handleOpenFeedback);
    return () => {
      window.removeEventListener('open-feedback-drawer', handleOpenFeedback);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe the issue or suggestion.');
      return;
    }
    if (!auth && !email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      type,
      description,
      email: auth ? auth.email : email,
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`
    };

    try {
      await api.post('/feedback', payload);
      setSuccess(true);
      setDescription('');
      setError(null);
      // Auto close after 2.5 seconds
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Feedback submission failed:', err);
      setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating edge-attached tab button for Laptops / Desktops */}
      <button 
        className={`feedback-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Report an Issue or Suggestion"
      >
        <span className="feedback-trigger-icon">🪲</span>
        <span className="feedback-trigger-text">Feedback</span>
      </button>

      {/* Slide-out feedback drawer */}
      <div 
        ref={drawerRef}
        className={`feedback-drawer ${isOpen ? 'open' : ''}`}
      >
        <div className="feedback-drawer-header">
          <h3>Help us improve Balor</h3>
          <button 
            className="feedback-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        <div className="feedback-drawer-body">
          {success ? (
            <div className="feedback-success-state">
              <div className="feedback-success-icon">✓</div>
              <h4>Thank you!</h4>
              <p>Your feedback has been submitted successfully. We appreciate your help in making Balor better.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-form">
              <p className="feedback-form-desc">
                Found a bug or have a suggestion? Let us know!
              </p>

              {error && (
                <div className="feedback-error-msg">
                  ⚠️ {error}
                </div>
              )}

              <div className="feedback-form-group">
                <label htmlFor="feedback-type">Category</label>
                <select
                  id="feedback-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={loading}
                >
                  <option value="bug">Bug / Technical Issue</option>
                  <option value="suggestion">Suggestion / Idea</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {!auth && (
                <div className="feedback-form-group">
                  <label htmlFor="feedback-email">Your Email</label>
                  <input
                    type="email"
                    id="feedback-email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className="feedback-form-group">
                <label htmlFor="feedback-desc">Description</label>
                <textarea
                  id="feedback-desc"
                  placeholder="Describe the bug or feature suggestion in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                  disabled={loading}
                />
              </div>

              <div className="feedback-diagnostic-disclosure">
                <small>
                  ℹ️ Submitting will automatically capture current URL, screen size ({window.innerWidth}x{window.innerHeight}), and browser agent to help us diagnose the issue.
                </small>
              </div>

              <button 
                type="submit" 
                className="btn-primary feedback-submit-btn"
                disabled={loading} // Disable once clicked to avoid multiple submissions
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
