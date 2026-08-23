import MessagesPage from '../MessagesPage.jsx';

function MessagesTab({ myId, onlineFriendIds, initialFriendId, onConsumedInitialFriendId, apiKey }) {
  return (
    <MessagesPage
      myId={myId}
      onlineFriendIds={onlineFriendIds}
      initialFriendId={initialFriendId}
      onConsumedInitialFriendId={onConsumedInitialFriendId}
      apiKey={apiKey}
    />
  );
}

export default MessagesTab;
