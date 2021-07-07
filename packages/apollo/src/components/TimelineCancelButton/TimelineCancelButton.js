import React from 'react';
import PropTypes from 'prop-types';
import { withLocalize } from 'react-localize-redux';

const TimelineCancelButton = ({ onClose, closeMessage, translate }) => {
	return (
		<button className="ibp-timeline-cancel-button"
			onClick={() => onClose()}
		>
			<p className="ibp-timeline-cancel-button-label">{translate('cancel')}</p>
			<p className="ibp-timeline-cancel-button-label-subtext">{!closeMessage ? translate('progress_will_not_save') : translate(closeMessage)}</p>
		</button>
	);
};

TimelineCancelButton.propTypes = {
	onClose: PropTypes.func,
	closeMessage: PropTypes.string,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(TimelineCancelButton);
