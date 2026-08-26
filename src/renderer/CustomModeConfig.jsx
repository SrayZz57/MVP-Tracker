import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CONFIG, MODES } from './AimTrainerGame.jsx';

const SETTINGS_STORAGE_KEY = 'mvptracker-aim-trainer-settings';

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Fenêtre séparée dédiée au mode Personnalisé : les 6 modes standards sont
// figés (mêmes réglages pour tout le monde, sinon le record général n'a
// aucun sens) — ce mode est le seul endroit où la difficulté reste libre.
// Volontairement à l'écart de l'onglet principal pour ne pas l'alourdir avec
// des réglages que la plupart des joueurs n'utiliseront jamais.
function CustomModeConfig() {
  const { t } = useTranslation();
  const stored = loadStoredConfig();

  // Point de départ : les valeurs déjà personnalisées si le mode l'était
  // déjà, sinon celles du mode Flick (un point de départ raisonnable).
  const initial = stored.mode === 'custom' ? stored : { ...stored, ...MODES.flick.preset };
  const [duration, setDuration] = useState(initial.duration);
  const [targetSize, setTargetSize] = useState(initial.targetSize);
  const [targetCount, setTargetCount] = useState(initial.targetCount);
  const [spread, setSpread] = useState(initial.spread);

  const applyBase = (id) => {
    const preset = MODES[id].preset;
    setDuration(preset.duration);
    setTargetSize(preset.targetSize);
    setTargetCount(preset.targetCount);
    setSpread(preset.spread);
  };

  const save = () => {
    const next = { ...stored, mode: 'custom', duration, targetSize, targetCount, spread };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    window.electronAPI.closeCustomConfig();
  };

  return (
    <div className="custom-config-page">
      <div className="custom-config-card">
        <h2>{t('aimTrainer.customTitle')}</h2>
        <p className="label">{t('aimTrainer.customIntro')}</p>

        <label className="aim-config-block">
          <span className="label">{t('aimTrainer.customBase')}</span>
          <select className="custom-config-select" defaultValue="" onChange={(e) => e.target.value && applyBase(e.target.value)}>
            <option value="" disabled>
              {t('aimTrainer.customBasePlaceholder')}
            </option>
            {Object.entries(MODES).map(([id, mode]) => (
              <option key={id} value={id}>
                {mode.icon} {t(mode.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="aim-config-range">
          <span className="label">{t('aimTrainer.durationLabel', { seconds: duration })}</span>
          <input type="range" min="10" max="120" step="5" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>

        <label className="aim-config-range">
          <span className="label">{t('aimTrainer.targetSizeLabel', { size: targetSize.toFixed(2) })}</span>
          <input
            type="range"
            min="0.15"
            max="0.8"
            step="0.01"
            value={targetSize}
            onChange={(e) => setTargetSize(Number(e.target.value))}
          />
        </label>

        <label className="aim-config-range">
          <span className="label">{t('aimTrainer.targetCountLabel', { count: targetCount })}</span>
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
          />
        </label>

        <label className="aim-config-range">
          <span className="label">{t('aimTrainer.spreadLabel', { deg: spread })}</span>
          <input type="range" min="8" max="45" step="1" value={spread} onChange={(e) => setSpread(Number(e.target.value))} />
        </label>

        <div className="custom-config-actions">
          <button className="account-forgot-password" onClick={() => window.electronAPI.closeCustomConfig()}>
            {t('aimTrainer.customCancel')}
          </button>
          <button className="refresh" onClick={save}>
            {t('aimTrainer.customSave')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomModeConfig;
