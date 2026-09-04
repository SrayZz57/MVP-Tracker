import { useEffect, useRef, useState } from 'react';

export const LOADING_SHOW_DELAY_MS = 150;
export const LOADING_MIN_VISIBLE_MS = 420;

export default function useLoadingGate(
  active,
  { delay = LOADING_SHOW_DELAY_MS, minVisible = LOADING_MIN_VISIBLE_MS } = {},
) {
  const [show, setShow] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (active) {
      if (show) return undefined;
      const id = setTimeout(() => {
        shownAt.current = Date.now();
        setShow(true);
      }, delay);
      return () => clearTimeout(id);
    }
    if (!show) return undefined;
    const remaining = shownAt.current + minVisible - Date.now();
    if (remaining <= 0) {
      setShow(false);
      return undefined;
    }
    const id = setTimeout(() => setShow(false), remaining);
    return () => clearTimeout(id);
  }, [active, show, delay, minVisible]);

  return { show, busy: active || show };
}
