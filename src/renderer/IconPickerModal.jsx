import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

function IconPickerModal({ title, items, onSelect, onClose }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.label.toLowerCase().includes(query));
  }, [items, search]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card-picker-modal" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" type="button" className="modal-close" onClick={onClose}>{t('detail.close')}</Button>
        <h3>{title}</h3>
        <input
          type="text"
          placeholder={t('common.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="card-picker-search"
          autoFocus
        />
        {items.length === 0 ? (
          <p className="label">{t('auth.loading')}</p>
        ) : (
          <div className="card-picker-grid">
            {filtered.map((item) => (
              <Button
                variant="icon"
                type="button"
                key={item.id}
                className="card-picker-item"
                title={item.label}
                onClick={() => onSelect(item.id)}
              >
                <img src={item.icon} alt={item.label} loading="lazy" />
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default IconPickerModal;
