/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
import { renderToStaticMarkup } from 'react-dom/server';
import defaultTranslation from '../assets/i18n/en/messages.json';
import Helper from './helper';

// INJECT TRANSLATIONS IF FILES PRESENT
const Data = {};

const Localization = {
	langs: [
		{ name: 'English', code: 'en' },
		// Enable the following languages when we have translations available
		{ name: 'German', code: 'de' },
		{ name: 'Spanish', code: 'es' },
		{ name: 'French', code: 'fr' },
		{ name: 'Italian', code: 'it' },
		{ name: 'Japanese', code: 'ja' },
		{ name: 'Korean', code: 'ko' },
		{ name: 'Brazilian Portugese', code: 'pt-br' },
		{ name: 'Simplified Chinese', code: 'zh-cn' },
		{ name: 'Traditional Chinese', code: 'zh-tw' },
	],

	loaded: {
		en: defaultTranslation,
	},

	getTranslation: function (lang, callback) {
		if (this.loaded[lang]) {
			callback(this.loaded[lang]);
		} else {
			callback(Data[lang]);
		}
	},

	onMissingTranslation: function (data) {
		if (data.translationId === 'ibm_saas') {
			const ibm_saas = Helper.getPlatform();
			if (this.loaded[data.languageCode][ibm_saas]) {
				return this.loaded[data.languageCode][ibm_saas];
			}
			return this.loaded['en'][ibm_saas];
		}
		return data.translationId;
	},

	init: function (props) {
		delete defaultTranslation.ibm_saas;
		props.initialize({
			languages: this.langs,
			translation: defaultTranslation,
			options: {
				renderToStaticMarkup,
				renderInnerHtml: true,
				defaultLanguage: 'en',
				onMissingTranslation: data => this.onMissingTranslation(data),
			},
		});

		// In the future use server-side logic to get the
		// user's preferred language.  This temporary logic will
		// not work for IE
		const preferred = navigator.language;
		if (preferred) {
			let code = preferred.toLowerCase();
			let found = null;
			// check for language and locale match
			this.langs.forEach(lang => {
				if (lang.code === code) {
					found = lang.code;
				}
			});
			if (!found && code.length > 2) {
				// check for language match
				code = code.substring(0, 2);
				this.langs.forEach(lang => {
					if (lang.code === code) {
						found = lang.code;
					}
				});
			}
			if (found) {
				this.getTranslation(found, translations => {
					props.addTranslationForLanguage(
						{
							...defaultTranslation,
							...translations,
						},
						found
					);
					props.setActiveLanguage(found);
					document.documentElement.setAttribute('lang', found);
				});
			}
		}
	},
};

export default Localization;
