import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Check, X, Mail } from 'lucide-react';
import Icon from './Icon.jsx';
import { usePlayerCardArt, useAllPlayerCards } from './rankData.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';
import { computeRoleDistribution } from './performanceCharts.js';
import { excludeDeathmatch, groupStats, overallWinrate } from './valorantStats.js';
import RoleStackedBar from './charts/RoleStackedBar.jsx';
import IconPickerModal from './IconPickerModal.jsx';
import { supabase } from './supabaseClient.js';
import CollapsibleCard from './CollapsibleCard.jsx';
import Button from './ui/Button';

const CONTACT_EMAIL = 'mvptracker.app@gmail.com';

// Noms de rôles issus de valorant-api.com (appelée en fr-FR), hors périmètre
// de cette passe de traduction (voir CLAUDE.md / plan i18n), comparés tels
// quels à profile.main_role et aux clés de roleIconByName.
const ROLES = ['Duelliste', 'Initiateur', 'Contrôleur', 'Sentinelle'];

function formatMemberSince(isoDate, locale) {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function AccountPage({ profile, mySettings, myMatches, myRank, email, apiKey, onUpdate, onUpdateApiKey, onSignOut }) {
  const { t, i18n } = useTranslation();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.display_name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetStatus, setResetStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(apiKey ?? '');
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(true);

  useEffect(() => {
    window.electronAPI.getAgentSelectOverlayEnabled().then(setOverlayEnabled);
  }, []);

  const handleToggleOverlay = () => {
    const next = !overlayEnabled;
    setOverlayEnabled(next);
    window.electronAPI.setAgentSelectOverlayEnabled(next);
  };

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

  // Suggestion indicative basée sur les vraies parties trackées, n'est
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

  const memberSince = formatMemberSince(profile.created_at, i18n.language === 'en' ? 'en-US' : 'fr-FR');

  const handleForgotPassword = async () => {
    if (!email) return;
    setResetStatus('sending');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'mvptracker://reset-password',
    });
    setResetStatus(error ? 'error' : 'sent');
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    setSaving(true);
    await onUpdate({ display_name: trimmed || null });
    setSaving(false);
    setEditingName(false);
  };

  const handleSaveApiKey = async () => {
    setSavingApiKey(true);
    await onUpdateApiKey(apiKeyDraft);
    setSavingApiKey(false);
    setEditingApiKey(false);
  };

  return (
    <div>
      <div
        className="card profile-header-card account-header-card"
        style={{ backgroundImage: avatarArt.banner ? `url(${avatarArt.banner})` : undefined }}
      >
        <div className="profile-header-overlay">
          <Button variant="ghost" className="account-avatar-button" onClick={() => setAvatarPickerOpen(true)} title={t('account.changePhoto')}>
            {avatarArt.icon ? (
              <img src={avatarArt.icon} alt="" className="profile-card-icon" />
            ) : (
              <span className="profile-card-icon account-avatar-fallback">{displayedName.charAt(0)}</span>
            )}
            <span className="account-avatar-edit"><Icon icon={Pencil} size={14} /></span>
          </Button>

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
                <Button variant="primary" onClick={handleSaveName} loading={saving} loadingLabel={null}>
                  <Icon icon={Check} size={16} />
                </Button>
                <Button
                  variant="icon"
                  className="account-name-cancel"
                  onClick={() => {
                    setNameDraft(profile.display_name ?? '');
                    setEditingName(false);
                  }}
                >
                  <Icon icon={X} size={16} />
                </Button>
              </div>
            ) : (
              <h2 className="account-name-display" onClick={() => setEditingName(true)} title={t('account.clickToEdit')}>
                {displayedName}
                <span className="account-name-pencil"><Icon icon={Pencil} size={14} /></span>
              </h2>
            )}
            <p className="label">
              {t('account.riotIdLinked', { name: mySettings.name, tag: mySettings.tag })}
              {memberSince && t('account.memberSince', { date: memberSince })}
            </p>
          </div>
        </div>
      </div>

      <div className="account-summary-tiles">
        <div className="card account-tile">
          <span className="account-tile-label">{t('account.rankedTracked')}</span>
          <span className="account-tile-value">{totalGames}</span>
        </div>
        <div className="card account-tile">
          <span className="account-tile-label">{t('account.globalWinrate')}</span>
          <span className="account-tile-value">{winrate !== null ? `${winrate.toFixed(0)}%` : '–'}</span>
        </div>
        <div className="card account-tile">
          <span className="account-tile-label">{t('account.globalKd')}</span>
          <span className="account-tile-value">{kd !== null ? kd.toFixed(2) : '–'}</span>
        </div>
      </div>

      <CollapsibleCard collapsible={false} id="account.playerProfile" title={t('account.playerProfileTitle')}>
        <p className="label">{t('account.playerProfileHint')}</p>

        <h4 className="account-subsection-title">{t('account.yourRole')}</h4>
        <div className="account-role-picker">
          {ROLES.map((role) => (
            <Button
              variant="ghost"
              key={role}
              className={profile.main_role === role ? 'account-role-option active' : 'account-role-option'}
              onClick={() => onUpdate({ main_role: profile.main_role === role ? null : role })}
            >
              {roleIconByName.get(role) && <img src={roleIconByName.get(role)} alt="" />}
              <span>{role}</span>
            </Button>
          ))}
        </div>

        <h4 className="account-subsection-title">{t('account.yourFavoriteAgent')}</h4>
        <Button variant="ghost" className="account-agent-picker" onClick={() => setAgentPickerOpen(true)}>
          {profile.main_agent && agentIcons.get(profile.main_agent) ? (
            <>
              <img src={agentIcons.get(profile.main_agent)} alt="" />
              <span>{profile.main_agent}</span>
            </>
          ) : (
            <span className="label">{t('account.chooseAgent')}</span>
          )}
          <span className="account-agent-picker-edit">{t('account.changeAgent')}</span>
        </Button>

        {(suggestedRole || suggestedAgent) && (
          <p className="label account-suggestion">
            {t('account.suggestionPrefix', { count: totalGames })}{' '}
            {suggestedRole && (
              <>
                <strong>{suggestedRole.role}</strong> ({suggestedRole.percent.toFixed(0)}%)
              </>
            )}
            {suggestedRole && suggestedAgent && t('account.suggestionJoin')}
            {suggestedAgent && (
              <>
                <strong>{suggestedAgent.key}</strong> {t('account.suggestionGamesCount', { count: suggestedAgent.games })}
              </>
            )}
            .
          </p>
        )}

        {roleDistribution.length > 0 && (
          <>
            <h4 className="account-subsection-title">{t('account.realRoleDistribution')}</h4>
            <RoleStackedBar rows={roleDistribution} />
          </>
        )}
      </CollapsibleCard>

      <CollapsibleCard collapsible={false} id="account.settings" title={t('account.settingsTitle')}>
        <p className="label">{t('account.settingsHint')}</p>
        {email && (
          <p className="account-email-row">
            <span className="account-tile-label">{t('account.emailLabel')}</span>
            <span>{email}</span>
          </p>
        )}
        <div className="account-email-row">
          <span className="account-tile-label">{t('account.apiKeyLabel')}</span>
          {editingApiKey ? (
            <div className="account-name-edit-row">
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder={t('linkRiot.apiKeyPlaceholder')}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
              />
              <Button variant="primary" onClick={handleSaveApiKey} loading={savingApiKey} loadingLabel={null}>
                <Icon icon={Check} size={16} />
              </Button>
              <Button
                variant="icon"
                className="account-name-cancel"
                onClick={() => {
                  setApiKeyDraft(apiKey ?? '');
                  setEditingApiKey(false);
                }}
              >
                <Icon icon={X} size={16} />
              </Button>
            </div>
          ) : (
            <span className="account-name-display" onClick={() => setEditingApiKey(true)} title={t('account.clickToEdit')}>
              {apiKey ? '••••••••••••' : t('account.apiKeyMissing')}
              <span className="account-name-pencil"><Icon icon={Pencil} size={14} /></span>
            </span>
          )}
        </div>
        <label className="account-email-row account-toggle-row">
          <span className="account-tile-label">{t('account.agentSelectOverlayLabel')}</span>
          <span className={`switch ${overlayEnabled ? 'on' : ''}`}>
            <input type="checkbox" checked={overlayEnabled} onChange={handleToggleOverlay} />
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
          </span>
        </label>
        <p className="label account-toggle-hint">{t('account.agentSelectOverlayHint')}</p>
        <div className="account-settings-actions">
          <Button variant="ghost" className="sidebar-signout account-signout" onClick={onSignOut}>
            {t('account.signOut')}
          </Button>
          <Button variant="ghost" className="account-forgot-password" onClick={handleForgotPassword} disabled={resetStatus === 'sending'}>
            {resetStatus === 'sending' ? t('account.forgotPasswordSending') : t('account.forgotPassword')}
          </Button>
        </div>
        {resetStatus === 'sent' && <p className="label account-reset-status">{t('account.forgotPasswordSent')}</p>}
        {resetStatus === 'error' && <p className="warning account-reset-status">{t('account.forgotPasswordError')}</p>}
      </CollapsibleCard>

      <CollapsibleCard collapsible={false} id="account.contact" title={t('account.contactTitle')}>
        <p className="label">{t('account.contactHint')}</p>
        <Button
          variant="ghost"
          className="account-contact-button"
          onClick={() => window.electronAPI.openExternal(`mailto:${CONTACT_EMAIL}`)}
        >
          <Icon icon={Mail} size={16} /> {CONTACT_EMAIL}
        </Button>
      </CollapsibleCard>

      {avatarPickerOpen && (
        <IconPickerModal
          title={t('account.choosePhoto')}
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
          title={t('account.chooseFavoriteAgent')}
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
