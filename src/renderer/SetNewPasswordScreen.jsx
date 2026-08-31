import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';
import { useE2EE } from './E2EEContext.jsx';
import Button from './ui/Button';

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
    // Le nouveau mot de passe vient d'être posé à l'instant — sûr de
    // régénérer la clé de messagerie si l'ancienne est devenue orpheline.
    if (data.user) unlockForUser(data.user.id, password);
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
      <p className="welcome-tagline">{t('setNewPassword.tagline')}</p>

      <form className="account-auth-form" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder={t('auth.newPasswordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          autoFocus
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
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? t('auth.validating') : t('setNewPassword.validate')}
        </Button>
      </form>

      {error && <p className="warning">{error}</p>}
    </div>
  );
}

export default SetNewPasswordScreen;
