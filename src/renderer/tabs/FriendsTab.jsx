import FriendsPage from '../FriendsPage.jsx';

function FriendsTab({ myId, onlineFriendIds, onOpenConversation }) {
  return <FriendsPage myId={myId} onlineFriendIds={onlineFriendIds} onOpenConversation={onOpenConversation} />;
}

export default FriendsTab;
