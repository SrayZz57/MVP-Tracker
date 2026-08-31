import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';
import { PROFILE_FIELDS } from './friendsShared.jsx';

// Recherche un compte MVP Tracker par Riot ID exact — même schéma que la
// recherche d'ami déjà existante (nom + tag, résultat unique), pour rester
// cohérent avec un flux déjà connu plutôt que d'inventer une nouvelle UX.
// Sert à imposer qu'un joueur de tournoi ait réellement un compte, pas
// seulement un Riot ID tapé à la main.
function AccountPickerModal({ onSelect, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(undefined);

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setResult(undefined);
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .ilike('riot_name', name.trim())
      .eq('riot_tag', tag.trim())
      .maybeSingle();
    setSearching(false);
    setResult(error ? null : (data ?? null));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          {t('detail.close')}
        </button>
        <h3>{t('tournaments.pickAccount')}</h3>
        <p className="label">{t('tournaments.pickAccountHint')}</p>

        <form className="account-picker-search" onSubmit={handleSearch}>
          <input placeholder={t('tournaments.riotName')} value={name} onChange={(e) => setName(e.target.value)} required />
          <span>#</span>
          <input placeholder={t('tournaments.riotTag')} value={tag} onChange={(e) => setTag(e.target.value)} required />
          <button type="submit" disabled={searching}>
            {searching ? t('tournaments.saving') : t('tournaments.search')}
          </button>
        </form>

        {result === null && <p className="warning">{t('tournaments.pickAccountNotFound')}</p>}

        {result && (
          <div className="account-picker-result">
            <span className="tournaments-mine-name">
              {result.riot_name}#{result.riot_tag}
            </span>
            <button onClick={() => onSelect(result)}>{t('tournaments.select')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountPickerModal;
