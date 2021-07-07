import React from 'react';
import PropTypes from 'prop-types';
import Close from '@carbon/icons-react/lib/close/20';

const SidePanelInlineConfirmation = props => {
	return (
		<div className={`ibp-side-panel-inline-confirmation-container ${props.opening}`}>
			<h4 className="ibp-side-panel-inline-confirmation-title">{props.title}</h4>
			<p className="ibp-side-panel-inline-confirmation-subtitle">{props.subtitle}</p>
			<Close aria-label="Close"
				className="ibp-side-panel-inline-close-icon"
				onClick={props.clearNotification}
			/>
		</div>
	);
};

SidePanelInlineConfirmation.propTypes = {
	title: PropTypes.string,
	subtitle: PropTypes.string,
	clearNotification: PropTypes.func,
	opening: PropTypes.string,
};

export default SidePanelInlineConfirmation;
