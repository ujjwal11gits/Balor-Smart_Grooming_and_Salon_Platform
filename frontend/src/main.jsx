import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BrowserRouter } from 'react-router-dom';

// Inject browser-specific styles to avoid VS Code CSS validation warnings/errors
const style = document.createElement('style');
style.textContent = `
  .tab-bar {
    scrollbar-width: none !important;
    -webkit-overflow-scrolling: touch !important;
  }
  .modal-overlay {
    backdrop-filter: blur(4px) !important;
    -webkit-backdrop-filter: blur(4px) !important;
  }
`;
document.head.appendChild(style);


ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
