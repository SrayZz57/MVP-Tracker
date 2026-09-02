import CompositionBuilder from '../CompositionBuilder.jsx';

function CompositionTab({ settings, matches, mySettings, myMatches, myId }) {
  return (
    <CompositionBuilder
      settings={settings}
      matches={matches}
      mySettings={mySettings}
      myMatches={myMatches}
      myId={myId}
    />
  );
}

export default CompositionTab;
