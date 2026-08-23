import { useTranslation } from 'react-i18next';

function LoadingState({ label }) {
  const { t } = useTranslation();
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>{label ?? t('common.fetchingData')}</p>
    </div>
  );
}

export default LoadingState;
