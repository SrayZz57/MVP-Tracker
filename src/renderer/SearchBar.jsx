import { useState } from 'react';

function SearchBar({ initialSettings, onSearch }) {
  const [name, setName] = useState(initialSettings?.name ?? '');
  const [tag, setTag] = useState(initialSettings?.tag ?? '');
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey ?? '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Pas de spread de `initialSettings` ici : une nouvelle recherche vise
    // potentiellement un tout autre profil, l'ancien `puuid` ne doit surtout
    // pas être recopié (sinon l'app croit encore regarder le profil précédent).
    const settings = { name: name.trim(), tag: tag.trim(), apiKey: apiKey.trim() };
    await window.electronAPI.saveSettings(settings);
    onSearch(settings);
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <div className="search-bar-riotid">
        <input placeholder="Pseudo" value={name} onChange={(e) => setName(e.target.value)} required />
        <span className="search-bar-hash">#</span>
        <input
          placeholder="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          required
          className="search-bar-tag"
        />
      </div>
      <input
        placeholder="Clé API HenrikDev"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        required
        className="search-bar-key"
      />
      <button type="submit">🔍 Rechercher</button>
    </form>
  );
}

export default SearchBar;
