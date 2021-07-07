import React from 'react';
import PropTypes from 'prop-types';
import { InlineNotification } from 'carbon-components-react';
import { withLocalize } from 'react-localize-redux';

const SidePanelWarning = props => {
	const translate = props.translate;
	return (
		<div className={(props.className ? props.className + ' ' : '') + 'ibp-side-panel-warning'}>
			<InlineNotification
				kind={props.kind ? props.kind : 'warning'}
				className={props.kind === 'warning' ? 'ibp-side-panel-warning-notification' : ''}
				title={translate(props.title)}
				subtitle={props.subtitle && typeof props.subtitle === 'string' ? translate(props.subtitle) : props.subtitle ? props.subtitle : null}
				hideCloseButton={true}
				caption=""
			/>
		</div>
	);
};

SidePanelWarning.defaultProps = {
	kind: 'warning',
};

SidePanelWarning.propTypes = {
	className: PropTypes.string,
	kind: PropTypes.string,
	title: PropTypes.string.isRequired,
	subtitle: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(SidePanelWarning);
