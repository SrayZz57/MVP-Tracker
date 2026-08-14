import { useState } from 'react';

function SettingsForm({ initialSettings, onSaved }) {
  const [name, setName] = useState(initialSettings?.name ?? '');
  const [tag, setTag] = useState(initialSettings?.tag ?? '');
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey ?? '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    // On garde `puuid` (retrouvé automatiquement lors du premier chargement des
    // matchs) même quand on ne fait que corriger le Riot ID ou la clé API ici.
    const settings = {
      ...initialSettings,
      name: name.trim(),
      tag: tag.trim(),
      apiKey: apiKey.trim(),
    };
    await window.electronAPI.saveSettings(settings);
    onSaved(settings);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px' }}>
      <h2>Réglages Valorant</h2>
      <label>
        Riot ID (pseudo)
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Tag (sans le #)
        <input value={tag} onChange={(e) => setTag(e.target.value)} required />
      </label>
      <label>
        Clé API HenrikDev
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" required />
      </label>
      <button type="submit">Enregistrer</button>
    </form>
  );
}

export default SettingsForm;
