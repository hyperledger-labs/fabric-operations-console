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

const Wallet = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '32px'}
			height={height || '32px'}
			extendClass={extendClass}
			viewBox="0 0 32 32"
			role="img"
		>
			<title>{title}</title>
			<g>
				<rect data-name="&lt;Transparent Rectangle&gt;"
					fill="none"
					width="32"
					height="32"
				/>
				<rect x="22"
					y="17"
					width="2"
					height="2"
					className="ibp-fill-color"
				/>
				<path
					d="M28,8H4V5H26V3H4A2,2,0,0,0,2,5V26a2,2,0,0,0,2,2H28a2,2,0,0,0,
					2-2V10A2,2,0,0,0,28,8ZM4,26V10H28v3H20a2,2,0,0,0-2,2v6a2,2,0,0,0,2,2h8v3ZM28,15v6H20V15Z"
					className="ibp-fill-color"
				/>
			</g>
		</SvgContainer>
	);
};

Wallet.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Wallet;
