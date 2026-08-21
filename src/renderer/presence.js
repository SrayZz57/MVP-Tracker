import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

// Un seul canal partagé "qui est en ligne" — chaque client s'y annonce
// (track) et écoute la liste à jour des présents (sync). Pas de table ni de
// polling : Supabase Realtime Presence gère ça nativement.
export function useOnlinePresence(myId) {
  const [onlineIds, setOnlineIds] = useState(new Set());

  useEffect(() => {
    if (!myId) return undefined;

    const channel = supabase.channel('online-users', { config: { presence: { key: myId } } });

    channel.on('presence', { event: 'sync' }, () => {
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => supabase.removeChannel(channel);
  }, [myId]);

  return onlineIds;
}
