import { useEffect, useMemo, useState } from 'react';
import CrosshairPreview from './CrosshairPreview.jsx';
import { PRO_CROSSHAIRS } from './crosshairPresets.js';

const PRO_PAGE_SIZE = 15;
const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase();
}

function CrosshairLibrary() {
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
        <h2>🎯 Bibliothèque de crosshairs</h2>
        <p className="label">
          Pioche parmi {PRO_CROSSHAIRS.length} crosshairs de joueurs pro, ou ajoute tes propres codes. Tout ce que tu
          enregistres va dans ta bibliothèque personnelle en bas de page.
        </p>
      </div>

      <div className="card">
        <h3>🏆 Crosshairs de pros</h3>
        <p className="label">Codes publiés par des joueurs pro (source : thespike.gg)</p>
        <div className="filter-bar">
          <input
            className="crosshair-pro-search"
            placeholder="🔍 Chercher un pro (ex: TenZ, ScreaM...)"
            value={proSearch}
            onChange={(e) => setProSearch(e.target.value)}
          />
          <span className="heatmap-point-count">{filteredPro.length} résultat(s)</span>
        </div>
        {filteredPro.length === 0 ? (
          <p>Aucun pro ne correspond à cette recherche.</p>
        ) : (
          <div className="crosshair-grid">
            {(showAllPro ? filteredPro : filteredPro.slice(0, PRO_PAGE_SIZE)).map((preset) => (
              <div key={preset.name} className="crosshair-item">
                <CrosshairPreview code={preset.code} />
                <p>{preset.name}</p>
                <button onClick={() => handleUsePreset(preset)}>+ Ajouter à ma bibliothèque</button>
              </div>
            ))}
          </div>
        )}
        {filteredPro.length > PRO_PAGE_SIZE && (
          <button className="show-more-btn" onClick={() => setShowAllPro(!showAllPro)}>
            {showAllPro ? '▲ Voir moins' : `▼ Voir plus (${filteredPro.length - PRO_PAGE_SIZE})`}
          </button>
        )}
      </div>

      <div className="card">
        <h3>✏️ Ajouter un code perso</h3>
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
        <h3>📁 Ta bibliothèque ({crosshairs.length})</h3>
        {crosshairs.length === 0 ? (
          <p>Aucun crosshair enregistré pour l'instant — pioche dans le catalogue pro ci-dessus ou ajoute ton propre code.</p>
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
