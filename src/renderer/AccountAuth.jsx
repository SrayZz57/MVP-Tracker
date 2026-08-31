import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';
import { useE2EE } from './E2EEContext.jsx';
import Button from './ui/Button';
import logoText from '../assets/logo-text.png';

function AccountAuth() {
  const { t } = useTranslation();
  const { unlockForUser } = useE2EE();
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

    const { data, error: authError } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === 'signup' && !data.session) {
      // Confirmation par email requise avant toute session active, la clé
      // de messagerie sera créée à la vraie première connexion (une fois la
      // session active, le mot de passe redevient disponible ici).
      setInfo(t('auth.signupSuccess'));
      return;
    }

    // Supabase vient de vérifier ce mot de passe lui-même (connexion ou
    // inscription à confirmation immédiate), sûr de régénérer la clé de
    // messagerie si elle est orpheline (voir E2EEContext.jsx).
    if (data.user) unlockForUser(data.user.id, password);
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
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // Le nouveau mot de passe vient d'être posé côté Supabase à l'instant,
    // sûr de régénérer la clé de messagerie (l'ancienne, enveloppée avec
    // l'ancien mot de passe, est désormais irrécupérable).
    if (updateData.user) unlockForUser(updateData.user.id, newPassword);
    // onAuthStateChange (App.jsx) prend le relais, la session est déjà active.
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

      <img src={logoText} alt="MVP Tracker" className="welcome-logo-text" />
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
          <Button variant="primary" type="submit" loading={loading} loadingLabel={t('auth.loading')}>
            {mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}
          </Button>
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
          <Button variant="primary" type="submit" loading={loading} loadingLabel={t('auth.sending')}>
            {t('auth.sendCode')}
          </Button>
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
          <Button variant="primary" type="submit" loading={loading} loadingLabel={t('auth.validating')}>
            {t('auth.resetPassword')}
          </Button>
        </form>
      )}

      {error && <p className="warning">{error}</p>}
      {info && <p className="label">{info}</p>}

      {mode === 'signin' && (
        <Button variant="ghost" type="button" className="account-auth-switch" onClick={() => switchMode('forgot')}>
          {t('auth.forgotPassword')}
        </Button>
      )}

      {(mode === 'forgot' || mode === 'reset') && (
        <Button variant="ghost" type="button" className="account-auth-switch" onClick={() => switchMode('signin')}>
          {t('auth.backToSignin')}
        </Button>
      )}

      {(mode === 'signin' || mode === 'signup') && (
        <Button
          variant="ghost"
          type="button"
          className="account-auth-switch"
          onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? t('auth.alreadyHaveAccount') : t('auth.noAccountYet')}
        </Button>
      )}
    </div>
  );
}

export default AccountAuth;
