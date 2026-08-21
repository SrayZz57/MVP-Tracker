import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { FriendAvatar, friendLabel, PROFILE_FIELDS } from './friendsShared.jsx';

function FriendsPage({ myId, onlineFriendIds = new Set(), onOpenConversation }) {
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p className="label">Chargement...</p>;

  return (
    <div className="friends-page">
      <div className="card">
        <h3>👥 Ajouter un ami</h3>
        <form onSubmit={handleSearch} className="friend-search-form">
          <div className="search-bar-riotid">
            <input placeholder="Pseudo" value={searchName} onChange={(e) => setSearchName(e.target.value)} required />
            <span className="search-bar-hash">#</span>
            <input
              placeholder="Tag"
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
        {searchResult === null && <p className="label">Aucun joueur MVP Tracker avec ce Riot ID.</p>}
        {searchResult && (
          <div className="friend-search-result">
            <FriendAvatar profile={searchResult} size={32} />
            <span>{friendLabel(searchResult)}</span>
            {requestSent ? (
              <span className="label">Demande envoyée ✓</span>
            ) : (
              <button onClick={sendFriendRequest}>Ajouter</button>
            )}
          </div>
        )}
      </div>

      {incomingPending.length > 0 && (
        <div className="card">
          <h3>📨 Demandes reçues</h3>
          <div className="friend-list">
            {incomingPending.map((f) => (
              <div key={f.id} className="friend-request-row">
                <FriendAvatar profile={otherProfile(f)} size={36} />
                <span>{friendLabel(otherProfile(f))}</span>
                <div className="friend-request-actions">
                  <button onClick={() => respondToRequest(f.id, true)} title="Accepter">✓</button>
                  <button onClick={() => respondToRequest(f.id, false)} title="Refuser">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoingPending.length > 0 && (
        <div className="card">
          <h3>📤 Demandes envoyées</h3>
          <div className="friend-list">
            {outgoingPending.map((f) => (
              <div key={f.id} className="friend-request-row">
                <FriendAvatar profile={otherProfile(f)} size={36} />
                <span>{friendLabel(otherProfile(f))}</span>
                <button onClick={() => cancelRequest(f.id)} title="Annuler">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>🤝 Amis ({accepted.length})</h3>
        {accepted.length === 0 ? (
          <p className="label">Pas encore d'amis — cherche un Riot ID ci-dessus.</p>
        ) : (
          <div className="friend-list">
            {accepted.map((f) => {
              const p = otherProfile(f);
              return (
                <div key={f.id} className="friend-request-row">
                  <FriendAvatar profile={p} size={36} online={onlineFriendIds.has(p.id)} />
                  <span>{friendLabel(p)}</span>
                  <div className="friend-request-actions">
                    <button onClick={() => onOpenConversation(p.id)} title="Envoyer un message">💬</button>
                    <button onClick={() => removeFriend(f.id)} title="Retirer cet ami">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsPage;
