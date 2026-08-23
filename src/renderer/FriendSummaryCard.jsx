import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { friendLabel } from './friendsShared.jsx';
import { usePlayerCardArt, useRankTiers } from './rankData.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';

function FriendSummaryCard({ profile, preview, online }) {
  const { t } = useTranslation();
  const rankTiers = useRankTiers();
  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const tier = preview?.rank ? rankTiers.get(preview.rank.tierId) : null;

  const avatarCardUuid = profile.avatar_card_uuid ?? preview?.cardUuid;
  const avatarArt = usePlayerCardArt(avatarCardUuid);

  const roleIconByName = useMemo(() => {
    const map = new Map();
    agentRoles.forEach(({ roleName, roleIcon }) => {
      if (roleName && roleIcon && !map.has(roleName)) map.set(roleName, roleIcon);
    });
    return map;
  }, [agentRoles]);

  const displayedLabel = friendLabel(profile);
  const roleIcon = profile.main_role ? roleIconByName.get(profile.main_role) : null;
  const agentIcon = profile.main_agent ? agentIcons.get(profile.main_agent) : null;

  return (
    <div className="friend-summary-card">
      <div
        className={`friend-summary-banner ${tier?.color ? 'rank-glow' : ''}`}
        style={{
          backgroundImage: avatarArt.banner ? `url(${avatarArt.banner})` : undefined,
          '--rank-color': tier?.color,
        }}
      >
        <div className="friend-summary-banner-overlay">
          <div className="friend-summary-avatar-wrap">
            <div className="friend-summary-avatar">
              {avatarArt.icon ? (
                <img src={avatarArt.icon} alt="" />
              ) : (
                <span>{displayedLabel.charAt(0)}</span>
              )}
            </div>
            {online && <span className="friend-online-dot friend-summary-online-dot" title={t('friends.online')} />}
          </div>
          <div className="friend-summary-identity">
            <span className="friend-summary-name">{displayedLabel}</span>
            <span className="friend-summary-tag">{profile.riot_name}#{profile.riot_tag}</span>
          </div>
        </div>
      </div>

      {(profile.main_role || profile.main_agent) && (
        <div className="friend-card-loadout">
          {profile.main_role && (
            <span className="friend-card-loadout-item">
              {roleIcon && <img src={roleIcon} alt="" />}
              {profile.main_role}
            </span>
          )}
          {profile.main_agent && (
            <span className="friend-card-loadout-item">
              {agentIcon && <img src={agentIcon} alt="" />}
              {profile.main_agent}
            </span>
          )}
        </div>
      )}

      {preview === undefined && <p className="label friend-summary-loading">{t('friends.loadingPreview')}</p>}
      {preview === null && <p className="label friend-summary-loading">{t('friends.previewUnavailable')}</p>}
      {preview && (
        <div className="friend-summary-stats">
          <div className="friend-summary-stat friend-summary-stat-rank">
            {tier?.icon && <img src={tier.icon} alt="" />}
            <div className="friend-summary-stat-text">
              <span className="value">{tier?.tierName ?? t('friends.unranked')}</span>
              {preview.rank && <span className="label">{preview.rank.rr} RR</span>}
            </div>
          </div>
          <div className="friend-summary-stat">
            <div className="friend-summary-stat-text">
              <span className="value">{preview.accountLevel}</span>
              <span className="label">{t('friends.level')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FriendSummaryCard;
