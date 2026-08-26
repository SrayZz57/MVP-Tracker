import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CONFIG, MODES } from './AimTrainerGame.jsx';
import {
  loadPersonalBests,
  loadGlobalBests,
  loadHistory,
  loadDailyLeaderboard,
  loadFriendsLeaderboard,
  computeStreak,
  todayKey,
} from './aimScores.js';
import { buildDailyChallenge } from './aimChallenge.js';
import { computeTrainingImpact } from './aimCorrelation.js';
import { FriendAvatar, friendLabel } from './friendsShared.jsx';

const SETTINGS_STORAGE_KEY = 'mvptracker-aim-trainer-settings';

const TARGET_COLORS = ['#ff4655', '#4ec9f5', '#3ddc84', '#ffc857', '#9b7bff', '#ffffff'];

// Routine d'échauffement : trois modes complémentaires enchaînés, à lancer
// avant une session de jeu (visée sèche, suivi, puis précision fine).
const WARMUP_ROUTINE = ['flick', 'tracking', 'micro'];

function loadConfig() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// cm/360 : la distance physique à parcourir avec la souris pour faire un tour
// complet. C'est la vraie référence entre joueurs (l'eDPI seul ne dit rien
// sans le yaw du jeu). Formule officielle Valorant.
function cm360(dpi, sens) {
  if (!dpi || !sens) return null;
  return (2.54 * 360) / (dpi * sens * 0.07);
}

function AimTrainer({ myId, matches, settings }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState(loadConfig);
  const [personalBests, setPersonalBests] = useState({});
  const [globalBests, setGlobalBests] = useState({});
  const [history, setHistory] = useState([]);
  const [dailyBoard, setDailyBoard] = useState([]);
  const [friendsBoard, setFriendsBoard] = useState([]);

  const challenge = useMemo(() => buildDailyChallenge(todayKey()), []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Données rechargées à l'ouverture de l'onglet ET à la fermeture de la
  // fenêtre de jeu : une session qui vient d'être jouée doit se voir ici
  // immédiatement, sans redémarrer l'app ni changer d'onglet.
  const refresh = useCallback(() => {
    loadGlobalBests().then(setGlobalBests);
    loadDailyLeaderboard(challenge.dateKey).then(setDailyBoard);
    if (myId) {
      loadPersonalBests(myId).then(setPersonalBests);
      loadHistory(myId).then(setHistory);
    }
  }, [myId, challenge.dateKey]);

  useEffect(() => {
    refresh();
    return window.electronAPI.onAimTrainerClosed(refresh);
  }, [refresh]);

  useEffect(() => {
    if (myId) loadFriendsLeaderboard(myId, config.mode).then(setFriendsBoard);
  }, [myId, config.mode, history]);

  const set = (patch) => setConfig((prev) => ({ ...prev, ...patch }));

  // Choisir un mode applique ses valeurs recommandées (nombre/taille des
  // cibles, dispersion) — elles restent modifiables ensuite à la main.
  const selectMode = (id) => setConfig((prev) => ({ ...prev, mode: id, ...MODES[id].preset }));

  const launch = (extra = {}) => window.electronAPI.openAimTrainer({ ...config, ...extra, userId: myId });

  const distance = cm360(config.dpi, config.sens);
  const edpi = config.dpi * config.sens;
  const streak = useMemo(() => computeStreak(history), [history]);
  const challengeDone = dailyBoard.some((row) => row.user_id === myId);

  const impact = useMemo(
    () => (settings?.name ? computeTrainingImpact(history, matches, settings.name, settings.tag) : null),
    [history, matches, settings?.name, settings?.tag],
  );

  // Courbe de progression : scores du mode sélectionné, du plus ancien au
  // plus récent, plafonnée aux 20 dernières séances pour rester lisible.
  const progression = useMemo(() => {
    const rows = history.filter((row) => row.mode === config.mode).slice(0, 20).reverse();
    return rows.map((row) => row.score);
  }, [history, config.mode]);

  return (
    <div>
      {/* --- Comment ça marche --------------------------------------------- */}
      <div className="card aim-howto-card">
        <div className="aim-howto-head">
          <div>
            <h3>{t('aimTrainer.howtoTitle')}</h3>
            <p className="label">{t('aimTrainer.howtoIntro')}</p>
          </div>
          <button className="refresh aim-howto-cta" onClick={() => launch()}>
            {t('aimTrainer.launch')}
          </button>
        </div>

        <div className="aim-howto-steps">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="aim-howto-step">
              <span className="aim-howto-num">{n}</span>
              <div>
                <strong>{t(`aimTrainer.howtoStep${n}Title`)}</strong>
                <span className="label">{t(`aimTrainer.howtoStep${n}Text`)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="aim-controls">
          <span className="aim-control">
            <kbd>{t('aimTrainer.controlMouse')}</kbd> {t('aimTrainer.controlAim')}
          </span>
          <span className="aim-control">
            <kbd>{t('aimTrainer.controlClick')}</kbd> {t('aimTrainer.controlShoot')}
          </span>
          <span className="aim-control">
            <kbd>Échap</kbd> {t('aimTrainer.controlPause')}
          </span>
        </div>
      </div>

      {/* --- Défi du jour + série ------------------------------------------ */}
      <div className="aim-top-row">
        <div className="card aim-challenge-card">
          <span className="aim-challenge-badge">{t('aimTrainer.dailyChallenge')}</span>
          <h3>
            {MODES[challenge.mode].icon} {t(MODES[challenge.mode].labelKey)}
          </h3>
          <p className="label">
            {t('aimTrainer.challengeSetup', {
              seconds: challenge.duration,
              size: challenge.targetSize.toFixed(2),
              count: challenge.targetCount,
            })}
          </p>
          <button
            className="refresh aim-challenge-btn"
            onClick={() =>
              launch({
                ...challenge,
                challengeDate: challenge.dateKey,
                // La sensibilité reste celle du joueur : le défi porte sur la
                // difficulté des cibles, pas sur une config souris imposée.
                dpi: config.dpi,
                sens: config.sens,
                fov: config.fov,
              })
            }
          >
            {challengeDone ? t('aimTrainer.retryChallenge') : t('aimTrainer.playChallenge')}
          </button>

          {dailyBoard.length > 0 && (
            <div className="aim-board">
              <h4 className="account-subsection-title">{t('aimTrainer.todayRanking')}</h4>
              {dailyBoard.slice(0, 5).map((row, i) => (
                <div key={row.user_id} className={row.user_id === myId ? 'aim-board-row me' : 'aim-board-row'}>
                  <span className="aim-board-rank">{i + 1}</span>
                  <FriendAvatar profile={row.profiles} size={26} />
                  <span className="aim-board-name">{friendLabel(row.profiles)}</span>
                  <span className="aim-board-score">{row.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card aim-streak-card">
          <span className="aim-streak-flame">{streak > 0 ? '🔥' : '💤'}</span>
          <span className="aim-streak-value">{streak}</span>
          <span className="aim-streak-label">{t('aimTrainer.streakLabel', { count: streak })}</span>
          <p className="label aim-streak-hint">
            {streak > 0 ? t('aimTrainer.streakKeep') : t('aimTrainer.streakStart')}
          </p>
          <button className="account-forgot-password" onClick={() => launch({ playlist: WARMUP_ROUTINE })}>
            {t('aimTrainer.warmupRoutine')}
          </button>
        </div>
      </div>

      {/* --- Impact sur les vraies parties ---------------------------------- */}
      {impact && (
        <div className="card">
          <h3>{t('aimTrainer.impactTitle')}</h3>
          {!impact.ready ? (
            <p className="label">
              {t('aimTrainer.impactNotReady', {
                trained: impact.trainedGames,
                untrained: impact.untrainedGames,
                needed: impact.needed,
              })}
            </p>
          ) : (
            <>
              <p className="label">{t('aimTrainer.impactHint')}</p>
              <div className="aim-impact-grid">
                {[
                  { key: 'hsPercent', label: t('aimTrainer.impactHs'), suffix: '%', decimals: 1 },
                  { key: 'kd', label: t('aimTrainer.impactKd'), suffix: '', decimals: 2 },
                  { key: 'winrate', label: t('aimTrainer.impactWinrate'), suffix: '%', decimals: 0 },
                ].map(({ key, label, suffix, decimals }) => {
                  const delta = impact.deltas[key];
                  if (delta === null) return null;
                  const positive = delta >= 0;
                  return (
                    <div key={key} className="aim-impact-tile">
                      <span className={positive ? 'aim-impact-delta up' : 'aim-impact-delta down'}>
                        {positive ? '+' : ''}
                        {delta.toFixed(decimals)}
                        {suffix}
                      </span>
                      <span className="aim-impact-label">{label}</span>
                      <span className="aim-impact-detail">
                        {impact.trained[key] === null ? '—' : impact.trained[key].toFixed(decimals)}
                        {suffix} vs {impact.untrained[key] === null ? '—' : impact.untrained[key].toFixed(decimals)}
                        {suffix}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="label aim-impact-footnote">
                {t('aimTrainer.impactFootnote', {
                  trained: impact.trained.games,
                  untrained: impact.untrained.games,
                })}
              </p>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h3>{t('aimTrainer.title')}</h3>
        <p className="label">{t('aimTrainer.hint')}</p>

        <h4 className="account-subsection-title">{t('aimTrainer.modeSection')}</h4>
        <div className="aim-mode-grid">
          {Object.entries(MODES).map(([id, mode]) => {
            const personal = personalBests[id];
            const global = globalBests[id];
            const holdsRecord = personal !== undefined && global !== undefined && personal >= global;
            return (
              <button
                key={id}
                className={id === config.mode ? 'aim-mode-card active' : 'aim-mode-card'}
                style={{ '--mode-accent': mode.accent }}
                onClick={() => selectMode(id)}
              >
                <span className="aim-mode-glow" aria-hidden="true" />
                <span className="aim-mode-head">
                  <span className="aim-mode-icon">{mode.icon}</span>
                  {holdsRecord && <span className="aim-mode-crown" title={t('aimTrainer.holdsRecord')}>👑</span>}
                </span>
                <span className="aim-mode-name">{t(mode.labelKey)}</span>
                <span className="aim-mode-desc">{t(mode.descKey)}</span>
                <span className="aim-mode-records">
                  <span className="aim-mode-record">
                    <span className="aim-mode-record-value">{personal ?? '—'}</span>
                    <span className="aim-mode-record-label">{t('aimTrainer.yourBest')}</span>
                  </span>
                  <span className="aim-mode-record">
                    <span className="aim-mode-record-value aim-mode-record-global">{global ?? '—'}</span>
                    <span className="aim-mode-record-label">{t('aimTrainer.globalBest')}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="aim-config-grid">
          <div className="aim-config-block">
            <h4 className="account-subsection-title">{t('aimTrainer.sensSection')}</h4>
            <label className="aim-trainer-setting">
              <span className="label">{t('aimTrainer.dpiLabel')}</span>
              <input
                type="number"
                value={config.dpi}
                onChange={(e) => set({ dpi: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="aim-trainer-setting">
              <span className="label">{t('aimTrainer.sensLabel')}</span>
              <input
                type="number"
                step="0.01"
                value={config.sens}
                onChange={(e) => set({ sens: Number(e.target.value) || 0 })}
              />
            </label>
            <p className="label aim-config-readout">
              {t('aimTrainer.edpiReadout', {
                edpi: edpi.toFixed(0),
                cm: distance === null ? '—' : distance.toFixed(1),
              })}
            </p>
          </div>

          <div className="aim-config-block">
            <h4 className="account-subsection-title">{t('aimTrainer.sessionSection')}</h4>
            <label className="aim-config-range">
              <span className="label">{t('aimTrainer.durationLabel', { seconds: config.duration })}</span>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={config.duration}
                onChange={(e) => set({ duration: Number(e.target.value) })}
              />
            </label>
            <label className="aim-config-range">
              <span className="label">{t('aimTrainer.targetCountLabel', { count: config.targetCount })}</span>
              <input
                type="range"
                min="1"
                max="5"
                value={config.targetCount}
                onChange={(e) => set({ targetCount: Number(e.target.value) })}
              />
            </label>
            <label className="aim-config-range">
              <span className="label">{t('aimTrainer.spreadLabel', { deg: config.spread })}</span>
              <input
                type="range"
                min="10"
                max="50"
                value={config.spread}
                onChange={(e) => set({ spread: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="aim-config-block">
            <h4 className="account-subsection-title">{t('aimTrainer.targetsSection')}</h4>
            <label className="aim-config-range">
              <span className="label">{t('aimTrainer.targetSizeLabel', { size: config.targetSize.toFixed(2) })}</span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={config.targetSize}
                onChange={(e) => set({ targetSize: Number(e.target.value) })}
              />
            </label>
            <div className="aim-config-colors">
              <span className="label">{t('aimTrainer.targetColorLabel')}</span>
              <div className="aim-color-swatches">
                {TARGET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={color === config.targetColor ? 'aim-color-swatch active' : 'aim-color-swatch'}
                    style={{ background: color }}
                    onClick={() => set({ targetColor: color })}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="aim-config-block">
            <h4 className="account-subsection-title">{t('aimTrainer.displaySection')}</h4>
            <label className="aim-config-range">
              <span className="label">{t('aimTrainer.fovLabel', { fov: config.fov })}</span>
              <input
                type="range"
                min="70"
                max="120"
                value={config.fov}
                onChange={(e) => set({ fov: Number(e.target.value) })}
              />
            </label>
            <label className="aim-config-check">
              <input
                type="checkbox"
                checked={config.showWeapon}
                onChange={(e) => set({ showWeapon: e.target.checked })}
              />
              <span>{t('aimTrainer.showWeaponLabel')}</span>
            </label>
            <button className="account-forgot-password" onClick={() => setConfig({ ...DEFAULT_CONFIG })}>
              {t('aimTrainer.resetDefaults')}
            </button>
          </div>
        </div>

        <div className="aim-launch-row">
          <button className="refresh aim-launch-btn" onClick={() => launch()}>
            {t('aimTrainer.launch')}
          </button>
          <p className="label">{t('aimTrainer.launchHint')}</p>
        </div>

        <p className="label" style={{ marginTop: '0.75rem' }}>{t('aimTrainer.accuracyNote')}</p>
      </div>

      {/* --- Progression + classement amis, sur le mode sélectionné --------- */}
      <div className="aim-bottom-row">
        <div className="card">
          <h3>{t('aimTrainer.progressTitle', { mode: t(MODES[config.mode].labelKey) })}</h3>
          {progression.length < 2 ? (
            <p className="label">{t('aimTrainer.progressNotEnough')}</p>
          ) : (
            <>
              <ProgressionChart scores={progression} accent={MODES[config.mode].accent} />
              <p className="label">
                {t('aimTrainer.progressMeta', {
                  count: progression.length,
                  best: Math.max(...progression),
                  last: progression[progression.length - 1],
                })}
              </p>
            </>
          )}
        </div>

        <div className="card">
          <h3>{t('aimTrainer.friendsTitle')}</h3>
          {friendsBoard.length === 0 ? (
            <p className="label">{t('aimTrainer.friendsEmpty')}</p>
          ) : (
            <div className="aim-board">
              {friendsBoard.map((row, i) => (
                <div key={row.user_id} className={row.user_id === myId ? 'aim-board-row me' : 'aim-board-row'}>
                  <span className="aim-board-rank">{i + 1}</span>
                  <FriendAvatar profile={row.profiles} size={26} />
                  <span className="aim-board-name">{friendLabel(row.profiles)}</span>
                  <span className="aim-board-score">{row.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Courbe de progression : SVG minimal, pas de librairie de graphiques pour si
// peu (une polyligne et quelques points suffisent).
function ProgressionChart({ scores, accent }) {
  const width = 320;
  const height = 90;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const range = Math.max(max - min, 1);

  const points = scores.map((score, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = height - ((score - min) / range) * (height - 12) - 6;
    return { x, y };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="aim-progress-chart">
      <polygon points={area} fill={accent} opacity="0.14" />
      <polyline points={line} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={accent} />
      ))}
    </svg>
  );
}

export default AimTrainer;
