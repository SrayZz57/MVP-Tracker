import FriendsPage from '../social/FriendsPage.jsx';

function FriendsTab({ myId, onlineFriendIds, onOpenConversation, apiKey }) {
  return (
    <FriendsPage myId={myId} onlineFriendIds={onlineFriendIds} onOpenConversation={onOpenConversation} apiKey={apiKey} />
  );
}

export default FriendsTab;
