import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';
import { FriendAvatar, friendLabel, PROFILE_FIELDS } from './friendsShared.jsx';
import FriendSummaryModal from './FriendSummaryModal.jsx';

function FriendsPage({ myId, onlineFriendIds = new Set(), onOpenConversation, apiKey }) {
  const { t } = useTranslation();
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  // Aperçu (rang, niveau) de chaque ami — chargé à part des `friendships` :
  // c'est un appel HenrikDev en direct (comme rechercher n'importe quel Riot
  // ID public), pas une donnée stockée, donc on la garde en cache local plutôt
  // que de la refaire à chaque re-render.
  const [friendPreviews, setFriendPreviews] = useState({});
  const [openSummaryFor, setOpenSummaryFor] = useState(null);

  const [searchName, setSearchName] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [searchResult, setSearchResult] = useState(undefined); // undefined = pas cherché, null = introuvable
  const [searching, setSearching] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const loadFriendships = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(
        `id, status, requester_id, addressee_id,
         requester:profiles!friendships_requester_id_fkey(${PROFILE_FIELDS}),
         addressee:profiles!friendships_addressee_id_fkey(${PROFILE_FIELDS})`,
      )
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

  const accepted = useMemo(() => friendships.filter((f) => f.status === 'accepted'), [friendships]);
  const incomingPending = useMemo(
    () => friendships.filter((f) => f.status === 'pending' && f.addressee_id === myId),
    [friendships, myId],
  );
  const outgoingPending = useMemo(
    () => friendships.filter((f) => f.status === 'pending' && f.requester_id === myId),
    [friendships, myId],
  );

  const otherProfile = (f) => (f.requester_id === myId ? f.addressee : f.requester);

  useEffect(() => {
    if (!apiKey) return;
    accepted.forEach((f) => {
      const p = otherProfile(f);
      if (!p || friendPreviews[p.id] !== undefined) return;
      window.electronAPI
        .previewRiotAccount({ name: p.riot_name, tag: p.riot_tag, apiKey })
        .then((preview) => setFriendPreviews((prev) => ({ ...prev, [p.id]: preview })))
        .catch(() => setFriendPreviews((prev) => ({ ...prev, [p.id]: null })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accepted, apiKey]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearching(true);
    setSearchResult(undefined);
    setRequestSent(false);
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .ilike('riot_name', searchName.trim())
      .eq('riot_tag', searchTag.trim())
      .neq('id', myId)
      .maybeSingle();
    if (error) console.error('[profiles] échec de la recherche :', error.message);
    setSearchResult(data ?? null);
    setSearching(false);
  };

  const sendFriendRequest = async () => {
    if (!searchResult) return;
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: myId, addressee_id: searchResult.id, status: 'pending' });
    if (error) {
      console.error('[friendships] échec de la demande :', error.message);
      return;
    }
    setRequestSent(true);
    loadFriendships();
  };

  const respondToRequest = async (friendshipId, accept) => {
    if (accept) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    } else {
      await supabase.from('friendships').delete().eq('id', friendshipId);
    }
    loadFriendships();
  };

  const cancelRequest = async (friendshipId) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    loadFriendships();
  };

  const removeFriend = async (friendshipId) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    loadFriendships();
  };

  if (loading) return <p className="label">{t('friends.loading')}</p>;

  return (
    <div className="friends-page">
      <div className="card">
        <h3>{t('friends.addFriendTitle')}</h3>
        <form onSubmit={handleSearch} className="friend-search-form">
          <div className="search-bar-riotid">
            <input placeholder={t('friends.usernamePlaceholder')} value={searchName} onChange={(e) => setSearchName(e.target.value)} required />
            <span className="search-bar-hash">#</span>
            <input
              placeholder={t('friends.tagPlaceholder')}
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              required
              className="search-bar-tag"
            />
          </div>
          <button type="submit" disabled={searching}>
            {searching ? '...' : '🔍'}
          </button>
        </form>
        {searchResult === null && <p className="label">{t('friends.noPlayerFound')}</p>}
        {searchResult && (
          <div className="friend-search-result">
            <FriendAvatar profile={searchResult} size={32} />
            <span>{friendLabel(searchResult)}</span>
            {requestSent ? (
              <span className="label">{t('friends.requestSent')}</span>
            ) : (
              <button onClick={sendFriendRequest}>{t('friends.add')}</button>
            )}
          </div>
        )}
      </div>

      {incomingPending.length > 0 && (
        <div className="card">
          <h3>{t('friends.incomingRequests')}</h3>
          <div className="friend-list">
            {incomingPending.map((f) => (
              <div key={f.id} className="friend-request-row">
                <FriendAvatar profile={otherProfile(f)} size={36} />
                <span>{friendLabel(otherProfile(f))}</span>
                <div className="friend-request-actions">
                  <button onClick={() => respondToRequest(f.id, true)} title={t('friends.accept')}>✓</button>
                  <button onClick={() => respondToRequest(f.id, false)} title={t('friends.decline')}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoingPending.length > 0 && (
        <div className="card">
          <h3>{t('friends.outgoingRequests')}</h3>
          <div className="friend-list">
            {outgoingPending.map((f) => (
              <div key={f.id} className="friend-request-row">
                <FriendAvatar profile={otherProfile(f)} size={36} />
                <span>{friendLabel(otherProfile(f))}</span>
                <button onClick={() => cancelRequest(f.id)} title={t('friends.cancel')}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>{t('friends.friendsCount', { count: accepted.length })}</h3>
        {accepted.length === 0 ? (
          <p className="label">{t('friends.noFriendsYet')}</p>
        ) : (
          <div className="friend-list">
            {accepted.map((f) => {
              const p = otherProfile(f);
              return (
                <div key={f.id} className="friend-request-row">
                  <button
                    className="friend-avatar-button"
                    title={t('friends.viewProfile')}
                    onClick={() => setOpenSummaryFor(p)}
                  >
                    <FriendAvatar profile={p} size={36} online={onlineFriendIds.has(p.id)} />
                  </button>
                  <span>{friendLabel(p)}</span>
                  <div className="friend-request-actions friend-request-actions-lg">
                    <button onClick={() => onOpenConversation(p.id)} title={t('friends.sendMessage')}>💬</button>
                    <button onClick={() => removeFriend(f.id)} title={t('friends.removeFriend')}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openSummaryFor && (
        <FriendSummaryModal
          profile={openSummaryFor}
          preview={friendPreviews[openSummaryFor.id]}
          online={onlineFriendIds.has(openSummaryFor.id)}
          onClose={() => setOpenSummaryFor(null)}
        />
      )}
    </div>
  );
}

export default FriendsPage;
