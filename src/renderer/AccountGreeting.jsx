import { useTranslation } from 'react-i18next';
import RiotProfilePreview from './RiotProfilePreview.jsx';
import { DEFAULT_CONFIG } from './AimTrainerGame.jsx';
import logo from '../assets/logo.png';

const ORBS = [1, 2, 3, 4, 5, 6, 7];
const SETTINGS_STORAGE_KEY = 'mvptracker-aim-trainer-settings';

// Réglages de l'Aim Trainer tels que le joueur les a laissés : lancer depuis
// l'accueil doit donner exactement la même séance que depuis l'onglet.
function loadAimConfig() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Écran d'accueil affiché à chaque lancement une fois le compte lié. Deux
// entrées côte à côte : consulter ses stats, ou s'échauffer avant de jouer —
// l'Aim Trainer étant surtout utile juste avant une session, c'est ici qu'il
// a le plus de chances d'être lancé.
function AccountGreeting({ settings, rank, myId, onEnter, onSearchOther }) {
  const { t } = useTranslation();

  return (
    <div className="welcome-screen greeting-screen">
      <div className="welcome-bg" aria-hidden="true">
        {ORBS.map((i) => (
          <span key={i} className={`welcome-orb welcome-orb-${i}`} />
        ))}
      </div>

      <img src={logo} alt="MVP Tracker" className="welcome-logo" />
      <h1>{t('accountGreeting.title')}</h1>
      <p className="welcome-tagline">{t('accountGreeting.tagline')}</p>

      <div className="greeting-split">
        <section className="greeting-panel">
          <span className="greeting-panel-label">{t('accountGreeting.trackerLabel')}</span>
          <RiotProfilePreview name={settings.name} tag={settings.tag} cardUuid={rank?.cardUuid} rank={rank} />
          <div className="riot-confirm-actions">
            <button className="riot-confirm-yes" onClick={onEnter}>
              {t('accountGreeting.enter')}
            </button>
            <button className="riot-confirm-no" onClick={onSearchOther}>
              {t('accountGreeting.searchOther')}
            </button>
          </div>
        </section>

        <section className="greeting-panel greeting-aim">
          <span className="greeting-panel-label greeting-aim-label">{t('accountGreeting.aimLabel')}</span>

          {/* Illustration de l'arène : dessinée en CSS plutôt qu'une capture,
              pour rester nette à toutes les tailles et ne rien alourdir. */}
          <div className="aim-preview" aria-hidden="true">
            <span className="aim-preview-sky" />
            <span className="aim-preview-floor" />
            <span className="aim-preview-target aim-preview-target-1" />
            <span className="aim-preview-target aim-preview-target-2" />
            <span className="aim-preview-target aim-preview-target-3" />
            <span className="aim-preview-crosshair" />
            <span className="aim-preview-hud">
              <span>30s</span>
              <span>18</span>
              <span>95%</span>
            </span>
          </div>

          <h2 className="greeting-aim-title">{t('accountGreeting.aimTitle')}</h2>
          <p className="label greeting-aim-text">{t('accountGreeting.aimText')}</p>

          <button
            className="refresh greeting-aim-btn"
            onClick={() => window.electronAPI.openAimTrainer({ ...loadAimConfig(), userId: myId })}
          >
            {t('accountGreeting.aimCta')}
          </button>
        </section>
      </div>
    </div>
  );
}

export default AccountGreeting;
