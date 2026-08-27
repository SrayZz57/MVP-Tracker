import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FriendAvatar, friendLabel } from './friendsShared.jsx';
import { useRankTiers } from './rankData.js';

// Une ligne de classement Aim Trainer (défi du jour ou amis), avec une carte
// au survol montrant rang + K/D récent + réglages souris pour CE score —
// chargée à la demande (pas pour toutes les lignes d'un coup, pour ne pas
// saturer le quota API sur un classement de 20 joueurs) et mise en cache
// pour ne pas rappeler l'API à chaque survol du même joueur.
function AimLeaderboardRow({ row, rank, myId, apiKey, friendStatus, onAddFriend, highlight }) {
  const { t } = useTranslation();
  const rankTiers = useRankTiers();
  const [hovered, setHovered] = useState(false);
  const [preview, setPreview] = useState(undefined); // undefined = pas encore chargé, null = échec
  const [recentStats, setRecentStats] = useState(undefined);

  const isSelf = row.user_id === myId;

  const handleEnter = () => {
    setHovered(true);
    if (isSelf || !apiKey || !row.profiles) return;
    if (preview === undefined) {
      window.electronAPI
        .previewRiotAccount({ name: row.profiles.riot_name, tag: row.profiles.riot_tag, apiKey })
        .then(setPreview)
        .catch(() => setPreview(null));
    }
    if (recentStats === undefined) {
      window.electronAPI
        .previewRecentStats({ name: row.profiles.riot_name, tag: row.profiles.riot_tag, apiKey })
        .then(setRecentStats)
        .catch(() => setRecentStats(null));
    }
  };

  const tier = preview?.rank ? rankTiers.get(preview.rank.tierId) : null;
  const loadingPreview = preview === undefined || recentStats === undefined;

  return (
    <div
      className={highlight ? 'aim-board-row me' : 'aim-board-row'}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="aim-board-rank">{rank}</span>
      <FriendAvatar profile={row.profiles} size={26} />
      <span className="aim-board-name">{friendLabel(row.profiles)}</span>
      <span className="aim-board-score">{row.score}</span>

      {hovered && !isSelf && (
        <div className="aim-board-hover-card">
          <div className="aim-board-hover-header">
            <FriendAvatar profile={row.profiles} size={36} />
            <span className="aim-board-hover-name">{friendLabel(row.profiles)}</span>
          </div>

          <div className="aim-board-hover-stats">
            <div className="aim-board-hover-stat">
              {tier?.icon && <img src={tier.icon} alt="" />}
              <span>{preview === undefined ? '…' : (tier?.tierName ?? t('friends.unranked'))}</span>
            </div>
            <div className="aim-board-hover-stat">
              <span className="label">K/D</span>
              <span>
                {recentStats === undefined
                  ? '…'
                  : recentStats?.kd !== null && recentStats?.kd !== undefined
                    ? recentStats.kd.toFixed(2)
                    : '—'}
              </span>
            </div>
            {row.dpi && row.sens && (
              <div className="aim-board-hover-stat">
                <span className="label">{t('aimTrainer.hoverSettings')}</span>
                <span>{row.dpi} DPI · {row.sens}</span>
              </div>
            )}
          </div>

          {!loadingPreview && (
            <>
              {friendStatus === 'none' && (
                <button
                  className="strategy-tool aim-board-hover-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFriend(row.user_id);
                  }}
                >
                  + {t('aimTrainer.addFriend')}
                </button>
              )}
              {friendStatus === 'pending-out' && <p className="label">{t('friends.requestSent')}</p>}
              {friendStatus === 'pending-in' && <p className="label">{t('aimTrainer.pendingIncoming')}</p>}
              {friendStatus === 'accepted' && <p className="label">{t('aimTrainer.alreadyFriends')}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AimLeaderboardRow;
