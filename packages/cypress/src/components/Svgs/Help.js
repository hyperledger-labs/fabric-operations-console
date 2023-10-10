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

const Help = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '14px'}
			height={height || '14px'}
			extendClass={extendClass}
			viewBox="0 0 14 14"
			role="img"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-649.000000, -461.000000)">
					<g transform="translate(648.000000, 460.000000)">
						<g transform="translate(1.000000, 1.000000)"
							className="ibp-fill-color"
						>
							<path
								d="M7,4.4408921e-16 C3.13400675,-2.22044605e-16 -4.4408921e-16,3.13400675 -8.8817842e-16,7
								C-1.33226763e-15,10.8659932 3.13400675,14 7,14 C10.8659932,14 14,10.8659932 14,7
								C14,5.14348457 13.2625021,3.36300718 11.9497475,2.05025253 C10.6369928,0.737497883
								8.85651543,2.22044605e-16 7,4.4408921e-16 Z M7,13 C3.6862915,13 1,10.3137085 1,7
								C1,3.6862915 3.6862915,1 7,1 C10.3137085,1 13,3.6862915 13,7 C13,8.59129894
								12.367859,10.1174224 11.2426407,11.2426407 C10.1174224,12.367859 8.59129894,13 7,13 Z"
								fillRule="nonzero"
							/>
							<path
								d="M7.35,8.872 L6.102,8.872 L6.102,6.964 C7.386,6.904 8.118,6.424 8.118,5.464 L8.118,5.296
								C8.118,4.564 7.626,4.132 6.882,4.132 C6.09,4.132 5.598,4.66 5.43,5.368 L4.29,4.912 C4.578,3.916
								5.382,2.98 6.93,2.98 C8.502,2.98 9.51,3.916 9.51,5.332 C9.51,6.784 8.43,7.576 7.35,7.768
								L7.35,8.872 Z M6.738,11.644 C6.126,11.644 5.862,11.308 5.862,10.852 L5.862,10.648 C5.862,10.192
								6.126,9.856 6.738,9.856 C7.35,9.856 7.614,10.192 7.614,10.648 L7.614,10.852 C7.614,11.308 7.35,11.644
								6.738,11.644 Z"
								id="?"
							/>
						</g>
						<g>
							<rect x="0"
								y="0"
								width="16"
								height="16"
							/>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

Help.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Help;
