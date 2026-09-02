import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useCollapsedBlocks } from './CollapsedBlocksContext.jsx';
import Icon from './Icon.jsx';
import Button from './ui/Button';

function CollapsibleCard({ id, title, className = '', headerExtra, collapsible = true, children }) {
  const { t } = useTranslation();
  const { collapsed, toggle } = useCollapsedBlocks();
  const isCollapsed = collapsible && collapsed.has(id);

  return (
    <div className={`card collapsible-card ${isCollapsed ? 'collapsed' : ''} ${className}`.trim()}>
      <div className="collapsible-card-header">
        <h3>{title}</h3>
        {(headerExtra || collapsible) && (
          <div className="collapsible-card-header-actions">
            {headerExtra}
            {collapsible && (
              <Button variant="ghost" type="button" className="collapsible-card-toggle" onClick={() => toggle(id)}>
                <span className="collapsible-card-chevron"><Icon icon={ChevronDown} size={16} /></span>
                {isCollapsed ? t('collapsible.expand') : t('collapsible.collapse')}
              </Button>
            )}
          </div>
        )}
      </div>
      {!isCollapsed && <div className="collapsible-card-body">{children}</div>}
    </div>
  );
}

export default CollapsibleCard;
