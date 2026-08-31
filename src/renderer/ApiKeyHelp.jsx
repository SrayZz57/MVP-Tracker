import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

function ApiKeyHelp() {
  const { t } = useTranslation();
  return (
    <div className="welcome-api-help">
      <p>{t('welcome.apiKeyHelp')}</p>
      <ol className="welcome-api-steps">
        <li>{t('welcome.apiKeyStep1')}</li>
        <li>{t('welcome.apiKeyStep2')}</li>
        <li>{t('welcome.apiKeyStep3')}</li>
        <li>{t('welcome.apiKeyStep4')}</li>
      </ol>
      <Button
        variant="ghost"
        type="button"
        className="welcome-api-link"
        onClick={() => window.electronAPI.openExternal('https://api.henrikdev.xyz/dashboard/')}
      >
        {t('welcome.getApiKey')}
      </Button>
    </div>
  );
}

export default ApiKeyHelp;
