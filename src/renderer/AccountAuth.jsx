import { useState } from 'react';
import { supabase } from './supabaseClient.js';

function AccountAuth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const { error: authError } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === 'signup') {
      setInfo('Compte créé — vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.');
    }
    // En connexion, onAuthStateChange (écouté dans App.jsx) prend le relais automatiquement.
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
      <p className="welcome-tagline">
        {mode === 'signup' ? 'Crée ton compte pour commencer.' : 'Connecte-toi à ton compte.'}
      </p>

      <form className="account-auth-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Chargement...' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>

      {error && <p className="warning">{error}</p>}
      {info && <p className="label">{info}</p>}

      <button
        type="button"
        className="account-auth-switch"
        onClick={() => {
          setMode(mode === 'signup' ? 'signin' : 'signup');
          setError(null);
          setInfo(null);
        }}
      >
        {mode === 'signup' ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
      </button>
    </div>
  );
}

export default AccountAuth;
