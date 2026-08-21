import { useState } from 'react';
import { supabase } from './supabaseClient.js';

const TITLES = {
  signin: 'Connecte-toi à ton compte.',
  signup: 'Crée ton compte pour commencer.',
  forgot: 'Réinitialise ton mot de passe.',
  reset: 'Entre le code reçu par mail et ton nouveau mot de passe.',
};

function AccountAuth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
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

  const handleSendReset = async (event) => {
    event.preventDefault();
    resetMessages();
    setLoading(true);
    // Un seul email envoyé, deux façons de l'utiliser ensuite : cliquer le
    // lien (rouvre directement l'app via mvptracker://, mais seulement sur ce
    // PC) ou taper le code à 6 chiffres qu'il contient (marche depuis
    // n'importe quel appareil où le mail est lu).
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'mvptracker://reset-password',
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMode('reset');
    setInfo('Email envoyé — clique le lien qu\'il contient (sur ce PC), ou tape le code ci-dessous.');
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    resetMessages();
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' });
    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // onAuthStateChange (App.jsx) prend le relais — la session est déjà active.
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetMessages();
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
      <p className="welcome-tagline">{TITLES[mode]}</p>

      {(mode === 'signin' || mode === 'signup') && (
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
      )}

      {mode === 'forgot' && (
        <form className="account-auth-form" onSubmit={handleSendReset}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le code / lien'}
          </button>
        </form>
      )}

      {mode === 'reset' && (
        <form className="account-auth-form" onSubmit={handleResetPassword}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Code reçu par mail"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
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
            {loading ? 'Validation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      )}

      {error && <p className="warning">{error}</p>}
      {info && <p className="label">{info}</p>}

      {mode === 'signin' && (
        <button type="button" className="account-auth-switch" onClick={() => switchMode('forgot')}>
          Mot de passe oublié ?
        </button>
      )}

      {(mode === 'forgot' || mode === 'reset') && (
        <button type="button" className="account-auth-switch" onClick={() => switchMode('signin')}>
          ← Retour à la connexion
        </button>
      )}

      {(mode === 'signin' || mode === 'signup') && (
        <button
          type="button"
          className="account-auth-switch"
          onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
        </button>
      )}
    </div>
  );
}

export default AccountAuth;
