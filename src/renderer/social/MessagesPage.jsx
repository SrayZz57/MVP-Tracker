import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { supabase } from '../account/supabaseClient.js';
import Icon from '../ui/Icon.jsx';
import { FriendAvatar, friendLabel, PROFILE_FIELDS } from './friendsShared.jsx';
import FriendSummaryCard from './FriendSummaryCard.jsx';
import { useE2EE } from './E2EEContext.jsx';
import Button from '../ui/Button';
import { MessagesPageSkeleton, MessageThreadShape } from '../ui/skeletons.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import useLoadingGate from '../hooks/useLoadingGate.js';
import LoadingGate from '../ui/LoadingGate.jsx';

function UnlockMessagingForm({ myId }) {
  const { t } = useTranslation();
  const { unlockForUser } = useE2EE();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await unlockForUser(myId, password, { allowRegenerate: false });
    } catch {
      setError(t('messages.unlockWrongPassword'));
    }
    setLoading(false);
  };

  return (
    <div className="messages-unlock">
      <div className="messages-unlock-card card">
        <span className="messages-unlock-icon"><Icon icon={Lock} size={22} /></span>
        <h3>{t('messages.unlockTitle')}</h3>
        <p className="messages-unlock-hint">{t('messages.unlockHint')}</p>
        <form onSubmit={handleSubmit} className="messages-unlock-form">
          <label htmlFor="messaging-password">{t('messages.unlockPasswordLabel')}</label>
          <input
            id="messaging-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'messaging-password-error' : undefined}
            autoFocus
            required
          />
          {error && (
            <p className="messages-unlock-error" id="messaging-password-error" role="alert">
              {error}
            </p>
          )}
          <Button variant="primary" type="submit" loading={loading} loadingLabel={t('auth.loading')}>
            {t('messages.unlockButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessagesPage({ myId, onlineFriendIds = new Set(), initialFriendId = null, onConsumedInitialFriendId, apiKey }) {
  const { t } = useTranslation();
  const { ready: keysReady, encryptFor, decryptFrom } = useE2EE();
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [unreadFrom, setUnreadFrom] = useState(new Set());
  const [friendPreviews, setFriendPreviews] = useState({});

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

  useEffect(() => {
    if (!apiKey || !selectedProfile || friendPreviews[selectedProfile.id] !== undefined) return;
    window.electronAPI
      .previewRiotAccount({ name: selectedProfile.riot_name, tag: selectedProfile.riot_tag, apiKey })
      .then((preview) => setFriendPreviews((prev) => ({ ...prev, [selectedProfile.id]: preview })))
      .catch(() => setFriendPreviews((prev) => ({ ...prev, [selectedProfile.id]: null })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfile?.id, apiKey]);

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
      .select('id, sender_id, recipient_id, content, nonce, created_at')
      .or(
        `and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`,
      )
      .order('created_at', { ascending: true })
      .limit(300);
    if (error) console.error('[messages] échec du chargement :', error.message);
    setMessages(data ?? []);
    setMessagesLoading(false);
  };

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
    const text = draft.trim();
    if (!text || !selectedFriendId || !selectedProfile?.public_key) return;
    const encrypted = encryptFor(selectedProfile.public_key, text);
    if (!encrypted) return;
    setDraft('');
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      sender_id: myId,
      recipient_id: selectedFriendId,
      content: encrypted.ciphertext,
      nonce: encrypted.nonce,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const { error } = await supabase
      .from('messages')
      .insert({ sender_id: myId, recipient_id: selectedFriendId, content: encrypted.ciphertext, nonce: encrypted.nonce });
    if (error) console.error('[messages] échec de l\'envoi :', error.message);
  };

  const decryptedMessages = useMemo(() => {
    if (!selectedProfile?.public_key) return [];
    return messages.map((msg) => ({
      ...msg,
      text: !msg.nonce
        ? msg.content
        : keysReady
          ? (decryptFrom(selectedProfile.public_key, msg.content, msg.nonce) ?? t('messages.decryptFailed'))
          : '…',
    }));
  }, [messages, selectedProfile, keysReady, decryptFrom, t]);

  const loadingGate = useLoadingGate(loading);
  if (loadingGate.busy) return loadingGate.show ? <MessagesPageSkeleton /> : null;
  if (!keysReady) return <UnlockMessagingForm myId={myId} />;

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
                <Button
                  variant="ghost"
                  key={f.id}
                  className={p.id === selectedFriendId ? 'friend-list-item active' : 'friend-list-item'}
                  onClick={() => openConversation(p.id)}
                >
                  <FriendAvatar profile={p} online={onlineFriendIds.has(p.id)} />
                  <span>{friendLabel(p)}</span>
                  {unreadFrom.has(p.id) && <span className="friend-unread-dot" />}
                </Button>
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
              <Button
                variant="danger"
                className="messages-remove-friend"
                onClick={() => removeFriend(selectedFriendship.id)}
                title={t('friends.removeFriend')}
              >
                {t('messages.remove')}
              </Button>
            </div>

            <div className="messages-thread-body">
              <LoadingGate
                active={messagesLoading}
                fallback={<Skeleton><MessageThreadShape rows={5} /></Skeleton>}
              >
                {messages.length === 0 ? (
                  <p className="label">{t('messages.noMessagesYet')}</p>
                ) : (
                  decryptedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={msg.sender_id === myId ? 'message-bubble mine' : 'message-bubble'}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
              </LoadingGate>
              <div ref={messagesEndRef} />
            </div>

            {selectedProfile.public_key ? (
              <form onSubmit={handleSend} className="messages-input-row">
                <input
                  type="text"
                  placeholder={t('messages.messagePlaceholder')}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                />
                <Button variant="primary" type="submit" disabled={!draft.trim()}>
                  {t('messages.send')}
                </Button>
              </form>
            ) : (
              <p className="label messages-no-key-hint">{t('messages.friendNoKeyYet')}</p>
            )}
          </>
        )}
      </div>

      {selectedProfile && (
        <div className="messages-friend-panel card">
          <FriendSummaryCard
            profile={selectedProfile}
            preview={friendPreviews[selectedProfile.id]}
            online={onlineFriendIds.has(selectedProfile.id)}
          />
        </div>
      )}
    </div>
  );
}

export default MessagesPage;
