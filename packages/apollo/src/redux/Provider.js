import React from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { LocalizeProvider } from 'react-localize-redux';
import store from './Store';
import LocalizeWrapper from './LocalizeWrapper';

const ProviderWrapper = ({ children }) => (
	<Provider store={store}>
		<LocalizeProvider>
			<LocalizeWrapper>{children}</LocalizeWrapper>
		</LocalizeProvider>
	</Provider>
);

ProviderWrapper.propTypes = {
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
	store: PropTypes.object,
};

export default ProviderWrapper;
