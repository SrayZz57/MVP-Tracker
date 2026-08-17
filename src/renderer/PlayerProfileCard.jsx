import { useMemo } from 'react';
import { computePlayerProfile } from './playerProfile.js';

const SCORE_LABELS = {
  aggression: { label: 'Agressivité', icon: '⚔️' },
  stability: { label: 'Stabilité mentale', icon: '🧘' },
  versatility: { label: 'Polyvalence', icon: '🔄' },
  clutch: { label: 'Clutch factor', icon: '🎯' },
};

function scoreColor(value) {
  if (value === null) return 'var(--text-muted)';
  if (value >= 66) return '#3ddc84';
  if (value >= 34) return 'var(--warning)';
  return 'var(--accent)';
}

function PlayerProfileCard({ settings, matches }) {
  const profile = useMemo(
    () => computePlayerProfile(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  if (!profile.ready) {
    return (
      <div className="card profile-adn-card">
        <h3>🧬 Profil ADN</h3>
        <p className="label">
          Encore {profile.minMatches - profile.matchesAnalyzed} match(s) classé(s) avant de pouvoir générer ton
          profil de joueur.
        </p>
      </div>
    );
  }

  return (
    <div className="card profile-adn-card">
      <h3>🧬 Profil ADN</h3>
      <div className="profile-adn-title">{profile.title}</div>
      <p className="label">{profile.text}</p>

      <div className="profile-adn-bars">
        {Object.entries(SCORE_LABELS).map(([key, meta]) => {
          const value = profile.scores[key];
          return (
            <div key={key} className="stat-bar-row">
              <span className="stat-bar-label">
                {meta.icon} {meta.label}
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
        Basé sur {profile.matchesAnalyzed} matchs classés — {profile.distinctAgents} agent(s) différents,{' '}
        {profile.firstBloods} premier(s) sang, {profile.clutchAttempts} situation(s) de clutch.
      </p>
    </div>
  );
}

export default PlayerProfileCard;
