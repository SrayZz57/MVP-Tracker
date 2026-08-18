function LoadingState({ label = 'Récupération des données…' }) {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>{label}</p>
    </div>
  );
}

export default LoadingState;
