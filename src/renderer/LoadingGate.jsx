import useLoadingGate from './useLoadingGate.js';

// `children` est déjà évalué par le parent avant d'arriver ici : un accès
// qui suppose la donnée chargée (foo.map(...)) plante même quand `active`
// est vrai. Garder les enfants derrière un test qui couvre l'état initial.
function LoadingGate({ active, fallback = null, children }) {
  const gate = useLoadingGate(active);
  if (gate.busy) return gate.show ? fallback : null;
  return <>{children}</>;
}

export default LoadingGate;
