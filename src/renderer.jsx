// Polices bundlées localement (pas de CDN) : l'app doit garder son identité
// visuelle même sans connexion. Chakra Petch = titres/chiffres (même police
// que le site vitrine), Inter = texte courant.
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
import '@fontsource-variable/inter';
import './index.css';
import './renderer/i18n/index.js';
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
