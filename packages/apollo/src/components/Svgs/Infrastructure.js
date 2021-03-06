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

const Infrastructure = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '32px'}
			height={height || '32px'}
			extendClass={extendClass}
			viewBox="0 0 32 32"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<path
					d="M9,11.7207 L5.3604,11.7207 C5.1614,11.7207 5.0004,11.5597 5.0004,11.3607 C5.0004,11.1607 5.1614,10.9997 5.3604,10.9997 L9,10.9997 L9,8.7207 L5.3604,8.7207 C5.1614,8.7207 5.0004,8.5597 5.0004,8.3607 C5.0004,8.1607 5.1614,7.9997 5.3604,7.9997 L9,7.9997 L9,5.7207 L1.7204,5.7207 L1.7204,26.9997 L9,26.9997 L9,14.7207 L5.3604,14.7207 C5.1614,14.7207 5.0004,14.5597 5.0004,14.3607 C5.0004,14.1607 5.1614,13.9997 5.3604,13.9997 L9,13.9997 L9,11.7207 Z M9,4.9997 L9,1.3607 C9,1.1607 9.161,0.9997 9.36,0.9997 L23.36,0.9997 C23.56,0.9997 23.721,1.1607 23.721,1.3607 L23.721,4.9997 L31.3604,4.9997 C31.5594,4.9997 31.7204,5.1607 31.7204,5.3607 L31.7204,27.3607 C31.7204,27.5597 31.5594,27.7207 31.3604,27.7207 L23.721,27.7207 L23.721,31.3607 C23.721,31.5597 23.56,31.7207 23.36,31.7207 L9.36,31.7207 C9.161,31.7207 9,31.5597 9,31.3607 L9,27.7207 L1.3604,27.7207 C1.1614,27.7207 1.0004,27.5597 1.0004,27.3607 L1.0004,5.3607 C1.0004,5.1607 1.1614,4.9997 1.3604,4.9997 L9,4.9997 Z M23.721,13.9997 L27.3604,13.9997 C27.5594,13.9997 27.7204,14.1607 27.7204,14.3607 C27.7204,14.5597 27.5594,14.7207 27.3604,14.7207 L23.721,14.7207 L23.721,26.9997 L31.0004,26.9997 L31.0004,5.7207 L23.721,5.7207 L23.721,7.9997 L27.3604,7.9997 C27.5594,7.9997 27.7204,8.1607 27.7204,8.3607 C27.7204,8.5597 27.5594,8.7207 27.3604,8.7207 L23.721,8.7207 L23.721,10.9997 L27.3604,10.9997 C27.5594,10.9997 27.7204,11.1607 27.7204,11.3607 C27.7204,11.5597 27.5594,11.7207 27.3604,11.7207 L23.721,11.7207 L23.721,13.9997 Z M9.721,30.9997 L23,30.9997 L23,1.7207 L9.721,1.7207 L9.721,30.9997 Z M20.3604,4.7207 L12.3604,4.7207 C12.1614,4.7207 12.0004,4.5597 12.0004,4.3607 C12.0004,4.1607 12.1614,3.9997 12.3604,3.9997 L20.3604,3.9997 C20.5594,3.9997 20.7204,4.1607 20.7204,4.3607 C20.7204,4.5597 20.5594,4.7207 20.3604,4.7207 Z M20.3604,7.7207 L12.3604,7.7207 C12.1614,7.7207 12.0004,7.5597 12.0004,7.3607 C12.0004,7.1607 12.1614,6.9997 12.3604,6.9997 L20.3604,6.9997 C20.5594,6.9997 20.7204,7.1607 20.7204,7.3607 C20.7204,7.5597 20.5594,7.7207 20.3604,7.7207 Z M20.3604,10.7207 L12.3604,10.7207 C12.1614,10.7207 12.0004,10.5597 12.0004,10.3607 C12.0004,10.1607 12.1614,9.9997 12.3604,9.9997 L20.3604,9.9997 C20.5594,9.9997 20.7204,10.1607 20.7204,10.3607 C20.7204,10.5597 20.5594,10.7207 20.3604,10.7207 Z"
					fill="#3E87F4"
				/>
			</g>
		</SvgContainer>
	);
};

Infrastructure.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Infrastructure;
