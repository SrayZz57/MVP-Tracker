import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button';

const STEPS = [
  { id: 'welcome', target: null, titleKey: 'onboarding.welcomeTitle', textKey: 'onboarding.welcomeText' },
  { id: 'search', target: '[data-tour="sidebar-search"]', titleKey: 'onboarding.searchTitle', textKey: 'onboarding.searchText' },
  {
    id: 'performance',
    target: '[data-tour-section="nav.sections.performance"]',
    titleKey: 'onboarding.performanceTitle',
    textKey: 'onboarding.performanceText',
  },
  {
    id: 'myAccount',
    target: '[data-tour-section="nav.sections.myAccount"]',
    titleKey: 'onboarding.myAccountTitle',
    textKey: 'onboarding.myAccountText',
  },
  {
    id: 'tournaments',
    target: '[data-tour-section="nav.sections.tournaments"]',
    titleKey: 'onboarding.tournamentsTitle',
    textKey: 'onboarding.tournamentsText',
  },
  {
    id: 'training',
    target: '[data-tour-section="nav.sections.training"]',
    titleKey: 'onboarding.trainingTitle',
    textKey: 'onboarding.trainingText',
  },
  {
    id: 'tools',
    target: '[data-tour-section="nav.sections.tools"]',
    titleKey: 'onboarding.toolsTitle',
    textKey: 'onboarding.toolsText',
  },
  { id: 'end', target: null, titleKey: 'onboarding.endTitle', textKey: 'onboarding.endText' },
];

const CARD_WIDTH = 420;
const MARGIN = 16;
const CARD_MIN_HEIGHT = 240;

function OnboardingTour({ onClose }) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!step.target) {
      setRect(null);
      return undefined;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return undefined;
    }
    const update = () => setRect(el.getBoundingClientRect());
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const id = setTimeout(update, 350);
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', update);
    };
  }, [step.target]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const next = () => (isLast ? onClose() : setStepIndex((i) => i + 1));
  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  const cardStyle = rect
    ? {
        top: Math.min(Math.max(rect.top, MARGIN), window.innerHeight - CARD_MIN_HEIGHT - MARGIN),
        left: Math.min(rect.right + MARGIN, window.innerWidth - CARD_WIDTH - MARGIN),
      }
    : {
        top: window.innerHeight / 2 - CARD_MIN_HEIGHT / 2,
        left: window.innerWidth / 2 - CARD_WIDTH / 2,
      };

  return createPortal(
    <div className="onboarding-tour">
      {rect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      {!rect && <div className="onboarding-backdrop" />}

      <div className="onboarding-card" style={cardStyle}>
        <Button
          variant="icon"
          type="button"
          className="onboarding-close"
          onClick={onClose}
          title={t('onboarding.skip')}
          aria-label={t('onboarding.skip')}
        >
          <Icon icon={X} size={16} />
        </Button>
        <h3>{t(step.titleKey)}</h3>
        <p className="label">{t(step.textKey)}</p>
        <div className="onboarding-footer">
          <div className="onboarding-progress">
            <span className="onboarding-step-count">
              {stepIndex + 1}/{STEPS.length}
            </span>
            <Button variant="ghost" size="sm" className="onboarding-skip" onClick={onClose}>
              {t('onboarding.skip')}
            </Button>
          </div>
          <div className="onboarding-actions">
            {!isFirst && (
              <Button variant="ghost" size="sm" className="account-forgot-password" onClick={prev}>
                {t('onboarding.previous')}
              </Button>
            )}
            <Button variant="primary" size="sm" className="refresh" onClick={next}>
              {isLast ? t('onboarding.finish') : t('onboarding.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default OnboardingTour;
