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
		},
		react: {
			transEmptyNodeValue: '', // what to return for empty Trans
			transSupportBasicHtmlNodes: true, // allow <br/> and simple html elements in translations
			transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'span'], // don't convert to <1></1> if simple react elements
			transWrapTextNodes: '',
		}
	});

export default i18n;
