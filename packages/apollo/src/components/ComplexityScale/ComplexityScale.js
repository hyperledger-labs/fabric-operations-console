import React from 'react';
import PropTypes from 'prop-types';
import { green, yellow, red } from '@carbon/colors';

const ComplexityScale = ({ level }) => {
	return (
		<div className="ibp-complexity-scale-outer-container">
			<p className="ibp-complexity-level-label">{level}</p>
			<div className={`ibp-complexity-scale-container ibp-complexity-level-${level}`}>
				<span
					className="ibp-complexity-scale-item"
					style={{
						backgroundColor: (level === 'Simple' || level === 'Complex' || level === 'Moderate') && green[50],
					}}
				/>
				<span
					className="ibp-complexity-scale-item"
					style={{
						backgroundColor: (level === 'Moderate' || level === 'Complex') && yellow,
					}}
				/>
				<span
					className="ibp-complexity-scale-item"
					style={{
						backgroundColor: level === 'Complex' && red[50],
					}}
				/>
			</div>
		</div>
	);
};

ComplexityScale.propTypes = {
	level: PropTypes.oneOf(['Simple', 'Moderate', 'Complex']),
};

export default ComplexityScale;
