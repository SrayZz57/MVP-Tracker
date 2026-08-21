import { useState } from 'react';
import { supabase } from './supabaseClient.js';

function SetNewPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onDone();
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-bg" aria-hidden="true">
        <span className="welcome-orb welcome-orb-1" />
        <span className="welcome-orb welcome-orb-2" />
        <span className="welcome-orb welcome-orb-3" />
        <span className="welcome-orb welcome-orb-4" />
        <span className="welcome-orb welcome-orb-5" />
        <span className="welcome-orb welcome-orb-6" />
        <span className="welcome-orb welcome-orb-7" />
      </div>

      <h1>MVP Tracker</h1>
      <p className="welcome-tagline">Choisis ton nouveau mot de passe.</p>

      <form className="account-auth-form" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          autoFocus
          required
        />
        <input
          type="password"
          placeholder="Confirme le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Validation...' : 'Valider le nouveau mot de passe'}
        </button>
      </form>

      {error && <p className="warning">{error}</p>}
    </div>
  );
}

export default SetNewPasswordScreen;
