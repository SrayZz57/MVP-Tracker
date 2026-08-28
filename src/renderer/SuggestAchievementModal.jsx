import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const SUGGEST_EMAIL = 'mvptracker.app@gmail.com';

// Pas d'infra d'envoi d'email dans l'app (pas de backend/API mail) — ce
// formulaire prépare un mailto: avec le sujet/corps déjà remplis et ouvre le
// client mail par défaut de l'utilisateur, qui n'a plus qu'à cliquer sur
// Envoyer. Même principe que le bouton "Contact" existant (AccountPage.jsx),
// juste avec un vrai petit formulaire au lieu d'un lien nu.
function SuggestAchievementModal({ onClose }) {
  const { t } = useTranslation();
  const [idea, setIdea] = useState('');

  const handleSend = () => {
    const subject = encodeURIComponent(t('hallOfFame.suggestEmailSubject'));
    const body = encodeURIComponent(idea.trim());
    window.electronAPI.openExternal(`mailto:${SUGGEST_EMAIL}?subject=${subject}&body=${body}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card suggest-achievement-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>{t('detail.close')}</button>
        <h2>{t('hallOfFame.suggestTitle')}</h2>
        <p className="label">{t('hallOfFame.suggestHint')}</p>
        <textarea
          placeholder={t('hallOfFame.suggestPlaceholder')}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          autoFocus
        />
        <button className="refresh" onClick={handleSend} disabled={!idea.trim()} style={{ marginTop: '0.75rem' }}>
          ✉️ {t('hallOfFame.suggestSend')}
        </button>
      </div>
    </div>
  );
}

export default SuggestAchievementModal;
