import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { useE2EE } from './E2EEContext.jsx';
import Button from './ui/Button';
import logoText from '../assets/logo-text.png';

function Field({ id, label, action, hint, children }) {
  return (
    <div className="auth-field">
      <div className="auth-field-head">
        <label className="auth-label" htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="auth-hint">{hint}</p>}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, action, hint }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label={label} action={action} hint={hint}>
      <div className="auth-input-wrap">
        <input
          id={id}
          className="auth-input auth-input-password"
          type={visible ? 'text' : 'password'}
          placeholder={t('auth.placeholders.password')}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={6}
          required
        />
        <button
          type="button"
          className="auth-reveal"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
}

function AccountAuth() {
  const { t } = useTranslation();
  const { unlockForUser } = useE2EE();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
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

    // Une faute de frappe dans l'email rend le compte inconfirmable, le mail
    // de validation partant dans le vide.
    if (mode === 'signup') {
      if (email !== confirmEmail) {
        setError(t('auth.emailMismatch'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch'));
        return;
      }
    }

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
    // Sinon une confirmation tapée à l'inscription se retrouve pré-remplie
    // dans le formulaire de réinitialisation.
    setConfirmEmail('');
    setConfirmPassword('');
  };

  const subtitle = { forgot: t('auth.subtitles.forgot'), reset: t('auth.subtitles.reset') }[mode];

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden="true">
        <span className="auth-glow auth-glow-warm" />
        <span className="auth-glow auth-glow-cool" />
      </div>

      <div className="auth-shell">
        <img src={logoText} alt="MVP Tracker" className="auth-logo" />

        {/* key : chaque bascule rejoue l'apparition et remet le focus sur le
            premier champ. */}
        <section className="auth-card" key={mode}>
          <header className="auth-card-head">
            <h1>{t(`auth.headings.${mode}`)}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </header>

          {(mode === 'signin' || mode === 'signup') && (
            <form className="auth-form" onSubmit={handleSubmit}>
              <Field id="auth-email" label={t('auth.fields.email')}>
                <input
                  id="auth-email"
                  className="auth-input"
                  type="email"
                  placeholder={t('auth.placeholders.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </Field>
              {mode === 'signup' && (
                <Field id="auth-confirm-email" label={t('auth.fields.confirmEmail')}>
                  <input
                    id="auth-confirm-email"
                    className="auth-input"
                    type="email"
                    placeholder={t('auth.placeholders.email')}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </Field>
              )}
              <PasswordField
                id="auth-password"
                label={t('auth.fields.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                hint={mode === 'signup' ? t('auth.passwordHint') : null}
                action={
                  mode === 'signin' ? (
                    <button type="button" className="auth-link auth-link-sm" onClick={() => switchMode('forgot')}>
                      {t('auth.forgotPassword')}
                    </button>
                  ) : null
                }
              />
              {mode === 'signup' && (
                <PasswordField
                  id="auth-signup-confirm-password"
                  label={t('auth.fields.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              )}
              <Button
                variant="primary"
                type="submit"
                className="auth-submit"
                loading={loading}
                loadingLabel={t('auth.loading')}
              >
                {mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}
              </Button>
            </form>
          )}

          {mode === 'forgot' && (
            <form className="auth-form" onSubmit={handleSendReset}>
              <Field id="auth-forgot-email" label={t('auth.fields.email')}>
                <input
                  id="auth-forgot-email"
                  className="auth-input"
                  type="email"
                  placeholder={t('auth.placeholders.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </Field>
              <Button
                variant="primary"
                type="submit"
                className="auth-submit"
                loading={loading}
                loadingLabel={t('auth.sending')}
              >
                {t('auth.sendCode')}
              </Button>
            </form>
          )}

          {mode === 'reset' && (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <Field id="auth-code" label={t('auth.fields.code')}>
                <input
                  id="auth-code"
                  className="auth-input auth-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t('auth.placeholders.code')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </Field>
              <PasswordField
                id="auth-new-password"
                label={t('auth.fields.newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                hint={t('auth.passwordHint')}
              />
              <PasswordField
                id="auth-confirm-password"
                label={t('auth.fields.confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Button
                variant="primary"
                type="submit"
                className="auth-submit"
                loading={loading}
                loadingLabel={t('auth.validating')}
              >
                {t('auth.resetPassword')}
              </Button>
            </form>
          )}

          {error && (
            <p className="auth-alert auth-alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </p>
          )}
          {info && (
            <p className="auth-alert auth-alert-info">
              <CheckCircle2 size={16} />
              <span>{info}</span>
            </p>
          )}

          <footer className="auth-card-foot">
            {mode === 'signin' && (
              <>
                {t('auth.switch.signupPrompt')}{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                  {t('auth.switch.signupAction')}
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                {t('auth.switch.signinPrompt')}{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                  {t('auth.switch.signinAction')}
                </button>
              </>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <button type="button" className="auth-link auth-back" onClick={() => switchMode('signin')}>
                <ArrowLeft size={14} />
                {t('auth.backToSignin')}
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}

export default AccountAuth;
