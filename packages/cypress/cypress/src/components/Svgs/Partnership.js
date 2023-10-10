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

const Partnership = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '28px'}
			height={height || '29px'}
			extendClass={extendClass}
			viewBox="0 0 28 29"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g fill="#fff"
					fillRule="nonzero"
				>
					<path
						d="M6,8 C3.790861,8 2,6.209139 2,4 C2,1.790861 3.790861,4.4408921e-16 6,
						0 C8.209139,-4.4408921e-16 10,1.790861 10,4 C10,5.06086596 9.57857264,6.07828161
						8.82842712,6.82842712 C8.07828161,7.57857264 7.06086596,8 6,8 Z M6,2 C4.8954305,2
						4,2.8954305 4,4 C4,5.1045695 4.8954305,6 6,6 C7.1045695,6 8,5.1045695 8,4 C8,2.8954305
						7.1045695,2 6,2 Z M22,8 C19.790861,8 18,6.209139 18,4 C18,1.790861 19.790861,4.4408921e-16
						22,0 C24.209139,-4.4408921e-16 26,1.790861 26,4 C26,5.06086596 25.5785726,6.07828161 24.8284271,
						6.82842712 C24.0782816,7.57857264 23.060866,8 22,8 Z M22,2 C20.8954305,2 20,2.8954305 20,4 C20,
						5.1045695 20.8954305,6 22,6 C23.1045695,6 24,5.1045695 24,4 C24,2.8954305 23.1045695,2 22,2 Z M24,29
						L20,29 C18.8954305,29 18,28.1045695 18,27 L18,20 L20,20 L20,27 L24,27 L24,18 L26,18 L26,12 C26,11.4477153
						25.5522847,11 25,11 L18.58,11 L14,19 L9.42,11 L3,11 C2.44771525,11 2,11.4477153 2,12 L2,18 L4,18 L4,27 L8,27
						L8,20 L10,20 L10,27 C10,28.1045695 9.1045695,29 8,29 L4,29 C2.8954305,29 2,28.1045695 2,27 L2,20 C0.8954305,20
						0,19.1045695 0,18 L0,12 C-8.8817842e-16,10.3431458 1.34314575,9 3,9 L10.58,9 L14,15 L17.42,9 L25,9 C26.6568542,9
						28,10.3431458 28,12 L28,18 C28,19.1045695 27.1045695,20 26,20 L26,27 C26,28.1045695 25.1045695,29 24,29 Z"
					/>
				</g>
			</g>
		</SvgContainer>
	);
};

Partnership.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Partnership;
