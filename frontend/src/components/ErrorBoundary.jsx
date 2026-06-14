import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React Error Boundary Caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '85vh',
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          <div className="card" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '16px'
            }}>
              ⚠️
            </div>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: 800,
              margin: '0 0 10px',
              color: 'var(--text)',
              letterSpacing: '-0.02em'
            }}>
              Oops, something went wrong
            </h3>
            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text2)',
              lineHeight: 1.5,
              margin: '0 0 28px'
            }}>
              An unexpected client-side error occurred while rendering this page. You can reload the page to restore the view.
            </p>
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
              <button
                className="btn-primary"
                onClick={() => window.location.reload()}
                style={{ fontSize: '0.88rem', padding: '10px 20px', flex: 1 }}
              >
                🔄 Reload Page
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                style={{ fontSize: '0.88rem', padding: '10px 20px', flex: 1 }}
              >
                🏠 Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
