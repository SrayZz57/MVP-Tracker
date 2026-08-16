function SkinDetailModal({ skin, isWishlisted, isOwned, onToggleWishlist, onToggleCollection, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div
          className="modal-banner"
          style={skin.displayIcon ? { backgroundImage: `url(${skin.displayIcon})` } : undefined}
        >
          <div className="modal-banner-text">
            <h2>{skin.name}</h2>
            <p style={{ color: skin.tierColor }}>{skin.tierName} Edition — {skin.weaponName}</p>
          </div>
        </div>

        {skin.video && (
          <div className="card">
            <h3>Aperçu</h3>
            <video src={skin.video} controls muted loop style={{ width: '100%', borderRadius: '8px' }} />
          </div>
        )}

        <div className="card">
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{skin.estimatedPriceVp} VP</div>
              <div className="label">Prix estimé (rareté {skin.tierName})</div>
            </div>
            <div className="stat-tile">
              <div className="value">{(skin.estimatedPriceVp * 0.01).toFixed(2)}€</div>
              <div className="label">≈ en euros (1000 VP = 10€)</div>
            </div>
          </div>
          <div className="skin-detail-actions">
            <button onClick={onToggleWishlist}>
              {isWishlisted ? '★ Retirer de la wishlist' : '☆ Ajouter à ma wishlist'}
            </button>
            <button onClick={onToggleCollection}>
              {isOwned ? '✓ Je le possède (retirer)' : '+ Je possède ce skin'}
            </button>
          </div>
        </div>

        {skin.chromas.length > 1 && (
          <div className="card">
            <h3>Variantes de couleur</h3>
            <div className="skin-chroma-row">
              {skin.chromas
                .filter((chroma) => chroma.swatch)
                .map((chroma) => (
                  <img key={chroma.uuid} src={chroma.swatch} alt={chroma.displayName} className="skin-chroma-swatch" />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SkinDetailModal;
