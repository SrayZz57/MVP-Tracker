import { useTranslation } from 'react-i18next';
import { FriendAvatar, friendLabel } from './friendsShared.jsx';
import { useRankTiers } from './rankData.js';

function FriendSummaryModal({ profile, preview, online, onClose }) {
  const { t } = useTranslation();
  const rankTiers = useRankTiers();
  const tier = preview?.rank ? rankTiers.get(preview.rank.tierId) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card friend-summary-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>{t('detail.close')}</button>

        <div className="friend-card-header">
          <FriendAvatar profile={profile} size={56} online={online} />
          <div className="friend-card-identity">
            <span className="friend-card-name">{friendLabel(profile)}</span>
            <span className="label">{profile.riot_name}#{profile.riot_tag}</span>
          </div>
        </div>

        <div className="card">
          {preview === undefined && <p className="label">{t('friends.loadingPreview')}</p>}
          {preview === null && <p className="label">{t('friends.previewUnavailable')}</p>}
          {preview && (
            <div className="friend-card-stats">
              <div className="friend-card-rank">
                {tier?.icon && <img src={tier.icon} alt="" />}
                <span>{tier?.tierName ?? t('friends.unranked')}{preview.rank ? ` — ${preview.rank.rr} RR` : ''}</span>
              </div>
              <span className="label">{t('friends.accountLevel', { level: preview.accountLevel })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FriendSummaryModal;
