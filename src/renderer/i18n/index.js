import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

// Langue posée de façon synchrone dès le premier rendu (avant même le fetch
// IPC de la préférence sauvegardée) — évite un flash en français le temps
// que electron-store réponde. App.jsx corrige ensuite avec la vraie valeur
// persistée via `changeLanguage()`.
i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
