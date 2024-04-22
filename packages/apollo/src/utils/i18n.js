import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// import LanguageDetector from 'i18next-browser-languagedetector';
import defaultTranslation from '../assets/i18n/en/messages.json';

i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
//   .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    debug: true,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: defaultTranslation
      }
    }
  });

export default i18n;
