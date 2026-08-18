import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

const DURATION_MS = 700;

// Anime un nombre de sa valeur précédente vers sa nouvelle valeur au lieu de
// juste l'afficher directement — utilisé sur les chiffres "vitrine" (scores,
// points, moyennes) plutôt que partout, pour ne pas surcharger l'app de
// chiffres qui grouillent en permanence.
function CountUp({ value, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = typeof value === 'number' ? value : 0;
    if (from === to) return undefined;

    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = easeOutCubic(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [value]);

  if (typeof value !== 'number' || Number.isNaN(value)) return value;

  return `${display.toFixed(decimals)}${suffix}`;
}

export default CountUp;
