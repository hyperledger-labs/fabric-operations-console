import React from 'react';
import { useTranslation } from 'react-i18next';

const withLocalize = Component => {
	const ComponentWithLocalizeProp = props => {
		const { t } = useTranslation();
		return (
			<Component
				{...props}
				translate={(key, options) => {
					return t(key, options);
				}}
			/>
		);
	}

	return ComponentWithLocalizeProp;
}

export default withLocalize;
