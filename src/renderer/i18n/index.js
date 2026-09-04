import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LANGS, DEFAULT_LANG } from './config.js';

import frCommon from './fr/common.json';
import frAccount from './fr/account.json';
import frAim from './fr/aim.json';
import frCollection from './fr/collection.json';
import frOverlay from './fr/overlay.json';
import frSessions from './fr/sessions.json';
import frSocial from './fr/social.json';
import frStats from './fr/stats.json';
import frStrategy from './fr/strategy.json';
import frTournaments from './fr/tournaments.json';
import frWiki from './fr/wiki.json';

import enCommon from './en/common.json';
import enAccount from './en/account.json';
import enAim from './en/aim.json';
import enCollection from './en/collection.json';
import enOverlay from './en/overlay.json';
import enSessions from './en/sessions.json';
import enSocial from './en/social.json';
import enStats from './en/stats.json';
import enStrategy from './en/strategy.json';
import enTournaments from './en/tournaments.json';
import enWiki from './en/wiki.json';

const DICTS = {
  fr: {
    ...frCommon,
    ...frAccount,
    ...frAim,
    ...frCollection,
    ...frOverlay,
    ...frSessions,
    ...frSocial,
    ...frStats,
    ...frStrategy,
    ...frTournaments,
    ...frWiki,
  },
  en: {
    ...enCommon,
    ...enAccount,
    ...enAim,
    ...enCollection,
    ...enOverlay,
    ...enSessions,
    ...enSocial,
    ...enStats,
    ...enStrategy,
    ...enTournaments,
    ...enWiki,
  },
};

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(LANGS.map((lang) => [lang, { translation: DICTS[lang] }])),
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
