import { useEffect, useMemo, useState } from 'react';
import { useSkinsCatalog } from './skinsData.js';
import SkinDetailModal from './SkinDetailModal.jsx';

const PAGE_SIZE = 30;

const VIEWS = [
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'collection', label: 'Ma collection' },
];

function SkinCard({ skin, onClick, badge }) {
  return (
    <div className="skin-card" style={{ borderColor: skin.tierColor }} onClick={onClick}>
      <img src={skin.displayIcon} alt={skin.name} />
      <p className="skin-card-name">{skin.name}</p>
      <p className="label" style={{ color: skin.tierColor }}>{skin.tierName} — {skin.weaponName}</p>
      <p className="skin-card-price">{skin.estimatedPriceVp} VP</p>
      {badge}
    </div>
  );
}

function SkinsCatalog() {
  const catalog = useSkinsCatalog();
  const [view, setView] = useState('catalogue');
  const [wishlist, setWishlist] = useState([]);
  const [collection, setCollection] = useState([]);
  const [selectedSkin, setSelectedSkin] = useState(null);

  const [search, setSearch] = useState('');
  const [weaponFilter, setWeaponFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    window.electronAPI.getSkinsWishlist().then(setWishlist);
    window.electronAPI.getSkinsCollection().then(setCollection);
  }, []);

  const weaponNames = useMemo(
    () => (catalog ? [...new Set(catalog.map((s) => s.weaponName))].sort() : []),
    [catalog],
  );
  const tierNames = useMemo(() => {
    if (!catalog) return [];
    const byRank = new Map(catalog.map((s) => [s.tierName, s.tierRank]));
    return [...byRank.keys()].sort((a, b) => byRank.get(a) - byRank.get(b));
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    const term = search.trim().toLowerCase();
    const min = priceMin === '' ? -Infinity : Number(priceMin);
    const max = priceMax === '' ? Infinity : Number(priceMax);
    return catalog.filter(
      (s) =>
        (term === '' || s.name.toLowerCase().includes(term)) &&
        (weaponFilter === '' || s.weaponName === weaponFilter) &&
        (tierFilter === '' || s.tierName === tierFilter) &&
        s.estimatedPriceVp >= min &&
        s.estimatedPriceVp <= max,
    );
  }, [catalog, search, weaponFilter, tierFilter, priceMin, priceMax]);

  const wishlistSkins = useMemo(
    () => (catalog ? catalog.filter((s) => wishlist.includes(s.uuid)) : []),
    [catalog, wishlist],
  );

  const collectionSkins = useMemo(() => {
    if (!catalog) return [];
    return collection
      .map((entry) => {
        const skin = catalog.find((s) => s.uuid === entry.uuid);
        return skin ? { ...skin, priceVp: entry.priceVp } : null;
      })
      .filter(Boolean);
  }, [catalog, collection]);

  const totalValueEuros = useMemo(
    () => collection.reduce((sum, entry) => sum + (entry.priceVp || 0), 0) * 0.01,
    [collection],
  );

  const handleToggleWishlist = (uuid) => {
    window.electronAPI.toggleSkinWishlist(uuid).then(setWishlist);
  };

  const handleToggleCollection = (skin) => {
    window.electronAPI.toggleSkinCollection(skin.uuid, skin.estimatedPriceVp).then(setCollection);
  };

  const handleSetPrice = (uuid, priceVp) => {
    window.electronAPI.setSkinCollectionPrice(uuid, priceVp).then(setCollection);
  };

  if (!catalog) {
    return <p>Chargement du catalogue de skins...</p>;
  }

  const visibleCatalog = showAll ? filteredCatalog : filteredCatalog.slice(0, PAGE_SIZE);

  return (
    <div>
      <nav className="tabs" style={{ marginBottom: '1rem' }}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className={v.id === view ? 'tab active' : 'tab'}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {view === 'catalogue' && (
        <div className="card">
          <h3>Catalogue ({filteredCatalog.length} skins)</h3>
          <div className="filter-bar">
            <input
              placeholder="Rechercher un skin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={weaponFilter} onChange={(e) => setWeaponFilter(e.target.value)}>
              <option value="">Toutes les armes</option>
              {weaponNames.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
              <option value="">Toutes les raretés</option>
              {tierNames.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Prix min (VP)"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              style={{ width: '110px' }}
            />
            <input
              type="number"
              placeholder="Prix max (VP)"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              style={{ width: '110px' }}
            />
          </div>

          <div className="skin-grid">
            {visibleCatalog.map((skin) => (
              <SkinCard key={skin.uuid} skin={skin} onClick={() => setSelectedSkin(skin)} />
            ))}
          </div>
          {filteredCatalog.length > PAGE_SIZE && (
            <button className="show-more-btn" onClick={() => setShowAll(!showAll)}>
              {showAll ? '▲ Voir moins' : `▼ Voir plus (${filteredCatalog.length - PAGE_SIZE})`}
            </button>
          )}
        </div>
      )}

      {view === 'wishlist' && (
        <div className="card">
          <h3>Wishlist ({wishlistSkins.length})</h3>
          {wishlistSkins.length === 0 ? (
            <p>Aucun skin en wishlist pour l'instant — ajoutes-en depuis le catalogue.</p>
          ) : (
            <div className="skin-grid">
              {wishlistSkins.map((skin) => (
                <SkinCard key={skin.uuid} skin={skin} onClick={() => setSelectedSkin(skin)} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'collection' && (
        <div>
          <div className="card collection-value-card">
            <div className="value">{totalValueEuros.toFixed(2)}€</div>
            <div className="label">Valeur totale de ton compte ({collectionSkins.length} skins possédés)</div>
          </div>

          <div className="card">
            <h3>Ma collection</h3>
            {collectionSkins.length === 0 ? (
              <p>Aucun skin marqué comme possédé pour l'instant.</p>
            ) : (
              <div className="skin-grid">
                {collectionSkins.map((skin) => (
                  <div key={skin.uuid} className="skin-card" style={{ borderColor: skin.tierColor }}>
                    <img src={skin.displayIcon} alt={skin.name} onClick={() => setSelectedSkin(skin)} />
                    <p className="skin-card-name">{skin.name}</p>
                    <p className="label" style={{ color: skin.tierColor }}>{skin.tierName} — {skin.weaponName}</p>
                    <div className="skin-price-row">
                      <input
                        type="number"
                        className="skin-price-input"
                        value={skin.priceVp}
                        onChange={(e) => handleSetPrice(skin.uuid, Number(e.target.value))}
                      />
                      <span className="label">VP</span>
                    </div>
                    <button onClick={() => handleToggleCollection(skin)}>Retirer de ma collection</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSkin && (
        <SkinDetailModal
          skin={selectedSkin}
          isWishlisted={wishlist.includes(selectedSkin.uuid)}
          isOwned={collection.some((e) => e.uuid === selectedSkin.uuid)}
          onToggleWishlist={() => handleToggleWishlist(selectedSkin.uuid)}
          onToggleCollection={() => handleToggleCollection(selectedSkin)}
          onClose={() => setSelectedSkin(null)}
        />
      )}
    </div>
  );
}

export default SkinsCatalog;
