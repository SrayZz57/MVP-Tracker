import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import FlagGB from 'country-flag-icons/react/3x2/GB';
import FlagFR from 'country-flag-icons/react/3x2/FR';
import Icon from './Icon.jsx';
import { LANGS, DEFAULT_LANG, isLang } from '../i18n/config.js';

const FLAGS = { fr: FlagFR, en: FlagGB };

export default function LangSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  const current = isLang(i18n.language) ? i18n.language : DEFAULT_LANG;
  const CurrentFlag = FLAGS[current];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onFocusIn = () => {
      if (!rootRef.current?.contains(document.activeElement)) setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  const select = (lang) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (lang === current) return;
    i18n.changeLanguage(lang);
    window.electronAPI.saveLanguage(lang);
  };

  return (
    <div className="lang-switch" ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="lang-switch-button"
        aria-label={`${t('nav.languageLabel')} : ${t(`nav.languages.${current}`)}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <CurrentFlag className="flag-icon" />
        <span>{current.toUpperCase()}</span>
        <Icon icon={ChevronDown} size={14} className="lang-switch-caret" />
      </button>

      {open && (
        <div className="lang-switch-menu" role="menu">
          {LANGS.map((lang) => {
            const Flag = FLAGS[lang];
            const active = lang === current;
            return (
              <button
                key={lang}
                type="button"
                role="menuitem"
                className={`lang-switch-item${active ? ' is-current' : ''}`}
                aria-current={active || undefined}
                onClick={() => select(lang)}
              >
                <Flag className="flag-icon" />
                {t(`nav.languages.${lang}`)}
                {active && <Icon icon={Check} size={15} className="lang-switch-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
