import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

// N'affiche rien si `platforms` est vide (compte mono-plateforme), voir
// usePlatformFilter.js pour la détection.
function PlatformFilterToggle({ platforms, platform, onChange }) {
  const { t } = useTranslation();
  if (platforms.length === 0) return null;

  return (
    <div className="strategy-tool-group platform-filter-toggle">
      <Button
        variant="ghost"
        className={platform === 'all' ? 'strategy-tool active' : 'strategy-tool'}
        onClick={() => onChange('all')}
      >
        {t('platformFilter.all')}
      </Button>
      {platforms.includes('pc') && (
        <Button
          variant="ghost"
          className={platform === 'pc' ? 'strategy-tool active' : 'strategy-tool'}
          onClick={() => onChange('pc')}
        >
          {t('platformFilter.pc')}
        </Button>
      )}
      {platforms.includes('console') && (
        <Button
          variant="ghost"
          className={platform === 'console' ? 'strategy-tool active' : 'strategy-tool'}
          onClick={() => onChange('console')}
        >
          {t('platformFilter.console')}
        </Button>
      )}
    </div>
  );
}

export default PlatformFilterToggle;
