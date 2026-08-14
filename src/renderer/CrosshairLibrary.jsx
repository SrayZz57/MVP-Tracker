import { useEffect, useMemo, useState } from 'react';
import CrosshairPreview from './CrosshairPreview.jsx';
import { CROSSHAIR_CATALOG, CROSSHAIR_COLOR_NAMES, CROSSHAIR_STYLE_NAMES } from './crosshairPresets.js';

function CrosshairLibrary() {
  const [crosshairs, setCrosshairs] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('');
  const [image, setImage] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('');

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
      <h2>Bibliothèque de crosshairs</h2>

      <h3>Catalogue</h3>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
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
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {filteredCatalog.map((preset) => (
          <div key={preset.name} style={{ border: '1px solid #ccc', padding: '0.5rem', width: '120px' }}>
            <CrosshairPreview code={preset.code} />
            <p>{preset.name}</p>
            <button onClick={() => handleUsePreset(preset)}>Utiliser celui-ci</button>
          </div>
        ))}
      </div>

      <h3>Ajouter un code perso</h3>
      <form onSubmit={handleSave} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxWidth: '700px', alignItems: 'center' }}>
        <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          placeholder="Code crosshair (ex: 0;P;c;1;...)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <input placeholder="Couleur (ex: Cyan)" value={color} onChange={(e) => setColor(e.target.value)} />
        <label>
          Image (optionnel) :{' '}
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>
        <button type="submit">Enregistrer</button>
      </form>
      {code.trim() !== '' && (
        <div style={{ marginTop: '0.5rem' }}>
          <p>Aperçu :</p>
          {image ? (
            <img src={image} alt="Aperçu du crosshair" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
          ) : (
            <CrosshairPreview code={code.trim()} />
          )}
        </div>
      )}

      <h3>Ta bibliothèque</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {crosshairs.map((ch) => (
          <div key={ch.id} style={{ border: '1px solid #ccc', padding: '0.5rem', width: '120px' }}>
            {ch.image ? (
              <img src={ch.image} alt={ch.name} style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
            ) : (
              <CrosshairPreview code={ch.code} />
            )}
            <p>{ch.name}</p>
            {ch.color && <p>Couleur : {ch.color}</p>}
            <button onClick={() => navigator.clipboard.writeText(ch.code)}>Copier</button>
            <button onClick={() => handleDelete(ch.id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrosshairLibrary;
