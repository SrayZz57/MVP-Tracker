import { useState } from 'react';
import RiotProfilePreview from './RiotProfilePreview.jsx';
import logo from '../assets/logo.png';

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
function LinkRiotAccount({ onConfirmed }) {
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
      <h1>Lier ton compte Riot</h1>

      {step === 'search' && (
        <>
          <p className="welcome-tagline">Dernière étape avant de commencer.</p>

          <div className="link-riot-disclaimer">
            <span className="link-riot-disclaimer-icon">⚠️</span>
            <div>
              <strong>Utilise ton PROPRE pseudo Riot ici.</strong>
              <p>
                Cette recherche va lier <strong>définitivement</strong> ce compte Valorant à ton compte MVP Tracker
                — c'est lui qui déterminera tes objectifs, ton Hall of Fame, ta collection de skins, etc. Ce n'est{' '}
                <strong>pas</strong> l'endroit pour consulter le tracker de quelqu'un d'autre — ça, tu pourras le
                faire librement une fois connecté, sans que ça touche à ton compte.
              </p>
            </div>
          </div>

          <form className="account-auth-form" onSubmit={handleSearch}>
            <div className="search-bar-riotid">
              <input placeholder="Pseudo" value={name} onChange={(e) => setName(e.target.value)} required />
              <span className="search-bar-hash">#</span>
              <input placeholder="Tag" value={tag} onChange={(e) => setTag(e.target.value)} required />
            </div>
            <input
              placeholder="Clé API HenrikDev"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Recherche...' : '🔍 Rechercher'}
            </button>
          </form>

          {error && <p className="warning">{error}</p>}

          <div className="welcome-api-help">
            <p>
              La clé API sert à récupérer tes matchs depuis HenrikDev (le service que l'appli utilise pour parler à
              Valorant) — c'est gratuit et ça prend 30 secondes.
            </p>
            <button
              type="button"
              className="welcome-api-link"
              onClick={() => window.electronAPI.openExternal('https://api.henrikdev.xyz/dashboard/')}
            >
              🔑 Obtenir ma clé API HenrikDev
            </button>
          </div>
        </>
      )}

      {step === 'confirm' && preview && (
        <>
          <p className="welcome-tagline">C'est bien toi ?</p>
          <RiotProfilePreview name={preview.name} tag={preview.tag} cardUuid={preview.cardUuid} rank={preview.rank} />
          <div className="riot-confirm-actions">
            <button className="riot-confirm-yes" onClick={handleConfirm}>
              ✅ Oui, c'est moi — lier ce compte
            </button>
            <button className="riot-confirm-no" onClick={handleDeny}>
              ↺ Non, recommencer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default LinkRiotAccount;
