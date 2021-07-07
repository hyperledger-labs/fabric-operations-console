import React from 'react';
import PropTypes from 'prop-types';
import './welcomeBannerGroup.scss';

const WelcomeBannerGroup = ({ header, children, className }) => {
	return (
		<div className={`ibp-welcome-group-section ${className ? className : ''}`}>
			<h3 className="ibp-welcome-banner-group-header">{header}</h3>
			<div className="ibp-welcome-banner-group-content">{children}</div>
		</div>
	);
};

WelcomeBannerGroup.propTypes = {
	className: PropTypes.string,
	header: PropTypes.string,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};

export default WelcomeBannerGroup;
