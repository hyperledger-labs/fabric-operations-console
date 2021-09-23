/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
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
