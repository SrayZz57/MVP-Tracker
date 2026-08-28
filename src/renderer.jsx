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
import AimTrainerGame from './renderer/AimTrainerGame.jsx';
import { CollapsedBlocksProvider } from './renderer/CollapsedBlocksContext.jsx';

window.addEventListener('error', (e) => console.error('window error', e.message, e.filename));
window.addEventListener('unhandledrejection', (e) => console.error('unhandled rejection', e.reason));

// Certaines fenêtres chargent le même bundle que la fenêtre principale, mais
// avec un `?view=...` : elles rendent uniquement leur contenu propre, sans le
// reste de l'app (pas de sidebar, pas de compte, pas de requête inutile).
const params = new URLSearchParams(window.location.search);
const view = params.get('view');

let gameConfig = {};
if (view === 'aim-trainer') {
  try {
    gameConfig = JSON.parse(params.get('config') ?? '{}');
  } catch {
    gameConfig = {};
  }
}

function Root() {
  if (view === 'aim-trainer') return <AimTrainerGame config={gameConfig} />;
  return (
    <CollapsedBlocksProvider>
      <App />
    </CollapsedBlocksProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
