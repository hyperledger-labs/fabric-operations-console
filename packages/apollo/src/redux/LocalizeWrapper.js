import React from 'react';
import PropTypes from 'prop-types';
import { withLocalize } from 'react-localize-redux';
import localization from '../utils/localization';

class LocalizeWrapper extends React.Component {
	constructor(props) {
		super(props);
		localization.init(props);
	}
	render() {
		const { children } = this.props;
		return <>{children}</>;
	}
}

LocalizeWrapper.propTypes = {
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};

export default withLocalize(LocalizeWrapper);
