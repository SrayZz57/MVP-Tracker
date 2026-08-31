import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import Icon from './Icon.jsx';
import RiotProfilePreview from './RiotProfilePreview.jsx';
import ApiKeyHelp from './ApiKeyHelp.jsx';
import logo from '../assets/logo.png';
import Button from './ui/Button';

const ORBS = [1, 2, 3, 4, 5, 6, 7];

function WelcomeOrbs() {
  return (
    <div className="welcome-bg" aria-hidden="true">
      {ORBS.map((i) => (
        <span key={i} className={`welcome-orb welcome-orb-${i}`} />
      ))}
    </div>
  );
}

// Écran affiché une seule fois, uniquement quand le compte MVP Tracker n'a
// encore aucun Riot ID lié (profile === null dans App.jsx) — distinct de la
// recherche libre depuis la barre du haut, qui elle ne lie jamais de compte.
// En deux temps : recherche (rien n'est encore enregistré) puis confirmation
// avec aperçu du vrai profil avant la liaison définitive.
function LinkRiotAccount({ onConfirmed, linkError }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState('search'); // 'search' | 'confirm'
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await window.electronAPI.previewRiotAccount({
        name: name.trim(),
        tag: tag.trim(),
        apiKey: apiKey.trim(),
      });
      setPreview(result);
      setStep('confirm');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirmed({ name: preview.name, tag: preview.tag, apiKey: apiKey.trim(), puuid: preview.puuid });
  };

  const handleDeny = () => {
    setStep('search');
    setPreview(null);
  };

  return (
    <div className="welcome-screen">
      <WelcomeOrbs />
      <img src={logo} alt="MVP Tracker" className="welcome-logo" />
      <h1>{t('linkRiot.title')}</h1>

      {step === 'search' && (
        <>
          <p className="welcome-tagline">{t('linkRiot.tagline')}</p>

          <div className="link-riot-disclaimer">
            <span className="link-riot-disclaimer-icon"><Icon icon={AlertTriangle} size={16} /></span>
            <div>
              <strong>{t('linkRiot.disclaimerWarning')}</strong>
              <p>
                {t('linkRiot.disclaimerPrefix')} <strong>{t('linkRiot.disclaimerDefinitively')}</strong>{' '}
                {t('linkRiot.disclaimerMiddle')} <strong>{t('linkRiot.disclaimerNot')}</strong>{' '}
                {t('linkRiot.disclaimerSuffix')}
              </p>
            </div>
          </div>

          <form className="account-auth-form" onSubmit={handleSearch}>
            <div className="search-bar-riotid">
              <input placeholder={t('linkRiot.usernamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} required />
              <span className="search-bar-hash">#</span>
              <input placeholder={t('linkRiot.tagPlaceholder')} value={tag} onChange={(e) => setTag(e.target.value)} required />
            </div>
            <input
              placeholder={t('linkRiot.apiKeyPlaceholder')}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? t('linkRiot.searching') : t('linkRiot.search')}
            </Button>
          </form>

          {error && <p className="warning">{error}</p>}
          {!error && linkError && (
            <p className="warning">
              {linkError === 'duplicate' ? t('linkRiot.alreadyLinkedError') : t('linkRiot.genericLinkError')}
            </p>
          )}

          <ApiKeyHelp />
        </>
      )}

      {step === 'confirm' && preview && (
        <>
          <p className="welcome-tagline">{t('linkRiot.confirmTagline')}</p>
          <RiotProfilePreview name={preview.name} tag={preview.tag} cardUuid={preview.cardUuid} rank={preview.rank} />
          <div className="riot-confirm-actions">
            <Button variant="primary" className="riot-confirm-yes" onClick={handleConfirm}>
              {t('linkRiot.confirmYes')}
            </Button>
            <Button variant="ghost" className="riot-confirm-no" onClick={handleDeny}>
              {t('linkRiot.confirmNo')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default LinkRiotAccount;
