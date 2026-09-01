import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { useE2EE } from './E2EEContext.jsx';
import Button from './ui/Button';
import logoText from '../assets/logo-text.png';

function SetNewPasswordScreen({ onDone }) {
  const { t } = useTranslation();
  const { unlockForUser } = useE2EE();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    const { data, error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // Le nouveau mot de passe vient d'être posé à l'instant, sûr de
    // régénérer la clé de messagerie si l'ancienne est devenue orpheline.
    if (data.user) unlockForUser(data.user.id, password);
    onDone();
  };

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden="true">
        <span className="auth-glow auth-glow-warm" />
        <span className="auth-glow auth-glow-cool" />
      </div>

      <div className="auth-shell">
        <img src={logoText} alt="MVP Tracker" className="auth-logo" />

        <section className="auth-card">
          <header className="auth-card-head">
            <h1>{t('auth.headings.reset')}</h1>
            <p className="auth-subtitle">{t('setNewPassword.tagline')}</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <div className="auth-field-head">
                <label className="auth-label" htmlFor="set-password">
                  {t('auth.fields.newPassword')}
                </label>
              </div>
              <input
                id="set-password"
                className="auth-input auth-input-password"
                type="password"
                placeholder={t('auth.placeholders.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                autoFocus
                required
              />
              <p className="auth-hint">{t('auth.passwordHint')}</p>
            </div>

            <div className="auth-field">
              <div className="auth-field-head">
                <label className="auth-label" htmlFor="set-password-confirm">
                  {t('auth.fields.confirmPassword')}
                </label>
              </div>
              <input
                id="set-password-confirm"
                className="auth-input auth-input-password"
                type="password"
                placeholder={t('auth.placeholders.password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              className="auth-submit"
              loading={loading}
              loadingLabel={t('auth.validating')}
            >
              {t('setNewPassword.validate')}
            </Button>
          </form>

          {error && (
            <p className="auth-alert auth-alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default SetNewPasswordScreen;
