/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
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
import PropTypes from 'prop-types';
import React from 'react';
import SvgContainer from './SvgContainer';

const ArrowRight = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '26px'}
			height={height || '25px'}
			extendClass={extendClass}
			viewBox="0 0 26 25"
		>
			<title>{title}</title>
			<g className="ibp-fill-color">
				<path d="M17 6l-1.41 1.41L23.17 15H2v2h21.17l-7.58 7.59L17 26l10-10L17 6z" />
			</g>
		</SvgContainer>
	);
};

ArrowRight.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default ArrowRight;
