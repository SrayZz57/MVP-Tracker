import SearchBar from './SearchBar.jsx';
import logo from '../assets/logo.png';

function WelcomeScreen({ onSaved }) {
  return (
    <div className="welcome-screen">
      <img src={logo} alt="MVP Tracker" className="welcome-logo" />
      <h1>MVP Tracker</h1>
      <p className="welcome-tagline">Le tracker de stats Valorant qui va plus loin que les autres.</p>
      <SearchBar onSearch={onSaved} />
    </div>
  );
}

export default WelcomeScreen;
