import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CrosshairPreview from './CrosshairPreview.jsx';
import { PRO_CROSSHAIRS } from './crosshairPresets.js';
import CollapsibleCard from './CollapsibleCard.jsx';

// 24 = 2 lignes complètes à la largeur de carte habituelle sur un écran
// large (12 colonnes) — 15 tombait souvent en plein milieu d'une ligne,
// laissant la suivante à moitié vide.
const PRO_PAGE_SIZE = 24;
const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase();
}

function CrosshairLibrary() {
  const { t } = useTranslation();
  const [crosshairs, setCrosshairs] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('');
  const [image, setImage] = useState('');
  const [proSearch, setProSearch] = useState('');
  const [showAllPro, setShowAllPro] = useState(false);

  const filteredPro = useMemo(() => {
    const query = normalizeText(proSearch.trim());
    if (query === '') return PRO_CROSSHAIRS;
    return PRO_CROSSHAIRS.filter((preset) => normalizeText(preset.name).includes(query));
  }, [proSearch]);

  const refresh = () => window.electronAPI.listCrosshairs().then(setCrosshairs);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setShowAllPro(false);
  }, [proSearch]);

  const handleSave = async (event) => {
    event.preventDefault();
    await window.electronAPI.saveCrosshair(name.trim(), code.trim(), color.trim(), image);
    setName('');
    setCode('');
    setColor('');
    setImage('');
    refresh();
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setImage('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id) => {
    await window.electronAPI.deleteCrosshair(id);
    refresh();
  };

  const handleUsePreset = async (preset) => {
    await window.electronAPI.saveCrosshair(preset.name, preset.code);
    refresh();
  };

  return (
    <div>
      <div className="card crosshair-hero">
        <h2>{t('crosshairs.libraryTitle')}</h2>
        <p className="label">{t('crosshairs.libraryDescription', { count: PRO_CROSSHAIRS.length })}</p>
      </div>

      <div className="tilt-columns">
        <CollapsibleCard id="crosshairs.myLibrary" title={t('crosshairs.libraryCount', { count: crosshairs.length })}>
          {crosshairs.length === 0 ? (
            <p>{t('crosshairs.libraryEmpty')}</p>
          ) : (
            <div className="crosshair-grid">
              {crosshairs.map((ch) => (
                <div key={ch.id} className="crosshair-item">
                  {ch.image ? (
                    <img src={ch.image} alt={ch.name} className="crosshair-custom-preview" />
                  ) : (
                    <CrosshairPreview code={ch.code} />
                  )}
                  <p>{ch.name}</p>
                  {ch.color && <p className="label">{ch.color}</p>}
                  <div className="crosshair-item-actions">
                    <button onClick={() => navigator.clipboard.writeText(ch.code)}>{t('crosshairs.copy')}</button>
                    <button onClick={() => handleDelete(ch.id)}>{t('crosshairs.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleCard>

        <CollapsibleCard id="crosshairs.addCustom" title={t('crosshairs.addCustomTitle')}>
          <form onSubmit={handleSave} className="crosshair-form">
            <div className="crosshair-form-fields">
              <input placeholder={t('crosshairs.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} required />
              <input
                placeholder={t('crosshairs.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <input placeholder={t('crosshairs.colorPlaceholder')} value={color} onChange={(e) => setColor(e.target.value)} />
              <label>
                {t('crosshairs.imageOptional')}
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>
            <div className="crosshair-form-preview">
              {code.trim() !== '' ? (
                image ? (
                  <img src={image} alt={t('crosshairs.previewAlt')} className="crosshair-custom-preview" />
                ) : (
                  <CrosshairPreview code={code.trim()} />
                )
              ) : (
                <div className="crosshair-preview-placeholder">{t('crosshairs.previewPlaceholder')}</div>
              )}
              <button type="submit">{t('crosshairs.save')}</button>
            </div>
          </form>
        </CollapsibleCard>
      </div>

      <CollapsibleCard id="crosshairs.pro" title={t('crosshairs.proTitle')}>
        <p className="label">{t('crosshairs.proHint')}</p>
        <div className="filter-bar">
          <input
            className="crosshair-pro-search"
            placeholder={t('crosshairs.proSearchPlaceholder')}
            value={proSearch}
            onChange={(e) => setProSearch(e.target.value)}
          />
          <span className="heatmap-point-count">{t('crosshairs.resultsCount', { count: filteredPro.length })}</span>
        </div>
        {filteredPro.length === 0 ? (
          <p>{t('crosshairs.noProMatch')}</p>
        ) : (
          <div className="crosshair-grid">
            {(showAllPro ? filteredPro : filteredPro.slice(0, PRO_PAGE_SIZE)).map((preset) => (
              <div key={preset.name} className="crosshair-item">
                <CrosshairPreview code={preset.code} />
                <p>{preset.name}</p>
                <button onClick={() => handleUsePreset(preset)}>{t('crosshairs.addToLibrary')}</button>
              </div>
            ))}
          </div>
        )}
        {filteredPro.length > PRO_PAGE_SIZE && (
          <button className="show-more-btn" onClick={() => setShowAllPro(!showAllPro)}>
            {showAllPro ? t('crosshairs.showLess') : t('crosshairs.showMore', { count: filteredPro.length - PRO_PAGE_SIZE })}
          </button>
        )}
      </CollapsibleCard>
    </div>
  );
}

export default CrosshairLibrary;
