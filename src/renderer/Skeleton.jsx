// Squelette de chargement générique — quelques barres qui pulsent, à la
// place d'un simple texte "Chargement..." pendant qu'une requête tourne.
function Skeleton({ lines = 3 }) {
  return (
    <div className="skeleton-block">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

export default Skeleton;
