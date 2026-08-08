import { useState, useRef, useEffect } from 'react';
import './ChatbotWidget.css';

const WELCOME_MSG = { sender: 'bot', text: "Hey there! 👋 I'm the Balor Assistant. I can help you with bookings, services, pricing, account questions, and more. What would you like to know?" };

export default function ChatbotWidget({ role }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Server returned an invalid response.');
      }

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("You're asking too fast! Please wait a moment. ⏳");
        }
        throw new Error(data.error || 'Something went wrong.');
      }

      setMessages(prev => [...prev, { sender: 'bot', text: data.answer || "Sorry, I don't have an answer for that." }]);
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'bot', text: e.message, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Modern bot/assistant icon (scissors + sparkle for a barber AI) ──
  const BotIcon = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Robot head */}
      <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      {/* Antenna */}
      <line x1="12" y1="6" x2="12" y2="3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="12" cy="2" r="1.2" fill="currentColor"/>
      {/* Eyes */}
      <circle cx="9" cy="11" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="11" r="1.5" fill="currentColor"/>
      {/* Mouth */}
      <path d="M9.5 14.5 C10.5 15.5 13.5 15.5 14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      {/* Ears */}
      <rect x="1.5" y="9" width="2.5" height="4" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="20" y="9" width="2.5" height="4" rx="1" fill="currentColor" opacity="0.6"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );

  return (
    <>
      {/* Floating toggle */}
      <button
        className={`cb-toggle ${open ? 'cb-toggle--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? <CloseIcon /> : (
          <>
            <BotIcon />
            <span className="cb-toggle__label">Balor Assistant ✨</span>
          </>
        )}
      </button>

      {/* Chat modal */}
      {open && (
        <div className="cb-modal">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header__info">
              <div className="cb-avatar">
                <BotIcon />
              </div>
              <div>
                <h3 className="cb-title">Balor Assistant</h3>
                <span className="cb-status">● Online</span>
              </div>
            </div>
            <button className="cb-close" onClick={() => setOpen(false)} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div className="cb-body" ref={bodyRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`cb-msg cb-msg--${msg.sender} ${msg.isError ? 'cb-msg--error' : ''}`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="cb-msg cb-msg--bot cb-loading">
                <span className="cb-dot" /><span className="cb-dot" /><span className="cb-dot" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="cb-input-area">
            <input
              type="text"
              className="cb-input"
              placeholder="Ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              autoFocus
            />
            <button className="cb-send" onClick={sendMessage} disabled={loading || !input.trim()} aria-label="Send">
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
