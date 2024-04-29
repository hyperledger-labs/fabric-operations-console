import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import defaultTranslation from '../assets/i18n/en/messages.json';

i18n
  .use(initReactI18next)
  .init({
    debug: false,
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
