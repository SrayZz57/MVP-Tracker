import { useTranslation } from 'react-i18next';

export function SkeletonBox({ w, h, r, className = '', style }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

export function SkeletonText({ children, className = '', style }) {
  return (
    <span className={`skeleton skeleton-text ${className}`.trim()} style={style}>
      {children}
    </span>
  );
}

export function SkeletonCircle({ size, className = '', style }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: '50%', flex: '0 0 auto', ...style }}
    />
  );
}

function Skeleton({ label, className = '', children }) {
  const { t } = useTranslation();
  return (
    <div className={`skeleton-root ${className}`.trim()} role="status" aria-busy="true">
      <span className="sr-only">{label ?? t('common.loadingContent')}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export default Skeleton;
