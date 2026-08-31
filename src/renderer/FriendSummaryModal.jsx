import { useTranslation } from 'react-i18next';
import FriendSummaryCard from './FriendSummaryCard.jsx';
import Button from './ui/Button';

function FriendSummaryModal({ profile, preview, online, onClose }) {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card friend-summary-modal" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="modal-close" onClick={onClose}>{t('detail.close')}</Button>
        <FriendSummaryCard profile={profile} preview={preview} online={online} />
      </div>
    </div>
  );
}

export default FriendSummaryModal;
