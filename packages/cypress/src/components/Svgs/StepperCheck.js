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

const StepperCheck = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '18px'}
			height={height || '18px'}
			extendClass={extendClass}
			viewBox="0 0 18 18"
		>
			<title>{title}</title>
			<defs>
				<path
					d="M13.5,6.68571429 L12.6,5.78571429 L7.71428571,10.6714286 L5.4,8.35714286 L4.5,9.25714286 L7.71428571,12.4714286
					L13.5,6.68571429 Z M9,0 C4.05,0 0,4.05 0,9 C0,13.95 4.05,18 9,18 C13.95,18 18,13.95 18,9 C18,4.05 13.95,0 9,0 Z M9,16.7142857
					C4.75714286,16.7142857 1.28571429,13.2428571 1.28571429,9 C1.28571429,4.75714286 4.75714286,1.28571429 9,1.28571429 C13.2428571,
					1.28571429 16.7142857,4.75714286 16.7142857,9 C16.7142857,13.2428571 13.2428571,16.7142857 9,16.7142857 Z"
					id="path-1"
				/>
			</defs>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-1.000000, -1.000000)">
					<g id="checkmark"
						transform="translate(1.000000, 1.000000)"
					>
						<mask id="mask-2"
							fill="white"
						>
							<use xlinkHref="#path-1" />
						</mask>
						<use id="Mask"
							fill="#6ea6ff"
							fillRule="nonzero"
							xlinkHref="#path-1"
						/>
						<g id="color/black"
							mask="url(#mask-2)"
						>
							<g transform="translate(-1.285714, -1.285714)" />
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

StepperCheck.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default StepperCheck;
