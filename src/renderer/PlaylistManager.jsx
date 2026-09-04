import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import Icon from './Icon.jsx';
import { loadPresets } from './CustomModeConfig.jsx';
import Button from './ui/Button';

const PLAYLISTS_STORAGE_KEY = 'mvptracker-aim-trainer-playlists';

function loadPlaylists() {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlaylists(playlists) {
  localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
}

function PlaylistManager({ onClose, onLaunch }) {
  const { t } = useTranslation();
  const presets = [...loadPresets()].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  const [playlists, setPlaylists] = useState(loadPlaylists);
  const [view, setView] = useState('list');
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([]);
  const [nameError, setNameError] = useState(false);

  const presetById = new Map(presets.map((p) => [p.id, p]));

  const startNewPlaylist = () => {
    setName('');
    setSteps([]);
    setNameError(false);
    setView('edit');
  };

  const addStep = (presetId) => setSteps((prev) => [...prev, presetId]);
  const removeStep = (index) => setSteps((prev) => prev.filter((_, i) => i !== index));
  const moveStep = (index, dir) => {
    setSteps((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const savePlaylist = () => {
    const trimmed = name.trim();
    if (!trimmed || steps.length === 0) {
      setNameError(true);
      return;
    }
    const playlist = { id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: trimmed, presetIds: steps };
    const next = [...playlists, playlist];
    setPlaylists(next);
    savePlaylists(next);
    setView('list');
  };

  const deletePlaylist = (id) => {
    const next = playlists.filter((p) => p.id !== id);
    setPlaylists(next);
    savePlaylists(next);
  };

  const launchPlaylist = (playlist) => {
    const resolved = playlist.presetIds.map((id) => presetById.get(id)).filter(Boolean);
    if (resolved.length === 0) return;
    onLaunch(resolved);
  };

  return (
    <div className="custom-config-overlay" onClick={onClose}>
      <div className="custom-config-card" onClick={(e) => e.stopPropagation()}>
        <h2>{t('aimTrainer.playlistsTitle')}</h2>

        {view === 'list' ? (
          <>
            <p className="label">{t('aimTrainer.playlistsIntro')}</p>

            {playlists.length === 0 ? (
              <p className="label">{t('aimTrainer.playlistsEmpty')}</p>
            ) : (
              <ul className="custom-preset-list">
                {playlists.map((playlist) => (
                  <li key={playlist.id} className="custom-preset-item">
                    <div className="custom-preset-info">
                      <strong>{playlist.name}</strong>
                      <span className="label">
                        {t('aimTrainer.playlistStepsCount', { count: playlist.presetIds.length })}
                      </span>
                    </div>
                    <div className="custom-preset-actions">
                      <Button variant="primary" size="sm" className="refresh" onClick={() => launchPlaylist(playlist)}>
                        {t('aimTrainer.playlistLaunch')}
                      </Button>
                      <Button
                        variant="icon"
                        type="button"
                        className="strategy-tool icon-only danger"
                        title={t('aimTrainer.playlistDelete')}
                        aria-label={t('aimTrainer.playlistDelete')}
                        onClick={() => deletePlaylist(playlist.id)}
                      >
                        <Icon icon={Trash2} size={16} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {presets.length === 0 ? (
              <p className="label">{t('aimTrainer.playlistsNeedPresets')}</p>
            ) : (
              <div className="custom-config-actions">
                <Button variant="ghost" className="account-forgot-password" onClick={onClose}>
                  {t('aimTrainer.customCancel')}
                </Button>
                <Button variant="primary" className="refresh" onClick={startNewPlaylist}>
                  {t('aimTrainer.playlistNew')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="label">{t('aimTrainer.playlistEditIntro')}</p>

            <label className="aim-config-block">
              <span className="label">{t('aimTrainer.playlistNameLabel')}</span>
              <input
                type="text"
                className="custom-config-select"
                value={name}
                maxLength={40}
                placeholder={t('aimTrainer.playlistNamePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(false);
                }}
              />
            </label>

            <div className="aim-config-block">
              <span className="label">{t('aimTrainer.playlistAddStep')}</span>
              <div className="playlist-preset-picker">
                {presets.map((preset) => (
                  <Button
                    variant="ghost"
                    key={preset.id}
                    type="button"
                    className="playlist-preset-chip"
                    onClick={() => addStep(preset.id)}
                  >
                    + {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {steps.length > 0 && (
              <ul className="custom-preset-list">
                {steps.map((presetId, index) => {
                  const preset = presetById.get(presetId);
                  return (
                    <li key={`${presetId}-${index}`} className="custom-preset-item">
                      <div className="custom-preset-info">
                        <strong>
                          {index + 1}. {preset?.name ?? t('aimTrainer.playlistUnknownPreset')}
                        </strong>
                      </div>
                      <div className="custom-preset-actions">
                        <Button
                          variant="icon"
                          type="button"
                          className="strategy-tool icon-only"
                          title={t('aimTrainer.playlistStepUp')}
                          aria-label={t('aimTrainer.playlistStepUp')}
                          disabled={index === 0}
                          onClick={() => moveStep(index, -1)}
                        >
                          <Icon icon={ArrowUp} size={14} />
                        </Button>
                        <Button
                          variant="icon"
                          type="button"
                          className="strategy-tool icon-only"
                          title={t('aimTrainer.playlistStepDown')}
                          aria-label={t('aimTrainer.playlistStepDown')}
                          disabled={index === steps.length - 1}
                          onClick={() => moveStep(index, 1)}
                        >
                          <Icon icon={ArrowDown} size={14} />
                        </Button>
                        <Button
                          variant="icon"
                          type="button"
                          className="strategy-tool icon-only danger"
                          title={t('aimTrainer.playlistStepRemove')}
                          aria-label={t('aimTrainer.playlistStepRemove')}
                          onClick={() => removeStep(index)}
                        >
                          <Icon icon={X} size={14} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {nameError && <p className="warning">{t('aimTrainer.playlistSaveError')}</p>}

            <div className="custom-config-actions">
              <Button variant="ghost" className="account-forgot-password" onClick={() => setView('list')}>
                {t('aimTrainer.customCancel')}
              </Button>
              <Button variant="primary" className="refresh" onClick={savePlaylist}>
                {t('aimTrainer.customSave')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PlaylistManager;
