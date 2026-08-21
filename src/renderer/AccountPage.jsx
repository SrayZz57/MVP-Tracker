import { useMemo, useState } from 'react';
import { usePlayerCardArt, useAllPlayerCards } from './rankData.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';
import { computeRoleDistribution } from './performanceCharts.js';
import { excludeDeathmatch, groupStats, overallWinrate } from './valorantStats.js';
import RoleStackedBar from './charts/RoleStackedBar.jsx';
import IconPickerModal from './IconPickerModal.jsx';

const ROLES = ['Duelliste', 'Initiateur', 'Contrôleur', 'Sentinelle'];

function formatMemberSince(isoDate) {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function AccountPage({ profile, mySettings, myMatches, myRank, onUpdate, onSignOut }) {
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.display_name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  const avatarCardUuid = profile.avatar_card_uuid ?? myRank?.cardUuid;
  const avatarArt = usePlayerCardArt(avatarCardUuid);
  const displayedName = profile.display_name || `${mySettings.name}#${mySettings.tag}`;

  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const roleIconByName = useMemo(() => {
    const map = new Map();
    agentRoles.forEach(({ roleName, roleIcon }) => {
      if (roleName && roleIcon && !map.has(roleName)) map.set(roleName, roleIcon);
    });
    return map;
  }, [agentRoles]);

  const agentItems = useMemo(
    () => [...agentIcons.entries()].map(([name, icon]) => ({ id: name, label: name, icon })),
    [agentIcons],
  );

  const allCards = useAllPlayerCards();
  const cardItems = useMemo(
    () => allCards.map((card) => ({ id: card.uuid, label: card.displayName, icon: card.icon })),
    [allCards],
  );

  // Suggestion indicative basée sur les vraies parties trackées — n'est
  // jamais enregistrée automatiquement, c'est le joueur qui choisit son rôle
  // et son agent, pas un calcul qui décide à sa place.
  const rankedMatches = useMemo(() => excludeDeathmatch(myMatches ?? []), [myMatches]);
  const agentRows = useMemo(
    () => groupStats(rankedMatches, mySettings.name, mySettings.tag, (match, me) => me.character),
    [rankedMatches, mySettings.name, mySettings.tag],
  );
  const suggestedAgent = agentRows[0] ?? null;
  const roleDistribution = useMemo(
    () => computeRoleDistribution(rankedMatches, mySettings.name, mySettings.tag, agentRoles),
    [rankedMatches, mySettings.name, mySettings.tag, agentRoles],
  );
  const suggestedRole = roleDistribution.reduce(
    (best, row) => (!best || row.percent > best.percent ? row : best),
    null,
  );

  const totalGames = rankedMatches.length;
  const winrate = useMemo(
    () => overallWinrate(rankedMatches, mySettings.name, mySettings.tag),
    [rankedMatches, mySettings.name, mySettings.tag],
  );
  const kd = useMemo(() => {
    const all = groupStats(rankedMatches, mySettings.name, mySettings.tag, () => 'all')[0];
    return all && all.avgDeaths > 0 ? all.avgKills / all.avgDeaths : null;
  }, [rankedMatches, mySettings.name, mySettings.tag]);

  const memberSince = formatMemberSince(profile.created_at);

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    setSaving(true);
    await onUpdate({ display_name: trimmed || null });
    setSaving(false);
    setEditingName(false);
  };

  return (
    <div>
      <div
        className="card profile-header-card account-header-card"
        style={{ backgroundImage: avatarArt.banner ? `url(${avatarArt.banner})` : undefined }}
      >
        <div className="profile-header-overlay">
          <button className="account-avatar-button" onClick={() => setAvatarPickerOpen(true)} title="Changer la photo">
            {avatarArt.icon ? (
              <img src={avatarArt.icon} alt="" className="profile-card-icon" />
            ) : (
              <span className="profile-card-icon account-avatar-fallback">{displayedName.charAt(0)}</span>
            )}
            <span className="account-avatar-edit">✏️</span>
          </button>

          <div className="profile-header-info">
            {editingName ? (
              <div className="account-name-edit-row">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder={`${mySettings.name}#${mySettings.tag}`}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} disabled={saving}>
                  {saving ? '...' : '✓'}
                </button>
                <button
                  className="account-name-cancel"
                  onClick={() => {
                    setNameDraft(profile.display_name ?? '');
                    setEditingName(false);
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <h2 className="account-name-display" onClick={() => setEditingName(true)} title="Cliquer pour modifier">
                {displayedName}
                <span className="account-name-pencil">✏️</span>
              </h2>
            )}
            <p className="label">
              Riot ID lié : {mySettings.name}#{mySettings.tag}
              {memberSince && ` · Membre depuis le ${memberSince}`}
            </p>
          </div>
        </div>
      </div>

      <div className="account-summary-tiles">
        <div className="card account-tile">
          <span className="account-tile-label">Matchs classés trackés</span>
          <span className="account-tile-value">{totalGames}</span>
        </div>
        <div className="card account-tile">
          <span className="account-tile-label">Winrate global</span>
          <span className="account-tile-value">{winrate !== null ? `${winrate.toFixed(0)}%` : '—'}</span>
        </div>
        <div className="card account-tile">
          <span className="account-tile-label">K/D global</span>
          <span className="account-tile-value">{kd !== null ? kd.toFixed(2) : '—'}</span>
        </div>
      </div>

      <div className="card">
        <h3>🎭 Profil de joueur</h3>
        <p className="label">Choisis toi-même ton rôle et ton agent fétiche — ça n'a pas besoin de coller à tes stats.</p>

        <h4 className="account-subsection-title">Ton rôle</h4>
        <div className="account-role-picker">
          {ROLES.map((role) => (
            <button
              key={role}
              className={profile.main_role === role ? 'account-role-option active' : 'account-role-option'}
              onClick={() => onUpdate({ main_role: profile.main_role === role ? null : role })}
            >
              {roleIconByName.get(role) && <img src={roleIconByName.get(role)} alt="" />}
              <span>{role}</span>
            </button>
          ))}
        </div>

        <h4 className="account-subsection-title">Ton agent fétiche</h4>
        <button className="account-agent-picker" onClick={() => setAgentPickerOpen(true)}>
          {profile.main_agent && agentIcons.get(profile.main_agent) ? (
            <>
              <img src={agentIcons.get(profile.main_agent)} alt="" />
              <span>{profile.main_agent}</span>
            </>
          ) : (
            <span className="label">Choisir un agent...</span>
          )}
          <span className="account-agent-picker-edit">✏️ Changer</span>
        </button>

        {(suggestedRole || suggestedAgent) && (
          <p className="label account-suggestion">
            💡 D'après tes {totalGames} partie(s) trackée(s), tu joues surtout{' '}
            {suggestedRole && (
              <>
                <strong>{suggestedRole.role}</strong> ({suggestedRole.percent.toFixed(0)}%)
              </>
            )}
            {suggestedRole && suggestedAgent && ' sur '}
            {suggestedAgent && (
              <>
                <strong>{suggestedAgent.key}</strong> ({suggestedAgent.games} partie(s))
              </>
            )}
            .
          </p>
        )}

        {roleDistribution.length > 0 && (
          <>
            <h4 className="account-subsection-title">Répartition réelle de tes rôles joués</h4>
            <RoleStackedBar rows={roleDistribution} />
          </>
        )}
      </div>

      <div className="card">
        <h3>⚙️ Compte</h3>
        <p className="label">Connecté avec ton compte MVP Tracker — ton Riot ID lié reste indépendant de ce compte.</p>
        <button className="sidebar-signout account-signout" onClick={onSignOut}>
          🚪 Se déconnecter
        </button>
      </div>

      {avatarPickerOpen && (
        <IconPickerModal
          title="🖼️ Choisir une photo de profil"
          items={cardItems}
          onSelect={(uuid) => {
            onUpdate({ avatar_card_uuid: uuid });
            setAvatarPickerOpen(false);
          }}
          onClose={() => setAvatarPickerOpen(false)}
        />
      )}

      {agentPickerOpen && (
        <IconPickerModal
          title="🎯 Choisir ton agent fétiche"
          items={agentItems}
          onSelect={(name) => {
            onUpdate({ main_agent: name });
            setAgentPickerOpen(false);
          }}
          onClose={() => setAgentPickerOpen(false)}
        />
      )}
    </div>
  );
}

export default AccountPage;
