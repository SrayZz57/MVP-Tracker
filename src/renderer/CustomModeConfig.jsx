import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import Icon from './Icon.jsx';
import { DEFAULT_CONFIG, MODES } from './AimTrainerGame.jsx';

const SETTINGS_STORAGE_KEY = 'mvptracker-aim-trainer-settings';
// Liste séparée des presets nommés — le réglage "actif" (SETTINGS_STORAGE_KEY,
// un seul objet) continue d'exister tel quel pour ne rien casser côté
// AimTrainer.jsx ; cette liste est juste une bibliothèque dans laquelle
// piocher, plutôt que de re-régler chaque paramètre à chaque fois (demande
// de plusieurs testeurs sur Discord).
const PRESETS_STORAGE_KEY = 'mvptracker-aim-trainer-custom-presets';

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Exporté : PlaylistManager.jsx pioche dans la même bibliothèque de presets
// pour construire ses playlists — une seule source de vérité, pas de
// duplication de la logique de lecture.
export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets) {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

// Fenêtre modale (dans la même fenêtre que l'onglet, pas une fenêtre OS
// séparée) dédiée au mode Personnalisé : les 6 modes standards sont figés
// (mêmes réglages pour tout le monde, sinon le record général n'a aucun
// sens) — ce mode est le seul endroit où la difficulté reste libre.
//
// Deux vues : 'list' (les presets déjà sauvegardés, avec Charger/Supprimer)
// et 'edit' (les curseurs, pour en créer un nouveau). On ouvre direct sur
// 'edit' tant qu'aucun preset n'existe encore — pas la peine d'afficher une
// liste vide en premier.
function CustomModeConfig({ onClose, onSaved }) {
  const { t } = useTranslation();
  const stored = loadStoredConfig();
  const [presets, setPresets] = useState(loadPresets);
  const [view, setView] = useState(presets.length > 0 ? 'list' : 'edit');

  // Point de départ du formulaire : les valeurs du réglage perso déjà actif
  // si c'est celui-là (permet de sauvegarder sous un nom ce qu'on avait déjà
  // réglé avant l'ajout de cette fonctionnalité), sinon celles du mode Flick.
  const initial = stored.mode === 'custom' ? stored : { ...stored, ...MODES.flick.preset };
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(initial.duration);
  const [targetSize, setTargetSize] = useState(initial.targetSize);
  const [targetCount, setTargetCount] = useState(initial.targetCount);
  const [spread, setSpread] = useState(initial.spread);
  const [nameError, setNameError] = useState(false);

  const applyBase = (id) => {
    const preset = MODES[id].preset;
    setDuration(preset.duration);
    setTargetSize(preset.targetSize);
    setTargetCount(preset.targetCount);
    setSpread(preset.spread);
  };

  // Écrit dans le réglage ACTIF (celui que l'Aim Trainer lance réellement) et
  // ferme la fenêtre — que ce soit après avoir créé un nouveau preset ou juste
  // chargé un preset déjà existant.
  const activateAndClose = (values) => {
    const next = { ...stored, mode: 'custom', ...values };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    onSaved();
  };

  const loadPreset = (preset) => {
    activateAndClose({
      duration: preset.duration,
      targetSize: preset.targetSize,
      targetCount: preset.targetCount,
      spread: preset.spread,
    });
  };

  const deletePreset = (id) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
  };

  const startNewPreset = () => {
    setName('');
    applyBase('flick');
    setNameError(false);
    setView('edit');
  };

  const savePreset = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    const preset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      duration,
      targetSize,
      targetCount,
      spread,
    };
    const next = [...presets, preset];
    setPresets(next);
    savePresets(next);
    activateAndClose({ duration, targetSize, targetCount, spread });
  };

  return (
    <div className="custom-config-overlay" onClick={onClose}>
      <div className="custom-config-card" onClick={(e) => e.stopPropagation()}>
        <h2>{t('aimTrainer.customTitle')}</h2>

        {view === 'list' ? (
          <>
            <p className="label">{t('aimTrainer.presetsIntro')}</p>
            <ul className="custom-preset-list">
              {presets.map((preset) => (
                <li key={preset.id} className="custom-preset-item">
                  <div className="custom-preset-info">
                    <strong>{preset.name}</strong>
                    <span className="label">
                      {t('aimTrainer.presetSummary', {
                        seconds: preset.duration,
                        count: preset.targetCount,
                        size: preset.targetSize.toFixed(2),
                        deg: preset.spread,
                      })}
                    </span>
                  </div>
                  <div className="custom-preset-actions">
                    <button className="refresh" onClick={() => loadPreset(preset)}>
                      {t('aimTrainer.presetLoad')}
                    </button>
                    <button
                      type="button"
                      className="strategy-tool icon-only danger"
                      title={t('aimTrainer.presetDelete')}
                      onClick={() => deletePreset(preset.id)}
                    >
                      <Icon icon={Trash2} size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="custom-config-actions">
              <button className="account-forgot-password" onClick={onClose}>
                {t('aimTrainer.customCancel')}
              </button>
              <button className="refresh" onClick={startNewPreset}>
                {t('aimTrainer.presetNew')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="label">{t('aimTrainer.customIntro')}</p>

            <label className="aim-config-block">
              <span className="label">{t('aimTrainer.presetNameLabel')}</span>
              <input
                type="text"
                className="custom-config-select"
                value={name}
                maxLength={40}
                placeholder={t('aimTrainer.presetNamePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(false);
                }}
              />
              {nameError && <span className="warning">{t('aimTrainer.presetNameRequired')}</span>}
            </label>

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
              <button className="account-forgot-password" onClick={() => (presets.length > 0 ? setView('list') : onClose())}>
                {t('aimTrainer.customCancel')}
              </button>
              <button className="refresh" onClick={savePreset}>
                {t('aimTrainer.customSave')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CustomModeConfig;
