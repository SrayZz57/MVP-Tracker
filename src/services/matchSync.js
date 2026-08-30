import zlib from 'node:zlib';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabaseConfig.js';
import { findMe, resultLabel, matchScore } from '../renderer/valorantStats.js';

// =============================================================================
// SYNCHRO DES MATCHS VERS SUPABASE
//
// Pense pour un futur client mobile : celui-ci ne pourra ni faire tourner le
// client Valorant (API locale inaccessible) ni embarquer une clé HenrikDev
// personnelle (risque d'extraction). Le desktop, qui a déjà tout ça, pousse
// donc ce qu'il a récupéré vers un stockage central que le mobile n'aura
// qu'à lire plus tard.
//
// Deux niveaux, pour rester dans le plan gratuit Supabase :
//   - jusqu'à 100 matchs : un résumé léger (table match_summaries)
//   - parmi eux, les 50 plus récents SEULEMENT : le JSON complet round par
//     round, compressé en Brotli (~22 Ko/match mesuré en réel, ~35x plus
//     petit que le brut), dans le bucket Storage "match-details"
//
// Toujours dans le dossier `{userId}/...` de l'utilisateur — c'est ce que
// vérifient les policies RLS posées côté Supabase, aucun autre chemin ne
// passerait de toute façon.
// =============================================================================

const SUMMARY_COUNT = 100;
const FULL_DETAIL_COUNT = 50;
const STORAGE_BUCKET = 'match-details';

const RESULT_CODES = {
  Victoire: 'win',
  Défaite: 'loss',
  'Match nul': 'draw',
  'Sans équipe': 'noteam',
};

function authedClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}

/**
 * Synchronise jusqu'à 100 matchs (résumé) dont 50 avec le détail complet.
 * `matches` : déjà triés ou non, on trie nous-mêmes par date décroissante.
 * Ne lève jamais d'exception vers l'appelant — un souci réseau ponctuel ne
 * doit pas faire échouer le rafraîchissement des matchs qui a déclenché ça.
 */
export async function syncMatches({ matches, name, tag, userId, accessToken }) {
  try {
    const client = authedClient(accessToken);

    const sorted = [...matches]
      .filter((m) => m.metadata?.matchid && m.metadata?.game_start)
      .sort((a, b) => b.metadata.game_start - a.metadata.game_start);

    const toSummarize = sorted.slice(0, SUMMARY_COUNT);
    const detailWanted = new Set(sorted.slice(0, FULL_DETAIL_COUNT).map((m) => m.metadata.matchid));

    const { data: existing, error: readError } = await client
      .from('match_summaries')
      .select('match_id, has_full_detail')
      .eq('user_id', userId);
    if (readError) throw readError;

    const existingIds = new Set((existing ?? []).map((r) => r.match_id));
    const existingWithDetail = new Set((existing ?? []).filter((r) => r.has_full_detail).map((r) => r.match_id));

    const rows = [];
    for (const match of toSummarize) {
      const matchId = match.metadata.matchid;
      const me = findMe(match, name, tag);
      const wantsDetail = detailWanted.has(matchId);
      const alreadyHasDetail = existingWithDetail.has(matchId);

      // On ne recompresse/ré-uploade jamais un match déjà présent : un match
      // terminé ne change plus, inutile de repayer le travail à chaque sync.
      if (wantsDetail && !alreadyHasDetail) {
        const compressed = zlib.brotliCompressSync(Buffer.from(JSON.stringify(match)), {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
        });
        const { error: uploadError } = await client.storage
          .from(STORAGE_BUCKET)
          .upload(`${userId}/${matchId}.json.br`, compressed, {
            contentType: 'application/octet-stream',
            upsert: true,
          });
        if (uploadError) throw uploadError;
      }

      rows.push({
        match_id: matchId,
        user_id: userId,
        game_start: new Date(match.metadata.game_start * 1000).toISOString(),
        map: match.metadata.map ?? null,
        agent: me?.character ?? null,
        mode: match.metadata.mode ?? null,
        result: RESULT_CODES[resultLabel(match, me)] ?? null,
        kills: me?.stats?.kills ?? null,
        deaths: me?.stats?.deaths ?? null,
        assists: me?.stats?.assists ?? null,
        score: matchScore(match, me),
        has_full_detail: wantsDetail || alreadyHasDetail,
      });
    }

    if (rows.length > 0) {
      const { error: upsertError } = await client
        .from('match_summaries')
        .upsert(rows, { onConflict: 'match_id,user_id' });
      if (upsertError) throw upsertError;
    }

    // Purge : ne garder que les 100 résumés (et donc, parmi eux, au plus 50
    // détails complets) les plus récents — un nouveau match en fait sortir
    // un ancien, des deux côtés (table + Storage).
    const keptIds = new Set(rows.map((r) => r.match_id));
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));

    if (toDelete.length > 0) {
      const toDeletePaths = toDelete.filter((id) => existingWithDetail.has(id)).map((id) => `${userId}/${id}.json.br`);
      if (toDeletePaths.length > 0) {
        await client.storage.from(STORAGE_BUCKET).remove(toDeletePaths);
      }
      await client.from('match_summaries').delete().eq('user_id', userId).in('match_id', toDelete);
    }

    return { synced: rows.length, deleted: toDelete.length };
  } catch (err) {
    return { error: err.message };
  }
}
