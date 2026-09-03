import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Scale, RefreshCw, Target, Compass } from 'lucide-react';
import { computePlayerProfile, getWeaknesses } from './playerProfile.js';
import CollapsibleCard from './CollapsibleCard.jsx';
import WeaknessModal from './WeaknessModal.jsx';
import Icon from './Icon.jsx';

const SCORE_ICONS = {
  aggression: Swords,
  stability: Scale,
  versatility: RefreshCw,
  clutch: Target,
};

function scoreColor(value) {
  if (value === null) return 'var(--text-muted)';
  if (value >= 66) return '#3ddc84';
  if (value >= 34) return 'var(--warning)';
  return 'var(--accent)';
}

function PlayerProfileCard({ settings, matches, onNavigate }) {
  const { t } = useTranslation();
  const [showWeaknesses, setShowWeaknesses] = useState(false);
  const profile = useMemo(
    () => computePlayerProfile(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );
  const weaknesses = useMemo(
    () => (profile.ready ? getWeaknesses(profile.scores) : []),
    [profile],
  );

  if (!profile.ready) {
    return (
      <CollapsibleCard id="profile.adn" title={t('profile.cardTitle')} className="profile-adn-card">
        <p className="label">
          {t('profile.notReady', { count: profile.minMatches - profile.matchesAnalyzed })}
        </p>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard id="profile.adn" title={t('profile.cardTitle')} className="profile-adn-card">
      <div className="profile-adn-title">{t(`profile.archetypes.${profile.archetype}.title`)}</div>
      <p className="label">{t(`profile.archetypes.${profile.archetype}.text`)}</p>

      <div className="profile-adn-bars">
        {Object.entries(SCORE_ICONS).map(([key, icon]) => {
          const value = profile.scores[key];
          return (
            <div key={key} className="stat-bar-row">
              <span className="stat-bar-label">
                <Icon icon={icon} size={16} /> {t(`profile.scores.${key}`)}
              </span>
              <span className="stat-bar-track">
                <span
                  className="stat-bar-fill"
                  style={{ width: `${value ?? 4}%`, background: scoreColor(value) }}
                />
              </span>
              <span className="stat-bar-value">{value === null ? '?' : value.toFixed(0)}</span>
            </div>
          );
        })}
      </div>

      <p className="label profile-adn-meta">
        {t('profile.basedOn', {
          matches: profile.matchesAnalyzed,
          agents: profile.distinctAgents,
          firstBloods: profile.firstBloods,
          clutches: profile.clutchAttempts,
        })}
      </p>

      <button type="button" className="profile-weakness-btn" onClick={() => setShowWeaknesses(true)}>
        <Icon icon={Compass} size={16} /> {t('profile.weakness.open')}
      </button>

      {showWeaknesses && (
        <WeaknessModal
          weaknesses={weaknesses}
          onClose={() => setShowWeaknesses(false)}
          onNavigate={onNavigate}
        />
      )}
    </CollapsibleCard>
  );
}

export default PlayerProfileCard;
