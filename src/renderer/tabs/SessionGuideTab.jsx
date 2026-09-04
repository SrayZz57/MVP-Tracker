import SessionGuide from '../sessions/SessionGuide.jsx';

function SessionGuideTab({ settings, matches, loading }) {
  return <SessionGuide settings={settings} matches={matches} loading={loading} />;
}

export default SessionGuideTab;
