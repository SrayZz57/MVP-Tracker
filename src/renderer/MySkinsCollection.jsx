import { useEffect, useMemo, useState } from 'react';
import { useSkinsCatalog } from './skinsData.js';
import SkinDetailModal from './SkinDetailModal.jsx';
import Skeleton from './Skeleton.jsx';
import CountUp from './CountUp.jsx';

// Page dédiée à la collection personnelle — auparavant un petit onglet noyé
// dans "Skins", maintenant sa propre page dans "Mon compte" puisque c'est une
// donnée intrinsèquement personnelle (pas liée au joueur qu'on suit).
function MySkinsCollection() {
  const catalog = useSkinsCatalog();
  const [collection, setCollection] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [selectedSkin, setSelectedSkin] = useState(null);

  useEffect(() => {
    window.electronAPI.getSkinsCollection().then(setCollection);
    window.electronAPI.getSkinsWishlist().then(setWishlist);
  }, []);

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
    return (
      <div className="card">
        <Skeleton lines={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="card comp-score-card">
        <div className="comp-score-main">
          <div className="comp-score-ring" style={{ background: 'conic-gradient(#ffc857, #ff8fab, #ffc857)' }}>
            <div className="comp-score-ring-inner">
              <div className="comp-score-value" style={{ color: '#ffc857', fontSize: '1.7rem' }}>
                <CountUp value={totalValueEuros} decimals={2} suffix="€" />
              </div>
            </div>
          </div>
          <div className="label">Valeur totale de ta collection ({collectionSkins.length} skins possédés)</div>
        </div>
      </div>

      <div className="card">
        <h3>💎 Ma collection</h3>
        {collectionSkins.length === 0 ? (
          <p>Aucun skin marqué comme possédé pour l'instant — ajoutes-en depuis le catalogue (onglet Skins).</p>
        ) : (
          <div className="skin-grid">
            {collectionSkins.map((skin) => (
              <div
                key={skin.uuid}
                className="skin-card"
                style={{ borderColor: skin.tierColor, '--tier-color': skin.tierColor }}
              >
                <div className="skin-card-img-wrap" onClick={() => setSelectedSkin(skin)}>
                  <img src={skin.displayIcon} alt={skin.name} />
                </div>
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

export default MySkinsCollection;
