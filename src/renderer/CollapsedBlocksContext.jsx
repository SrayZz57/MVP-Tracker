import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const CollapsedBlocksContext = createContext(null);

// Liste des blocs réduits (voir CollapsibleCard.jsx), chargée une fois au
// démarrage pour le compte LIÉ (scopée côté main.js comme les objectifs/la
// collection de skins) et tenue à jour localement à chaque bascule, pour que
// chaque carte de l'app puisse lire/modifier cet état sans prop-drilling.
export function CollapsedBlocksProvider({ children }) {
  const [collapsed, setCollapsed] = useState(new Set());

  const refresh = useCallback(() => {
    window.electronAPI.getCollapsedBlocks().then((ids) => setCollapsed(new Set(ids)));
  }, []);

  // Chargé au montage ET rappelé depuis App.jsx une fois le compte lié
  // réellement connu (voir son effet sur `profile?.riot_puuid`), au
  // démarrage, ce puuid part de `null` le temps que le profil Supabase soit
  // rechargé, ce qui vide `linkedAccountPuuid` côté main.js entre-temps. Un
  // chargement une seule fois au montage pouvait donc tomber pile dans cette
  // fenêtre et lire "aucun bloc réduit" alors que les vraies données
  // persistées existaient déjà sous le bon compte, d'où les blocs qui
  // semblaient "oublier" leur état réduit après un redémarrage.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    window.electronAPI.toggleCollapsedBlock(id);
  }, []);

  return (
    <CollapsedBlocksContext.Provider value={{ collapsed, toggle, refresh }}>{children}</CollapsedBlocksContext.Provider>
  );
}

export function useCollapsedBlocks() {
  const ctx = useContext(CollapsedBlocksContext);
  if (!ctx) throw new Error('useCollapsedBlocks doit être utilisé sous CollapsedBlocksProvider');
  return ctx;
}
