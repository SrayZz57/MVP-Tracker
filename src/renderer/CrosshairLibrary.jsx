import { useEffect, useMemo, useState } from 'react';
import CrosshairPreview from './CrosshairPreview.jsx';
import { CROSSHAIR_CATALOG, CROSSHAIR_COLOR_NAMES, CROSSHAIR_STYLE_NAMES, PRO_CROSSHAIRS } from './crosshairPresets.js';

const CATALOG_PAGE_SIZE = 12;
const PRO_PAGE_SIZE = 8;

function CrosshairLibrary() {
  const [crosshairs, setCrosshairs] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('');
  const [image, setImage] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const [showAllPro, setShowAllPro] = useState(false);

  const filteredCatalog = useMemo(
    () =>
      CROSSHAIR_CATALOG.filter(
        (item) =>
          (colorFilter === '' || item.colorName === colorFilter) &&
          (styleFilter === '' || item.styleName === styleFilter),
      ),
    [colorFilter, styleFilter],
  );

  const refresh = () => window.electronAPI.listCrosshairs().then(setCrosshairs);

  useEffect(() => {
    refresh();
  }, []);

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
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>🎯 Bibliothèque de crosshairs</h2>

        <h3>Catalogue</h3>
        <div className="filter-bar">
          <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)}>
            <option value="">Toutes les couleurs</option>
            {CROSSHAIR_COLOR_NAMES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)}>
            <option value="">Tous les styles</option>
            {CROSSHAIR_STYLE_NAMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="label">{filteredCatalog.length} crosshair(s)</span>
        </div>
        <div className="crosshair-grid">
          {(showAllCatalog ? filteredCatalog : filteredCatalog.slice(0, CATALOG_PAGE_SIZE)).map((preset) => (
            <div key={preset.name} className="crosshair-item">
              <CrosshairPreview code={preset.code} />
              <p>{preset.name}</p>
              <button onClick={() => handleUsePreset(preset)}>+ Ajouter à ma bibliothèque</button>
            </div>
          ))}
        </div>
        {filteredCatalog.length > CATALOG_PAGE_SIZE && (
          <button className="show-more-btn" onClick={() => setShowAllCatalog(!showAllCatalog)}>
            {showAllCatalog ? '▲ Voir moins' : `▼ Voir plus (${filteredCatalog.length - CATALOG_PAGE_SIZE})`}
          </button>
        )}
      </div>

      <div className="card">
        <h3>Crosshairs de pros</h3>
        <p className="label">Codes publiés par des joueurs pro (source : thespike.gg)</p>
        <div className="crosshair-grid">
          {(showAllPro ? PRO_CROSSHAIRS : PRO_CROSSHAIRS.slice(0, PRO_PAGE_SIZE)).map((preset) => (
            <div key={preset.name} className="crosshair-item">
              <CrosshairPreview code={preset.code} />
              <p>{preset.name}</p>
              <button onClick={() => handleUsePreset(preset)}>+ Ajouter à ma bibliothèque</button>
            </div>
          ))}
        </div>
        {PRO_CROSSHAIRS.length > PRO_PAGE_SIZE && (
          <button className="show-more-btn" onClick={() => setShowAllPro(!showAllPro)}>
            {showAllPro ? '▲ Voir moins' : `▼ Voir plus (${PRO_CROSSHAIRS.length - PRO_PAGE_SIZE})`}
          </button>
        )}
      </div>

      <div className="card">
        <h3>Ajouter un code perso</h3>
        <form onSubmit={handleSave} className="crosshair-form">
          <div className="crosshair-form-fields">
            <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              placeholder="Code crosshair (ex: 0;P;c;1;...)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <input placeholder="Couleur (ex: Cyan)" value={color} onChange={(e) => setColor(e.target.value)} />
            <label>
              Image (optionnel)
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
          <div className="crosshair-form-preview">
            {code.trim() !== '' ? (
              image ? (
                <img src={image} alt="Aperçu du crosshair" className="crosshair-custom-preview" />
              ) : (
                <CrosshairPreview code={code.trim()} />
              )
            ) : (
              <div className="crosshair-preview-placeholder">Aperçu</div>
            )}
            <button type="submit">Enregistrer</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Ta bibliothèque ({crosshairs.length})</h3>
        {crosshairs.length === 0 ? (
          <p>Aucun crosshair enregistré pour l'instant — pioche dans le catalogue ci-dessus ou ajoute ton propre code.</p>
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
                  <button onClick={() => navigator.clipboard.writeText(ch.code)}>Copier</button>
                  <button onClick={() => handleDelete(ch.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CrosshairLibrary;
