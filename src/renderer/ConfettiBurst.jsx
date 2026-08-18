import { useMemo } from 'react';

const COLORS = ['#ff4655', '#ffc857', '#3ddc84', '#5ac8fa', '#c77dff'];
const PIECE_COUNT = 44;

// Petit éclat de confettis déclenché quand un nouveau succès vient de se
// débloquer (voir HallOfFame.jsx) — pur CSS/JS, pas de nouvelle dépendance.
function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.6 + Math.random() * 1,
        color: COLORS[i % COLORS.length],
        drift: (Math.random() - 0.5) * 200,
      })),
    [],
  );

  return (
    <div className="confetti-burst">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.color,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export default ConfettiBurst;
