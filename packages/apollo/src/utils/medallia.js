/*
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
// Uses the B2B survey style with Trigger Intercepts
const OFFERING_ID = 'offeringId'; // Required for aggregate reporting of NPS scores
const OFFERING_NAME = 'Blockchain Platform'; // Required to identify the product to customer - used in the "How likely..." question
const HIGH_LEVEL_NAME = 'Fabric Operations Console'; // Overall offering group name for high-level aggregation
const TRIGGER_INTERCEPT = 'heavy'; // Desired intercept rate. Options: 'light' (15%), 'medium' (50%), 'heavy' (100%).
const VALID_TRIGGERS = [1, 2, 3, 4, 5, 6, 7, 8].map(num => `trigger${num}`); // array of valid triggers (trigger1, trigget2, ...)

// prettier-ignore
const VALID_MEDALLIA_LANGUAGES = [
	'AI', 'AG', 'AW', 'BS', 'BB', 'BM', 'VG', 'CA', 'KY', 'CW', 'DM', 'DO', 'GD', 'JM', 'MX', 'MS', 'KN', 'LC', 'VC',
	'TT', 'TG', 'TC', 'VI', 'US', 'AR', 'BZ', 'BO', 'BR', 'CL', 'CO', 'CR', 'EC', 'SV', 'FK', 'GF', 'GP', 'GT', 'GY',
	'HT', 'HN', 'MQ', 'NI', 'PA', 'PY', 'PE', 'SR', 'UY', 'VE', 'AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG',
	'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR', 'GL', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI',
	'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'SA', 'SK', 'SI', 'ES', 'SE', 'CH',
	'TR', 'UA', 'GB', 'DZ', 'AO', 'BH', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CM', 'CF', 'TD', 'CG', 'CD', 'DJ', 'EG', 'GQ',
	'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'IL', 'CI', 'JO', 'KE', 'KW', 'LB', 'LS', 'LR', 'MG', 'MW', 'ML', 'MR',
	'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'OM', 'PK', 'PS', 'QA', 'RE', 'RW', 'ST', 'SA', 'SN', 'SC', 'SL', 'SO',
	'ZA', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'AE', 'YE', 'ZM', 'ZW', 'AF', 'AU', 'BD', 'BT', 'IO', 'BN', 'KH', 'CN',
	'CK', 'FJ', 'PF', 'GU', 'HK', 'IN', 'ID', 'JP', 'KZ', 'KI', 'KR', 'KG', 'LA', 'MO', 'MY', 'MV', 'MH', 'MN', 'NR',
	'NP', 'NC', 'NZ', 'NF', 'MP', 'PW', 'PG', 'PH', 'WS', 'SG', 'SB', 'LK', 'TW', 'TJ', 'TH', 'TO', 'TM', 'TV', 'UZ',
	'VU', 'VN', 'WF', 'AX', 'AS', 'AQ', 'BQ', 'BV', 'BU', 'CV', 'CX', 'CC', 'KM', 'CU', 'TP', 'TF', 'GG', 'HM', 'VA',
	'IR', 'IQ', 'IM', 'JE', 'KP', 'LY', 'FM', 'ME', 'MM', 'AN', 'NT', 'NU', 'PN', 'PR', 'BL', 'SH', 'MF', 'PM', 'RS',
	'CS', 'SX', 'GS', 'SS', 'SJ', 'SY', 'TL', 'TK', 'UM', 'EH', 'YU', 'ZR', 'ZZ',
]; // Taken from the "Medallia Digital Technical Implementation Guide"

export const triggers = {
	CREATE_CA: 1,
	CREATE_MSP_DEF: 2,
	CREATE_PEER: 3,
	CREATE_ORDERING_SERVICE: 4,
	CREATE_CHANNEL: 5,
	JOIN_CHANNEL: 6,
	INSTALL_OR_COMMIT_SMART_CONTRACT: 7,
};

export const triggerSurvey = triggerNumber => {
	const triggerName = `trigger${triggerNumber}`;
	if (!VALID_TRIGGERS.includes(triggerName)) {
		console.warn(`Medaillia triggerSurvey called with unknown trigger (${triggerName})`);
		return;
	}

	if (window.KAMPYLE_ONSITE_SDK && typeof window.KAMPYLE_ONSITE_SDK.updatePageView === 'function') {
		window.IBM_Meta[triggerName] = true;
		// As we're a React app we need to call updatePageView on each trigger
		window.KAMPYLE_ONSITE_SDK.updatePageView();
		delete window.IBM_Meta[triggerName];
	} else {
		console.warn('Medallia script not found while attempting to trigger a survey.'); // eslint-disable-line no-console
	}
};

const sanitiseLanguage = activeLanguage => {
	if (!activeLanguage || !activeLanguage.code) {
		return 'en'; // default to en
	}

	const { code } = activeLanguage;
	// Supported app languages are in localization.js
	// If this app has any languages that medaillia doesn't support convert them below
	switch (code) {
		case 'zh-cn': // Common Chinese, zh might be the equivalent
			return 'zh';
		case 'pt-br': // Brazillian Portugese, Portugese appears the closest match
			return 'pt-pt';
		default:
			return code.toLowerCase();
	}
};

const sanitizeEmail = email => {
	// If email doesn't contain an @ or the @ is the first character reformat the email
	// so that it is an email format otherwise Medaillia won't report the survey
	if (!email || !email.includes('@') || email.indexOf('@') === 0) {
		const prefix = email || 'default';
		return `${prefix}@unknownemail.com`;
	}
	return email;
};

const getCountry = () => {
	// Use the browser language to get the locale and then assume a language
	if (window.navigator && window.navigator.languages && window.navigator.languages.length > 0) {
		for (const language of window.navigator.languages) {
			if (language.includes('-')) {
				// Should be in the form en-US now
				const locales = language.split('-');
				if (VALID_MEDALLIA_LANGUAGES.includes(locales[1].toUpperCase())) {
					return locales[1].toUpperCase();
				}
			}
		}
	}

	// Default to US (as we have to send a real country code)
	return 'US';
};

const createMedalliaGlobals = (userInfo, activeLanguage, isDev) => {
	const language = sanitiseLanguage(activeLanguage);
	const country = getCountry();
	const {
		loggedInAs: { name, email },
		uuid,
	} = userInfo;
	const [userFirstName, userLastName = 'n\\a'] = name ? name.toLowerCase().split(' ') : [];
	window.IBM_Meta = {
		offeringId: OFFERING_ID,
		offeringName: OFFERING_NAME,
		highLevelOfferingName: HIGH_LEVEL_NAME,
		triggerIntercept: TRIGGER_INTERCEPT,
		language,
		userFirstName,
		userLastName,
		userEmail: sanitizeEmail(email),
		userId: uuid,
		icn: '',
		iuid: uuid, // The IBM unique ID for the account
		testData: false,
		userIdType: 'IBM Blockchain Platform on IBM Cloud',
		country,
		customerName: 'IBMCustomer',
		trialUser: 'no',
		alwaysOnType: 'diagnostic', // star, osat or diagnostic
	};

	if (isDev) {
		window.IBM_Meta['noQuarantine'] = 'yes'; // Always show surveys when triggered
		window.IBM_Meta['testData'] = true; // Indicate that it's test data in development
	}
};

const injectMedalliaScript = () => {
	const script = document.createElement('script');
	// B2B Survey embed URL
	script.src = 'https://nebula-cdn.kampyle.com/we/28600/onsite/embed.js';
	script.async = true;
	document.body.appendChild(script);
};

export const setupMedallia = (userInfo, activeLanguage, isDev) => {
	createMedalliaGlobals(userInfo, activeLanguage, isDev);
	injectMedalliaScript();
};
