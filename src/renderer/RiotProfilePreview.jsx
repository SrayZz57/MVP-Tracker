import { usePlayerCardArt, useRankTiers } from './rankData.js';

// Aperçu compact d'un profil Valorant (bannière, icône, pseudo, rang) —
// réutilisé sur l'écran de confirmation de liaison et sur l'écran d'accueil
// une fois le compte lié.
function RiotProfilePreview({ name, tag, cardUuid, rank }) {
  const rankTiers = useRankTiers();
  const art = usePlayerCardArt(cardUuid);
  const tier = rank ? rankTiers.get(rank.tierId) : null;

  return (
    <div
      className="riot-preview-card"
      style={{ backgroundImage: art.banner ? `url(${art.banner})` : undefined, borderColor: tier?.color }}
    >
      <div className="riot-preview-overlay">
        {art.icon && <img src={art.icon} alt="" className="riot-preview-icon" />}
        <div className="riot-preview-info">
          <div className="riot-preview-name">
            {name}
            <span className="profile-tag">#{tag}</span>
          </div>
          {rank ? (
            <div className="riot-preview-rank">
              {tier?.icon && <img src={tier.icon} alt="" />}
              <span style={{ color: tier?.color }}>
                {rank.tierName} — {rank.rr} RR
              </span>
            </div>
          ) : (
            <div className="riot-preview-rank label">Rang indisponible</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiotProfilePreview;
