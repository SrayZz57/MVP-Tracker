import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CONFIG, MODES } from './AimTrainerGame.jsx';
import Button from './ui/Button';

const SETTINGS_STORAGE_KEY = 'mvptracker-aim-trainer-settings';

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Fenêtre modale (dans la même fenêtre que l'onglet, pas une fenêtre OS
// séparée) dédiée au mode Personnalisé : les 6 modes standards sont figés
// (mêmes réglages pour tout le monde, sinon le record général n'a aucun
// sens), ce mode est le seul endroit où la difficulté reste libre.
function CustomModeConfig({ onClose, onSaved }) {
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
    onSaved();
  };

  return (
    <div className="custom-config-overlay" onClick={onClose}>
      <div className="custom-config-card" onClick={(e) => e.stopPropagation()}>
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
                {t(mode.labelKey)}
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
            min="0.1"
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
          <Button variant="ghost" className="account-forgot-password" onClick={onClose}>
            {t('aimTrainer.customCancel')}
          </Button>
          <Button variant="primary" className="refresh" onClick={save}>
            {t('aimTrainer.customSave')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CustomModeConfig;
