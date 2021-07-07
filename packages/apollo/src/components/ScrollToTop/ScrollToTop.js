import { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';

export class ScrollToTop extends Component {
	componentDidUpdate(prevProps) {
		if (this.props.location !== prevProps.location) {
			window.scrollTo(0, 0);
		}
	}

	render() {
		return this.props.children;
	}
}

ScrollToTop.propTypes = {
	location: PropTypes.object,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};

export default withRouter(ScrollToTop);
