import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FriendAvatar, friendLabel } from './friendsShared.jsx';
import { useRankTiers } from './rankData.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';

function FriendSummaryCard({ profile, preview, online }) {
  const { t } = useTranslation();
  const rankTiers = useRankTiers();
  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const tier = preview?.rank ? rankTiers.get(preview.rank.tierId) : null;

  const roleIconByName = useMemo(() => {
    const map = new Map();
    agentRoles.forEach(({ roleName, roleIcon }) => {
      if (roleName && roleIcon && !map.has(roleName)) map.set(roleName, roleIcon);
    });
    return map;
  }, [agentRoles]);

  return (
    <>
      <div className="friend-card-header">
        <FriendAvatar profile={profile} size={56} online={online} />
        <div className="friend-card-identity">
          <span className="friend-card-name">{friendLabel(profile)}</span>
          <span className="label">{profile.riot_name}#{profile.riot_tag}</span>
        </div>
      </div>

      {(profile.main_role || profile.main_agent) && (
        <div className="friend-card-loadout">
          {profile.main_role && (
            <span className="friend-card-loadout-item">
              {roleIconByName.get(profile.main_role) && <img src={roleIconByName.get(profile.main_role)} alt="" />}
              {profile.main_role}
            </span>
          )}
          {profile.main_agent && (
            <span className="friend-card-loadout-item">
              {agentIcons.get(profile.main_agent) && <img src={agentIcons.get(profile.main_agent)} alt="" />}
              {profile.main_agent}
            </span>
          )}
        </div>
      )}

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
    </>
  );
}

export default FriendSummaryCard;
