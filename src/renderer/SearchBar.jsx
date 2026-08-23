import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function SearchBar({ initialSettings, onSearch }) {
  const { t } = useTranslation();
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
        <input placeholder={t('linkRiot.usernamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} required />
        <span className="search-bar-hash">#</span>
        <input
          placeholder={t('linkRiot.tagPlaceholder')}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          required
          className="search-bar-tag"
        />
      </div>
      <input
        placeholder={t('linkRiot.apiKeyPlaceholder')}
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        required
        className="search-bar-key"
      />
      <button type="submit">{t('linkRiot.search')}</button>
    </form>
  );
}

export default SearchBar;
