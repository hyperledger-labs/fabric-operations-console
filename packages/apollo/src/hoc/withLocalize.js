import React from 'react';
import { useTranslation } from 'react-i18next';

const withLocalize = Component => {
	const ComponentWithLocalizeProp = props => {
		const { t } = useTranslation();
		const hasHtmlTags = (value) => {
			const pattern = /(&[^\s]*;|<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[\^'">\s]+))?)+\s*|\s*)\/?>)/;
			return value.search(pattern) >= 0;
		  }

		const convert = (key, options) => {
			const translatedValue = t(key, options);
			if(hasHtmlTags(translatedValue)) {
				return React.createElement('span', {
					dangerouslySetInnerHTML: { __html: translatedValue }
				});
			}

			return translatedValue;
		}
		return (
			<Component
				{...props}
				translate={convert}
			/>
		);
	}

	return ComponentWithLocalizeProp;
}

export default withLocalize;
