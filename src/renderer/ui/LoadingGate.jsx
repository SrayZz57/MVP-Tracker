import useLoadingGate from '../hooks/useLoadingGate.js';

function LoadingGate({ active, fallback = null, children }) {
  const gate = useLoadingGate(active);
  if (gate.busy) return gate.show ? fallback : null;
  return <>{children}</>;
}

export default LoadingGate;
