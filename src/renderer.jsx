import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './renderer/App.jsx';

window.addEventListener('error', (e) => console.error('window error', e.message, e.filename));
window.addEventListener('unhandledrejection', (e) => console.error('unhandled rejection', e.reason));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
