import SearchBar from './SearchBar.jsx';
import logo from '../assets/logo.png';

function WelcomeScreen({ onSaved, apiKey }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-bg" aria-hidden="true">
        <span className="welcome-orb welcome-orb-1" />
        <span className="welcome-orb welcome-orb-2" />
        <span className="welcome-orb welcome-orb-3" />
        <span className="welcome-orb welcome-orb-4" />
        <span className="welcome-orb welcome-orb-5" />
        <span className="welcome-orb welcome-orb-6" />
        <span className="welcome-orb welcome-orb-7" />
      </div>
      <img src={logo} alt="MVP Tracker" className="welcome-logo" />
      <h1>MVP Tracker</h1>
      <p className="welcome-tagline">
        Cherche un joueur — toi-même ou n'importe qui d'autre. Ça ne change rien à ton compte, c'est juste pour
        consulter un tracker.
      </p>
      <SearchBar initialSettings={{ apiKey }} onSearch={onSaved} />
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
    </div>
  );
}

export default WelcomeScreen;
