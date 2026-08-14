import { useState } from 'react';

function SettingsForm({ onSaved }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const settings = { name: name.trim(), tag: tag.trim(), apiKey: apiKey.trim() };
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
