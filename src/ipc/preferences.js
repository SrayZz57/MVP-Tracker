import { ipcMain } from 'electron';

export function register({ currentPuuid, store }) {
  function scopedKey(base) {
    const puuid = currentPuuid();
    return puuid ? `${base}:${puuid}` : null;
  }

  ipcMain.handle('ui:get-collapsed-blocks', () => {
    const key = scopedKey('collapsedBlocks');
    return key ? store.get(key) || [] : [];
  });

  ipcMain.handle('ui:toggle-collapsed-block', (_event, blockId) => {
    const key = scopedKey('collapsedBlocks');
    if (!key) return [];
    const collapsed = store.get(key) || [];
    const next = collapsed.includes(blockId) ? collapsed.filter((id) => id !== blockId) : [...collapsed, blockId];
    store.set(key, next);
    return next;
  });

  ipcMain.handle('skins:get-wishlist', () => {
    const key = scopedKey('skinsWishlist');
    return key ? store.get(key) || [] : [];
  });

  ipcMain.handle('skins:toggle-wishlist', (_event, uuid) => {
    const key = scopedKey('skinsWishlist');
    if (!key) return [];
    const wishlist = store.get(key) || [];
    const next = wishlist.includes(uuid) ? wishlist.filter((id) => id !== uuid) : [...wishlist, uuid];
    store.set(key, next);
    return next;
  });

  ipcMain.handle('skins:get-collection', () => {
    const key = scopedKey('skinsCollection');
    return key ? store.get(key) || [] : [];
  });

  ipcMain.handle('skins:toggle-collection', (_event, { uuid, defaultPriceVp }) => {
    const key = scopedKey('skinsCollection');
    if (!key) return [];
    const collection = store.get(key) || [];
    const exists = collection.some((entry) => entry.uuid === uuid);
    const next = exists
      ? collection.filter((entry) => entry.uuid !== uuid)
      : [...collection, { uuid, priceVp: defaultPriceVp }];
    store.set(key, next);
    return next;
  });

  ipcMain.handle('skins:set-collection-price', (_event, { uuid, priceVp }) => {
    const key = scopedKey('skinsCollection');
    if (!key) return [];
    const collection = store.get(key) || [];
    const next = collection.map((entry) => (entry.uuid === uuid ? { ...entry, priceVp } : entry));
    store.set(key, next);
    return next;
  });

  ipcMain.handle('goals:get', () => {
    const key = scopedKey('personalGoals');
    return key ? store.get(key) || [] : [];
  });

  ipcMain.handle('goals:add', (_event, goal) => {
    const key = scopedKey('personalGoals');
    if (!key) return [];
    const goals = store.get(key) || [];
    const next = [...goals, { ...goal, id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, done: false, createdAt: Date.now() }];
    store.set(key, next);
    return next;
  });

  ipcMain.handle('goals:toggle-done', (_event, id) => {
    const key = scopedKey('personalGoals');
    if (!key) return [];
    const goals = store.get(key) || [];
    const next = goals.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal));
    store.set(key, next);
    return next;
  });

  ipcMain.handle('goals:delete', (_event, id) => {
    const key = scopedKey('personalGoals');
    if (!key) return [];
    const goals = store.get(key) || [];
    const next = goals.filter((goal) => goal.id !== id);
    store.set(key, next);
    return next;
  });
}
