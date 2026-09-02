import { supabase } from './supabaseClient.js';

async function fetchRows(table, userId) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error(`[${table}] échec de la lecture :`, error.message);
    return [];
  }
  return data ?? [];
}

export async function loadWishlist(userId) {
  let rows = await fetchRows('skin_wishlist', userId);
  if (rows.length === 0) {
    const local = await window.electronAPI.getSkinsWishlist();
    if (local?.length > 0) {
      await supabase.from('skin_wishlist').insert(local.map((uuid) => ({ user_id: userId, skin_uuid: uuid })));
      rows = await fetchRows('skin_wishlist', userId);
    }
  }
  return rows.map((r) => r.skin_uuid);
}

export async function toggleWishlist(userId, uuid) {
  const { data: existing } = await supabase
    .from('skin_wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('skin_uuid', uuid)
    .maybeSingle();
  if (existing) {
    await supabase.from('skin_wishlist').delete().eq('id', existing.id);
  } else {
    await supabase.from('skin_wishlist').insert({ user_id: userId, skin_uuid: uuid });
  }
  const rows = await fetchRows('skin_wishlist', userId);
  return rows.map((r) => r.skin_uuid);
}

function mapCollectionRow(r) {
  return { uuid: r.skin_uuid, priceVp: r.price_vp };
}

export async function loadCollection(userId) {
  let rows = await fetchRows('skin_collection', userId);
  if (rows.length === 0) {
    const local = await window.electronAPI.getSkinsCollection();
    if (local?.length > 0) {
      await supabase
        .from('skin_collection')
        .insert(local.map((e) => ({ user_id: userId, skin_uuid: e.uuid, price_vp: e.priceVp })));
      rows = await fetchRows('skin_collection', userId);
    }
  }
  return rows.map(mapCollectionRow);
}

export async function toggleCollection(userId, uuid, defaultPriceVp) {
  const { data: existing } = await supabase
    .from('skin_collection')
    .select('id')
    .eq('user_id', userId)
    .eq('skin_uuid', uuid)
    .maybeSingle();
  if (existing) {
    await supabase.from('skin_collection').delete().eq('id', existing.id);
  } else {
    await supabase.from('skin_collection').insert({ user_id: userId, skin_uuid: uuid, price_vp: defaultPriceVp });
  }
  const rows = await fetchRows('skin_collection', userId);
  return rows.map(mapCollectionRow);
}

export async function setCollectionPrice(userId, uuid, priceVp) {
  await supabase.from('skin_collection').update({ price_vp: priceVp }).eq('user_id', userId).eq('skin_uuid', uuid);
  const rows = await fetchRows('skin_collection', userId);
  return rows.map(mapCollectionRow);
}

function mapGoalRow(r) {
  return {
    id: r.id,
    type: r.type,
    metric: r.metric,
    subject: r.subject,
    label: r.label,
    baseline: r.baseline,
    target: r.target,
    done: r.done,
  };
}

export async function loadGoals(userId) {
  let rows = await fetchRows('personal_goals', userId);
  if (rows.length === 0) {
    const local = await window.electronAPI.getGoals();
    if (local?.length > 0) {
      await supabase.from('personal_goals').insert(
        local.map((g) => ({
          user_id: userId,
          type: g.type,
          metric: g.metric ?? null,
          subject: g.subject ?? null,
          label: g.label,
          baseline: g.baseline ?? null,
          target: g.target ?? null,
          done: !!g.done,
        })),
      );
      rows = await fetchRows('personal_goals', userId);
    }
  }
  return rows.map(mapGoalRow);
}

export async function addGoal(userId, goal) {
  await supabase.from('personal_goals').insert({
    user_id: userId,
    type: goal.type,
    metric: goal.metric ?? null,
    subject: goal.subject ?? null,
    label: goal.label,
    baseline: goal.baseline ?? null,
    target: goal.target ?? null,
    done: false,
  });
  const rows = await fetchRows('personal_goals', userId);
  return rows.map(mapGoalRow);
}

export async function toggleGoalDone(userId, id) {
  const { data: row } = await supabase.from('personal_goals').select('done').eq('id', id).eq('user_id', userId).maybeSingle();
  if (row) await supabase.from('personal_goals').update({ done: !row.done }).eq('id', id);
  const rows = await fetchRows('personal_goals', userId);
  return rows.map(mapGoalRow);
}

export async function deleteGoal(userId, id) {
  await supabase.from('personal_goals').delete().eq('id', id).eq('user_id', userId);
  const rows = await fetchRows('personal_goals', userId);
  return rows.map(mapGoalRow);
}
