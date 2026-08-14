import { useEffect, useState } from 'react';

function NetworkMonitor() {
  const [status, setStatus] = useState({ valorantRunning: false, latestPing: null });

  useEffect(() => {
    const poll = () => window.electronAPI.getNetworkStatus().then(setStatus);
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Réseau</h2>
      <p>
        {status.valorantRunning ? 'Valorant détecté' : 'Valorant non détecté'}
        {status.valorantRunning &&
          ` — Ping (connexion générale) : ${status.latestPing === null ? 'en attente...' : `${status.latestPing} ms`}`}
      </p>
    </div>
  );
}

export default NetworkMonitor;
