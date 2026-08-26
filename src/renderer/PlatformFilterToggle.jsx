import { useTranslation } from 'react-i18next';

// N'affiche rien si `platforms` est vide (compte mono-plateforme) — voir
// usePlatformFilter.js pour la détection.
function PlatformFilterToggle({ platforms, platform, onChange }) {
  const { t } = useTranslation();
  if (platforms.length === 0) return null;

  return (
    <div className="strategy-tool-group platform-filter-toggle">
      <button
        className={platform === 'all' ? 'strategy-tool active' : 'strategy-tool'}
        onClick={() => onChange('all')}
      >
        {t('platformFilter.all')}
      </button>
      {platforms.includes('pc') && (
        <button
          className={platform === 'pc' ? 'strategy-tool active' : 'strategy-tool'}
          onClick={() => onChange('pc')}
        >
          {t('platformFilter.pc')}
        </button>
      )}
      {platforms.includes('console') && (
        <button
          className={platform === 'console' ? 'strategy-tool active' : 'strategy-tool'}
          onClick={() => onChange('console')}
        >
          {t('platformFilter.console')}
        </button>
      )}
    </div>
  );
}

export default PlatformFilterToggle;
