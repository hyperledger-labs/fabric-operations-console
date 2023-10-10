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

const NewNotification = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '32px'}
			viewBox="0 0 32 32"
			width={width || '32px'}
		>
			<title>{title}</title>
			<g fill="#fff">
				<path d="M26,17.6V15H24v3a.91.91,0,0,0,.3.7L27,21.4V23H5V21.4l2.7-2.7A.91.91,0,0,0,8,18V13a8,8,0,0,1,8-8,7.89,7.89,0,0,1,4,1.09V3.8A9.71,9.71,0,0,0,17,3V1H15V3A10.15,10.15,0,0,0,6,13v4.6L3.3,20.3A.91.91,0,0,0,3,21v3a.94.94,0,0,0,1,1h7a5,5,0,0,0,10,0h7a.94.94,0,0,0,1-1V21a.91.91,0,0,0-.3-.7ZM16,28a3,3,0,0,1-3-3h6A3,3,0,0,1,16,28Z" />
				<g fill="#0062ff">
					<circle cx="26"
						cy="8"
						r="4"
					/>
				</g>
			</g>
		</SvgContainer>
	);
};

NewNotification.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default NewNotification;
