import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';

function SearchBar({ initialSettings, onSearch }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialSettings?.name ?? '');
  const [tag, setTag] = useState(initialSettings?.tag ?? '');
  const apiKey = initialSettings?.apiKey ?? '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const settings = { name: name.trim(), tag: tag.trim(), apiKey };
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
      <Button variant="primary" type="submit">{t('linkRiot.search')}</Button>
    </form>
  );
}

export default SearchBar;
