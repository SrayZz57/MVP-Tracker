import { supabase } from './supabaseClient.js';

// Scores de l'Aim Trainer, par mode. Deux usages distincts :
//  - le record PERSONNEL (meilleur score de l'utilisateur sur ce mode)
//  - le record GÉNÉRAL de l'app (meilleur score tous utilisateurs confondus)
// Les lignes sont donc lisibles par tout le monde, mais chacun ne peut
// écrire que les siennes (voir les règles RLS de la table).

export async function saveScore(userId, { mode, score, accuracy, hits, misses, duration, avgReaction }) {
  if (!userId) {
    console.error('[aim_trainer_scores] aucun utilisateur : score non enregistré');
    return { ok: false, reason: 'no-user' };
  }
  const { error } = await supabase.from('aim_trainer_scores').insert({
    user_id: userId,
    mode,
    score,
    accuracy,
    hits,
    misses,
    duration,
    avg_reaction: avgReaction,
  });
  if (error) {
    console.error("[aim_trainer_scores] échec de l'enregistrement :", error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

// Meilleur score de l'utilisateur pour chaque mode, en une seule requête.
export async function loadPersonalBests(userId) {
  if (!userId) return {};
  const { data, error } = await supabase
    .from('aim_trainer_scores')
    .select('mode, score')
    .eq('user_id', userId)
    .order('score', { ascending: false });
  if (error) {
    console.error('[aim_trainer_scores] échec de la lecture des records perso :', error.message);
    return {};
  }
  const bests = {};
  (data ?? []).forEach((row) => {
    if (bests[row.mode] === undefined) bests[row.mode] = row.score;
  });
  return bests;
}

// Meilleur score de TOUS les joueurs pour chaque mode. `global_best` est une
// vue côté base : elle ne renvoie que le maximum par mode, jamais la liste
// des scores individuels des autres joueurs.
export async function loadGlobalBests() {
  const { data, error } = await supabase.from('aim_trainer_global_bests').select('mode, best_score');
  if (error) {
    console.error('[aim_trainer_scores] échec de la lecture des records globaux :', error.message);
    return {};
  }
  const bests = {};
  (data ?? []).forEach((row) => {
    bests[row.mode] = row.best_score;
  });
  return bests;
}
