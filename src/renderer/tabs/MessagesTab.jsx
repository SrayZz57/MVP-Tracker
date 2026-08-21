import MessagesPage from '../MessagesPage.jsx';

function MessagesTab({ myId, onlineFriendIds, initialFriendId, onConsumedInitialFriendId }) {
  return (
    <MessagesPage
      myId={myId}
      onlineFriendIds={onlineFriendIds}
      initialFriendId={initialFriendId}
      onConsumedInitialFriendId={onConsumedInitialFriendId}
    />
  );
}

export default MessagesTab;
