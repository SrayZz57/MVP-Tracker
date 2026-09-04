import CompositionBuilder from '../strategy/CompositionBuilder.jsx';

function CompositionTab({ settings, matches, mySettings, myMatches, myId, isAdmin }) {
  return (
    <CompositionBuilder
      settings={settings}
      matches={matches}
      mySettings={mySettings}
      myMatches={myMatches}
      myId={myId}
      isAdmin={isAdmin}
    />
  );
}

export default CompositionTab;
