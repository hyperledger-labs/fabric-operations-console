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

const AppConsole = ({ extendClass, height, width, title }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '31px'}
			viewBox="0 0 29 31"
			width={width || '29px'}
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-2.000000, -1.000000)"
					fill="#3E87F4"
				>
					<path d="M11.3613,26.8594 C11.9143,26.8594 12.3613,27.3064 12.3613,27.8594 C12.3613,28.4114 11.9143,28.8594 11.3613,28.8594 C10.8083,28.8594 10.3613,28.4114 10.3613,27.8594 C10.3613,27.3064 10.8083,26.8594 11.3613,26.8594 Z M30.001,14.3594 L30.001,6.3594 C30.001,5.4554 29.266,4.7194 28.361,4.7194 L17.361,4.7194 C16.457,4.7194 15.722,5.4554 15.722,6.3594 L15.722,19.4904 L19.106,16.1044 C19.174,16.0374 19.266,15.9994 19.361,15.9994 L28.361,15.9994 C29.266,15.9994 30.001,15.2634 30.001,14.3594 Z M20,24.0004 L20,16.7194 L19.511,16.7194 L15.616,20.6144 C15.547,20.6824 15.455,20.7194 15.361,20.7194 C15.314,20.7194 15.269,20.7104 15.224,20.6924 C15.089,20.6364 15.001,20.5054 15.001,20.3594 L15.001,6.3594 C15.001,5.0574 16.06,3.9994 17.361,3.9994 L20,3.9994 L20,1.7204 L2.721,1.7204 L2.721,24.0004 L20,24.0004 Z M2.721,30.9994 L20,30.9994 L20,24.7204 L2.721,24.7204 L2.721,30.9994 Z M28.361,3.9994 C29.663,3.9994 30.722,5.0574 30.722,6.3594 L30.722,14.3594 C30.722,15.6614 29.663,16.7194 28.361,16.7194 L20.721,16.7194 L20.721,31.3604 C20.721,31.5594 20.56,31.7204 20.36,31.7204 L2.36,31.7204 C2.161,31.7204 2,31.5594 2,31.3604 L2,1.3604 C2,1.1614 2.161,1.0004 2.36,1.0004 L20.36,1.0004 C20.56,1.0004 20.721,1.1614 20.721,1.3604 L20.721,3.9994 L28.361,3.9994 Z M18.36,8.7207 L18.36,7.9997 L27.36,7.9997 L27.36,8.7207 L18.36,8.7207 Z M18.36,12.7207 L18.36,11.9997 L27.36,11.9997 L27.36,12.7207 L18.36,12.7207 Z" />
				</g>
			</g>
		</SvgContainer>
	);
};

AppConsole.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default AppConsole;
