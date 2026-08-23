import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';
import { FriendAvatar, friendLabel, PROFILE_FIELDS } from './friendsShared.jsx';

function MessagesPage({ myId, onlineFriendIds = new Set(), initialFriendId = null, onConsumedInitialFriendId }) {
  const { t } = useTranslation();
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [unreadFrom, setUnreadFrom] = useState(new Set());

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef(null);
  const selectedFriendIdRef = useRef(null);
  selectedFriendIdRef.current = selectedFriendId;

  const loadFriendships = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(
        `id, status, requester_id, addressee_id,
         requester:profiles!friendships_requester_id_fkey(${PROFILE_FIELDS}),
         addressee:profiles!friendships_addressee_id_fkey(${PROFILE_FIELDS})`,
      )
      .eq('status', 'accepted')
      .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[friendships] échec du chargement :', error.message);
      setLoading(false);
      return;
    }
    setFriendships(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadFriendships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  // Écoute en temps réel les messages qui m'arrivent — ajoute au fil ouvert
  // s'il vient de la conversation affichée, sinon marque juste un point non lu.
  useEffect(() => {
    const channel = supabase
      .channel(`messages-to-${myId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${myId}` },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id === selectedFriendIdRef.current) {
            setMessages((prev) => [...prev, msg]);
          } else {
            setUnreadFrom((prev) => new Set(prev).add(msg.sender_id));
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [myId]);

  const otherProfile = (f) => (f.requester_id === myId ? f.addressee : f.requester);
  const selectedFriendship = friendships.find((f) => otherProfile(f).id === selectedFriendId);
  const selectedProfile = selectedFriendship ? otherProfile(selectedFriendship) : null;

  const openConversation = async (friendId) => {
    setSelectedFriendId(friendId);
    setUnreadFrom((prev) => {
      const next = new Set(prev);
      next.delete(friendId);
      return next;
    });
    setMessagesLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at')
      .or(
        `and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`,
      )
      .order('created_at', { ascending: true })
      .limit(300);
    if (error) console.error('[messages] échec du chargement :', error.message);
    setMessages(data ?? []);
    setMessagesLoading(false);
  };

  // N'ouvre la conversation demandée depuis la page Amis qu'une seule fois,
  // au premier montage — sans quoi revenir sur une conversation déjà changée
  // manuellement se ferait réécraser à chaque re-render.
  const initialFriendIdHandled = useRef(false);
  useEffect(() => {
    if (initialFriendIdHandled.current || !initialFriendId) return;
    initialFriendIdHandled.current = true;
    openConversation(initialFriendId);
    onConsumedInitialFriendId?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFriendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const removeFriend = async (friendshipId) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    setSelectedFriendId(null);
    loadFriendships();
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedFriendId) return;
    setDraft('');
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      sender_id: myId,
      recipient_id: selectedFriendId,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const { error } = await supabase
      .from('messages')
      .insert({ sender_id: myId, recipient_id: selectedFriendId, content });
    if (error) console.error('[messages] échec de l\'envoi :', error.message);
  };

  if (loading) return <p className="label">{t('messages.loading')}</p>;

  return (
    <div className="messages-page">
      <div className="messages-sidebar card">
        <h3>{t('messages.conversationsTitle')}</h3>
        {friendships.length === 0 ? (
          <p className="label">{t('messages.addFriendsHint')}</p>
        ) : (
          <div className="friend-list">
            {friendships.map((f) => {
              const p = otherProfile(f);
              return (
                <button
                  key={f.id}
                  className={p.id === selectedFriendId ? 'friend-list-item active' : 'friend-list-item'}
                  onClick={() => openConversation(p.id)}
                >
                  <FriendAvatar profile={p} online={onlineFriendIds.has(p.id)} />
                  <span>{friendLabel(p)}</span>
                  {unreadFrom.has(p.id) && <span className="friend-unread-dot" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="messages-thread card">
        {!selectedProfile ? (
          <div className="messages-empty">
            <p className="label">{t('messages.chooseAFriend')}</p>
          </div>
        ) : (
          <>
            <div className="messages-thread-header">
              <FriendAvatar profile={selectedProfile} size={34} online={onlineFriendIds.has(selectedProfile.id)} />
              <div className="messages-thread-header-info">
                <span>{friendLabel(selectedProfile)}</span>
                <span className="messages-thread-header-status">
                  {onlineFriendIds.has(selectedProfile.id) ? t('messages.online') : t('messages.offline')}
                </span>
              </div>
              <button
                className="messages-remove-friend"
                onClick={() => removeFriend(selectedFriendship.id)}
                title={t('friends.removeFriend')}
              >
                {t('messages.remove')}
              </button>
            </div>

            <div className="messages-thread-body">
              {messagesLoading ? (
                <p className="label">{t('messages.loading')}</p>
              ) : messages.length === 0 ? (
                <p className="label">{t('messages.noMessagesYet')}</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.sender_id === myId ? 'message-bubble mine' : 'message-bubble'}
                  >
                    {msg.content}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="messages-input-row">
              <input
                type="text"
                placeholder={t('messages.messagePlaceholder')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
              />
              <button type="submit" disabled={!draft.trim()}>
                {t('messages.send')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;
