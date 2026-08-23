import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar.jsx';
import ApiKeyHelp from './ApiKeyHelp.jsx';
import logo from '../assets/logo.png';

function WelcomeScreen({ onSaved, apiKey }) {
  const { t } = useTranslation();
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
      <p className="welcome-tagline">{t('welcome.tagline')}</p>
      <SearchBar initialSettings={{ apiKey }} onSearch={onSaved} />
      <ApiKeyHelp />
    </div>
  );
}

export default WelcomeScreen;
