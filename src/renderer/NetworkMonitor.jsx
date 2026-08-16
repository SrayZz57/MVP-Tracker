import { useEffect, useState } from 'react';

function NetworkMonitor() {
  const [status, setStatus] = useState({ valorantRunning: false, latestPing: null });

  useEffect(() => {
    const poll = () => window.electronAPI.getNetworkStatus().then(setStatus);
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  const pingClass = status.latestPing === null ? '' : status.latestPing < 60 ? 'good' : status.latestPing < 120 ? 'mid' : 'bad';

  return (
    <div className="card">
      <h3>📡 Statut</h3>
      <div className={`network-status-banner ${status.valorantRunning ? 'online' : ''}`}>
        <span className="status-dot-lg" />
        {status.valorantRunning ? 'Valorant détecté' : 'Valorant non détecté'}
      </div>
      {status.valorantRunning && (
        <div className="stat-tiles">
          <div className="stat-tile">
            <div className={`ping-value ${pingClass}`}>
              {status.latestPing === null ? '...' : `${status.latestPing} ms`}
            </div>
            <div className="label">Ping (connexion générale)</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkMonitor;
