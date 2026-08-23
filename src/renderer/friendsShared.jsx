import { useTranslation } from 'react-i18next';
import { usePlayerCardArt } from './rankData.js';

export const PROFILE_FIELDS = 'id, riot_name, riot_tag, display_name, avatar_card_uuid, main_role, main_agent';

export function initials(name) {
  const base = (name || '?').replace(/#.*$/, '').trim();
  return base.slice(0, 2).toUpperCase();
}

export function friendLabel(profile) {
  if (!profile) return '?';
  return profile.display_name || `${profile.riot_name}#${profile.riot_tag}`;
}

export function FriendAvatar({ profile, size = 40, online = false }) {
  const { t } = useTranslation();
  const art = usePlayerCardArt(profile?.avatar_card_uuid);
  const label = profile?.display_name || profile?.riot_name || '?';
  return (
    <div className="friend-avatar-wrap" style={{ width: size, height: size }}>
      <div className="friend-avatar">
        {art.icon ? <img src={art.icon} alt="" /> : <span>{initials(label)}</span>}
      </div>
      {online && <span className="friend-online-dot" title={t('friends.online')} />}
    </div>
  );
}
