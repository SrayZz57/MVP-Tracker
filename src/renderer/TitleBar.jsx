import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Square, Copy, X } from 'lucide-react';
import logo from '../assets/logo.png';
import Icon from './Icon.jsx';
import Button from './ui/Button';

function TitleBar() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.isWindowMaximized().then(setMaximized);
    return window.electronAPI.onWindowMaximizedChange(setMaximized);
  }, []);

  const maximizeLabel = maximized ? t('titleBar.restore') : t('titleBar.maximize');

  return (
    <div className="title-bar">
      <div className="title-bar-brand">
        <img src={logo} alt="" />
        <span>MVP Tracker</span>
      </div>
      <div className="title-bar-controls">
        <Button
          variant="icon"
          className="title-bar-btn"
          onClick={() => window.electronAPI.minimizeWindow()}
          title={t('titleBar.minimize')}
          aria-label={t('titleBar.minimize')}
        >
          <Icon icon={Minus} size={15} />
        </Button>
        <Button
          variant="icon"
          className="title-bar-btn"
          onClick={() => window.electronAPI.toggleMaximizeWindow()}
          title={maximizeLabel}
          aria-label={maximizeLabel}
        >
          <Icon icon={maximized ? Copy : Square} size={13} />
        </Button>
        <Button
          variant="icon"
          className="title-bar-btn close"
          onClick={() => window.electronAPI.closeWindow()}
          title={t('titleBar.close')}
          aria-label={t('titleBar.close')}
        >
          <Icon icon={X} size={16} />
        </Button>
      </div>
    </div>
  );
}

export default TitleBar;
