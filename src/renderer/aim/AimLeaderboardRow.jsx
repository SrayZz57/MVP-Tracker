import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FriendAvatar, friendLabel } from '../social/friendsShared.jsx';
import { useRankTiers } from '../data/rankData.js';
import Button from '../ui/Button';
import { HoverPreviewSkeleton } from '../ui/skeletons.jsx';
import LoadingGate from '../ui/LoadingGate.jsx';

const CARD_WIDTH = 220;
const CARD_MARGIN = 10;

function AimLeaderboardRow({ row, rank, myId, apiKey, friendStatus, onAddFriend, highlight }) {
  const { t } = useTranslation();
  const rankTiers = useRankTiers();
  const nameRef = useRef(null);
  const [cardPos, setCardPos] = useState(null);
  const [preview, setPreview] = useState(undefined);

  const isSelf = row.user_id === myId;

  const handleEnter = () => {
    const rect = nameRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceRight = window.innerWidth - rect.right;
      const left =
        spaceRight >= CARD_WIDTH + CARD_MARGIN
          ? rect.right + CARD_MARGIN
          : Math.max(CARD_MARGIN, rect.left - CARD_WIDTH - CARD_MARGIN);
      const top = Math.min(rect.top - 8, window.innerHeight - 260);
      setCardPos({ top, left });
    }
    if (isSelf || !apiKey || !row.profiles) return;
    if (preview !== undefined) return;
    const { riot_name: name, riot_tag: tag } = row.profiles;
    window.electronAPI
      .previewRiotAccount({ name, tag, apiKey })
      .then(setPreview)
      .catch(() => setPreview(null));
  };

  const tier = preview?.rank ? rankTiers.get(preview.rank.tierId) : null;
  const loadingPreview = preview === undefined;

  return (
    <div
      className={highlight ? 'aim-board-row me' : 'aim-board-row'}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setCardPos(null)}
    >
      <span className="aim-board-rank">{rank}</span>
      <FriendAvatar profile={row.profiles} size={26} />
      <span className="aim-board-name">
        <span ref={nameRef}>{friendLabel(row.profiles)}</span>
      </span>
      <span className="aim-board-score">{row.score}</span>

      {cardPos &&
        !isSelf &&
        createPortal(
          <div className="aim-board-hover-card" style={{ top: cardPos.top, left: cardPos.left }}>
            <div className="aim-board-hover-header">
              <FriendAvatar profile={row.profiles} size={36} />
              <span className="aim-board-hover-name">{friendLabel(row.profiles)}</span>
            </div>

            <div className="aim-board-hover-stats">
              <LoadingGate active={loadingPreview} fallback={<HoverPreviewSkeleton />}>
                <div className="aim-board-hover-stat">
                  {tier?.icon && <img src={tier.icon} alt="" />}
                  <span>{tier?.tierName ?? t('friends.unranked')}</span>
                </div>
              </LoadingGate>
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
                  <Button
                    variant="primary"
                    className="strategy-tool aim-board-hover-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddFriend(row.user_id);
                    }}
                  >
                    + {t('aimTrainer.addFriend')}
                  </Button>
                )}
                {friendStatus === 'pending-out' && <p className="label">{t('friends.requestSent')}</p>}
                {friendStatus === 'pending-in' && <p className="label">{t('aimTrainer.pendingIncoming')}</p>}
                {friendStatus === 'accepted' && <p className="label">{t('aimTrainer.alreadyFriends')}</p>}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AimLeaderboardRow;
