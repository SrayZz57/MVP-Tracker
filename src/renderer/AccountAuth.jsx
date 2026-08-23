import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';

function AccountAuth() {
  const { t } = useTranslation();
  const TITLES = {
    signin: t('auth.titles.signin'),
    signup: t('auth.titles.signup'),
    forgot: t('auth.titles.forgot'),
    reset: t('auth.titles.reset'),
  };
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
      setInfo(t('auth.signupSuccess'));
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
    setInfo(t('auth.resetEmailSent'));
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    resetMessages();
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
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
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? t('auth.loading') : mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form className="account-auth-form" onSubmit={handleSendReset}>
          <input
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? t('auth.sending') : t('auth.sendCode')}
          </button>
        </form>
      )}

      {mode === 'reset' && (
        <form className="account-auth-form" onSubmit={handleResetPassword}>
          <input
            type="text"
            inputMode="numeric"
            placeholder={t('auth.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('auth.newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? t('auth.validating') : t('auth.resetPassword')}
          </button>
        </form>
      )}

      {error && <p className="warning">{error}</p>}
      {info && <p className="label">{info}</p>}

      {mode === 'signin' && (
        <button type="button" className="account-auth-switch" onClick={() => switchMode('forgot')}>
          {t('auth.forgotPassword')}
        </button>
      )}

      {(mode === 'forgot' || mode === 'reset') && (
        <button type="button" className="account-auth-switch" onClick={() => switchMode('signin')}>
          {t('auth.backToSignin')}
        </button>
      )}

      {(mode === 'signin' || mode === 'signup') && (
        <button
          type="button"
          className="account-auth-switch"
          onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? t('auth.alreadyHaveAccount') : t('auth.noAccountYet')}
        </button>
      )}
    </div>
  );
}

export default AccountAuth;
