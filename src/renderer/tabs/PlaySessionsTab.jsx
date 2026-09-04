import PlaySessions from '../sessions/PlaySessions.jsx';

function PlaySessionsTab({ settings, matches, apiKey }) {
  return <PlaySessions settings={settings} matches={matches} apiKey={apiKey} />;
}

export default PlaySessionsTab;
