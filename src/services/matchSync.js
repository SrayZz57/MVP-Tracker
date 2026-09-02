import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabaseConfig.js';
import { findMe, resultLabel, matchScore } from '../renderer/valorantStats.js';

const brotliCompress = promisify(zlib.brotliCompress);

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
    global: { headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY } },
    auth: { persistSession: false },
  });
}

function storageHeaders(accessToken, extra = {}) {
  return { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY, ...extra };
}

async function uploadToStorage(accessToken, path, buffer) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: storageHeaders(accessToken, { 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' }),
    body: buffer,
  });
  if (!res.ok) throw new Error(`storage upload ${res.status}: ${await res.text()}`);
}

async function removeFromStorage(accessToken, paths) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}`, {
    method: 'DELETE',
    headers: storageHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) throw new Error(`storage remove ${res.status}: ${await res.text()}`);
}

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
    let detailFailures = 0;
    for (const match of toSummarize) {
      const matchId = match.metadata.matchid;
      const me = findMe(match, name, tag);
      const wantsDetail = detailWanted.has(matchId);
      const alreadyHasDetail = existingWithDetail.has(matchId);
      let uploadedDetail = alreadyHasDetail;

      if (wantsDetail && !alreadyHasDetail) {
        try {
          const compressed = await brotliCompress(Buffer.from(JSON.stringify(match)), {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
          });
          await uploadToStorage(accessToken, `${userId}/${matchId}.json.br`, compressed);
          uploadedDetail = true;
        } catch {
          detailFailures += 1;
        }
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
        has_full_detail: uploadedDetail,
      });
    }

    if (rows.length > 0) {
      const { error: upsertError } = await client
        .from('match_summaries')
        .upsert(rows, { onConflict: 'match_id,user_id' });
      if (upsertError) throw upsertError;
    }

    const keptIds = new Set(rows.map((r) => r.match_id));
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));

    if (toDelete.length > 0) {
      const toDeletePaths = toDelete.filter((id) => existingWithDetail.has(id)).map((id) => `${userId}/${id}.json.br`);
      if (toDeletePaths.length > 0) {
        try {
          await removeFromStorage(accessToken, toDeletePaths);
        } catch {}
      }
      await client.from('match_summaries').delete().eq('user_id', userId).in('match_id', toDelete);
    }

    return { synced: rows.length, deleted: toDelete.length, detailFailures };
  } catch (err) {
    return { error: err.message };
  }
}
