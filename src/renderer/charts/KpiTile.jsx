import Icon from '../Icon.jsx';
import CountUp from '../CountUp.jsx';

function KpiTile({ label, value, suffix = '', decimals = 0, icon }) {
  return (
    <div className="kpi-tile">
      {icon && <div className="kpi-tile-icon"><Icon icon={icon} /></div>}
      <div className="kpi-tile-value">{value === null ? '?' : <CountUp value={value} decimals={decimals} suffix={suffix} />}</div>
      <div className="kpi-tile-label">{label}</div>
    </div>
  );
}

export default KpiTile;
