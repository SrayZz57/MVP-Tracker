import { useTranslation } from 'react-i18next';
import { useCollapsedBlocks } from './CollapsedBlocksContext.jsx';

// Remplace `<div className="card">...<h3>Titre</h3>...</div>` : le titre
// reste visible une fois le bloc réduit, avec un bouton "Réduire"/"Agrandir"
// bien visible (pas juste un petit chevron discret — demande explicite après
// un premier essai jugé pas assez repérable). État mémorisé par compte lié —
// voir CollapsedBlocksContext.jsx. `id` doit être stable et unique dans toute
// l'app (ex. "stats.profileHeader"), pas dérivé d'un index de liste.
function CollapsibleCard({ id, title, className = '', headerExtra, children }) {
  const { t } = useTranslation();
  const { collapsed, toggle } = useCollapsedBlocks();
  const isCollapsed = collapsed.has(id);

  return (
    <div className={`card collapsible-card ${isCollapsed ? 'collapsed' : ''} ${className}`.trim()}>
      <div className="collapsible-card-header">
        <h3>{title}</h3>
        <div className="collapsible-card-header-actions">
          {headerExtra}
          <button type="button" className="collapsible-card-toggle" onClick={() => toggle(id)}>
            <span className="collapsible-card-chevron">▾</span>
            {isCollapsed ? t('collapsible.expand') : t('collapsible.collapse')}
          </button>
        </div>
      </div>
      {!isCollapsed && <div className="collapsible-card-body">{children}</div>}
    </div>
  );
}

export default CollapsibleCard;
