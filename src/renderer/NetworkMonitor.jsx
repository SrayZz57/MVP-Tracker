import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function NetworkMonitor() {
  const { t } = useTranslation();
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
      <h3>{t('network.status')}</h3>
      <div className={`network-status-banner ${status.valorantRunning ? 'online' : ''}`}>
        <span className="status-dot-lg" />
        {status.valorantRunning ? t('network.detected') : t('network.notDetected')}
      </div>
      {status.valorantRunning && (
        <div className="stat-tiles">
          <div className="stat-tile">
            <div className={`ping-value ${pingClass}`}>
              {status.latestPing === null ? '...' : `${status.latestPing} ms`}
            </div>
            <div className="label">{t('network.pingGeneral')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkMonitor;
