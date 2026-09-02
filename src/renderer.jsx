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
import AgentSelectOverlay from './renderer/AgentSelectOverlay.jsx';
import { CollapsedBlocksProvider } from './renderer/CollapsedBlocksContext.jsx';
import { E2EEProvider } from './renderer/E2EEContext.jsx';

window.addEventListener('error', (e) => {
  console.error('window error', e.message, e.filename);
  window.electronAPI?.captureException(null, e.error ?? new Error(e.message));
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('unhandled rejection', e.reason);
  window.electronAPI?.captureException(null, e.reason instanceof Error ? e.reason : new Error(String(e.reason)));
});

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
  if (view === 'agent-select-overlay') return <AgentSelectOverlay />;
  return (
    <E2EEProvider>
      <CollapsedBlocksProvider>
        <App />
      </CollapsedBlocksProvider>
    </E2EEProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
