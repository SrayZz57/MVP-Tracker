import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

function SkinDetailModal({ skin, isWishlisted, isOwned, onToggleWishlist, onToggleCollection, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="modal-close" onClick={onClose}>{t('skins.close')}</Button>

        <div
          className="modal-banner"
          style={skin.displayIcon ? { backgroundImage: `url(${skin.displayIcon})` } : undefined}
        >
          <div className="modal-banner-text">
            <h2>{skin.name}</h2>
            <p style={{ color: skin.tierColor }}>{t('skins.edition', { tier: skin.tierName, weapon: skin.weaponName })}</p>
          </div>
        </div>

        {skin.video && (
          <div className="card">
            <h3>{t('skins.preview')}</h3>
            <video src={skin.video} controls muted loop style={{ width: '100%', borderRadius: '8px' }} />
          </div>
        )}

        <div className="card">
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{skin.estimatedPriceVp} VP</div>
              <div className="label">{t('skins.estimatedPrice', { tier: skin.tierName })}</div>
            </div>
            <div className="stat-tile">
              <div className="value">{(skin.estimatedPriceVp * 0.01).toFixed(2)}€</div>
              <div className="label">{t('skins.euroApprox')}</div>
            </div>
          </div>
          <div className="skin-detail-actions">
            <Button variant="ghost" onClick={onToggleWishlist}>
              {isWishlisted ? t('skins.removeFromWishlist') : t('skins.addToWishlist')}
            </Button>
            <Button variant="ghost" onClick={onToggleCollection}>
              {isOwned ? t('skins.removeOwned') : t('skins.addOwned')}
            </Button>
          </div>
        </div>

        {skin.chromas.length > 1 && (
          <div className="card">
            <h3>{t('skins.colorVariants')}</h3>
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
