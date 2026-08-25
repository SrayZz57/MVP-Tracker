import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CONFIG, MODES } from './AimTrainerGame.jsx';

const SETTINGS_STORAGE_KEY = 'mvptracker-aim-trainer-settings';
const BEST_STORAGE_KEY = 'mvptracker-aim-trainer-best';

const TARGET_COLORS = ['#ff4655', '#4ec9f5', '#3ddc84', '#ffc857', '#9b7bff', '#ffffff'];

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

function AimTrainer() {
  const { t } = useTranslation();
  const [config, setConfig] = useState(loadConfig);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const set = (patch) => setConfig((prev) => ({ ...prev, ...patch }));

  // Choisir un mode applique ses valeurs recommandées (nombre/taille des
  // cibles, dispersion) — elles restent modifiables ensuite à la main.
  const selectMode = (id) => setConfig((prev) => ({ ...prev, mode: id, ...MODES[id].preset }));

  const distance = cm360(config.dpi, config.sens);
  const edpi = config.dpi * config.sens;

  return (
    <div>
      <div className="card">
        <h3>{t('aimTrainer.title')}</h3>
        <p className="label">{t('aimTrainer.hint')}</p>

        <h4 className="account-subsection-title">{t('aimTrainer.modeSection')}</h4>
        <div className="aim-mode-grid">
          {Object.entries(MODES).map(([id, mode]) => (
            <button
              key={id}
              className={id === config.mode ? 'aim-mode-card active' : 'aim-mode-card'}
              onClick={() => selectMode(id)}
            >
              <span className="aim-mode-name">{t(mode.labelKey)}</span>
              <span className="aim-mode-desc">{t(mode.descKey)}</span>
            </button>
          ))}
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
          <button className="refresh aim-launch-btn" onClick={() => window.electronAPI.openAimTrainer(config)}>
            {t('aimTrainer.launch')}
          </button>
          <p className="label">{t('aimTrainer.launchHint')}</p>
        </div>

        <p className="label" style={{ marginTop: '0.75rem' }}>{t('aimTrainer.accuracyNote')}</p>
      </div>
    </div>
  );
}

export default AimTrainer;
