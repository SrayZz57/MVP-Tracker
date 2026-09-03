import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Icon from './Icon.jsx';

// Tour guidé court (demandé sur Discord) : pointe juste les grandes sections
// de la sidebar plutôt que de documenter chaque fonctionnalité en détail —
// un nouvel utilisateur perdu a besoin de savoir OÙ chercher, pas d'un
// manuel complet qu'il ne lira pas. Les étapes ciblent les attributs
// data-tour/data-tour-section posés sur la sidebar dans App.jsx.
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

const CARD_WIDTH = 300;
const MARGIN = 16;

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
    // La sidebar défile (.sidebar-nav a overflow-y: auto) — les dernières
    // sections (Outils) peuvent être hors champ tant qu'on ne les fait pas
    // défiler jusqu'à l'écran, sinon le spotlight pointait dans le vide.
    // Mesure prise APRÈS le scroll (delay calé sur sa durée), sinon on
    // récupère encore l'ancienne position d'avant le défilement.
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const id = setTimeout(update, 350);
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', update);
    };
  }, [step.target]);

  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const next = () => (isLast ? onClose() : setStepIndex((i) => i + 1));
  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  // Position de la carte : à côté de la cible (sidebar, toujours à gauche)
  // si on en a une, sinon centrée à l'écran pour les étapes d'intro/fin.
  const cardStyle = rect
    ? {
        top: Math.min(Math.max(rect.top, MARGIN), window.innerHeight - 220),
        left: Math.min(rect.right + MARGIN, window.innerWidth - CARD_WIDTH - MARGIN),
      }
    : {
        top: window.innerHeight / 2 - 110,
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
        <button type="button" className="onboarding-close" onClick={onClose} title={t('onboarding.skip')}>
          <Icon icon={X} size={16} />
        </button>
        <h3>{t(step.titleKey)}</h3>
        <p className="label">{t(step.textKey)}</p>
        <div className="onboarding-footer">
          <span className="label">{stepIndex + 1}/{STEPS.length}</span>
          <div className="onboarding-actions">
            {!isFirst && (
              <button className="account-forgot-password" onClick={prev}>
                {t('onboarding.previous')}
              </button>
            )}
            <button className="refresh" onClick={next}>
              {isLast ? t('onboarding.finish') : t('onboarding.next')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default OnboardingTour;
