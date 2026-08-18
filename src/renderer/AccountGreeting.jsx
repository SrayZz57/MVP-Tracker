import RiotProfilePreview from './RiotProfilePreview.jsx';
import logo from '../assets/logo.png';

const ORBS = [1, 2, 3, 4, 5, 6, 7];

// Écran d'accueil affiché à chaque lancement une fois le compte lié — aperçu
// rapide du profil suivi, avec le choix d'y entrer directement ou de chercher
// un autre joueur (sans que ça touche au compte lié).
function AccountGreeting({ settings, rank, onEnter, onSearchOther }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-bg" aria-hidden="true">
        {ORBS.map((i) => (
          <span key={i} className={`welcome-orb welcome-orb-${i}`} />
        ))}
      </div>
      <img src={logo} alt="MVP Tracker" className="welcome-logo" />
      <h1>Content de te revoir</h1>
      <p className="welcome-tagline">Ton compte est lié à ce profil Valorant :</p>

      <RiotProfilePreview name={settings.name} tag={settings.tag} cardUuid={rank?.cardUuid} rank={rank} />

      <div className="riot-confirm-actions">
        <button className="riot-confirm-yes" onClick={onEnter}>
          👉 Voir mon compte
        </button>
        <button className="riot-confirm-no" onClick={onSearchOther}>
          🔍 Chercher un autre joueur
        </button>
      </div>
    </div>
  );
}

export default AccountGreeting;
