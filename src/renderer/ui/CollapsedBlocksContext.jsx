import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const CollapsedBlocksContext = createContext(null);

export function CollapsedBlocksProvider({ children }) {
  const [collapsed, setCollapsed] = useState(new Set());

  const refresh = useCallback(() => {
    window.electronAPI.getCollapsedBlocks().then((ids) => setCollapsed(new Set(ids)));
  }, []);

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
