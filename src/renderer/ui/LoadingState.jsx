import { useTranslation } from 'react-i18next';
import useLoadingGate from '../hooks/useLoadingGate.js';

function LoadingState({ label, active = true }) {
  const { t } = useTranslation();
  const gate = useLoadingGate(active);
  if (!gate.show) return null;
  return (
    <div className="loading-state" role="status" aria-busy="true">
      <div className="loading-spinner" aria-hidden="true" />
      <p>{label ?? t('common.fetchingData')}</p>
    </div>
  );
}

export default LoadingState;
