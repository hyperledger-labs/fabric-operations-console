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

const Bell = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '18px'}
			viewBox="0 0 18 19"
			width={width || '19px'}
		>
			<title>{title}</title>
			<g>
				<defs>
					<path
						d="M16.06875,12.05625 L14.375,10.36875 L14.375,7.5 C14.3750403,4.29021671 11.9436941,1.60222833
						8.75,1.28125 L8.75,0 L7.5,0 L7.5,1.28125 C4.30630595,1.60222833 1.87495968,4.29021671 1.875,7.5 L1.875,
						10.36875 L0.18125,12.05625 C0.0642584285,12.1741993 -0.00096047425,12.3338731 -5.34988737e-14,12.5 L-5.34988737e-14,
						14.375 C-5.34988737e-14,14.720178 0.279822031,15 0.625,15 L5,15 C5,16.7258898 6.39911016,18.125 8.125,18.125 C9.85088984,
						18.125 11.25,16.7258898 11.25,15 L15.625,15 C15.970178,15 16.25,14.720178 16.25,14.375 L16.25,12.5 C16.2509605,12.3338731
						16.1857416,12.1741993 16.06875,12.05625 Z M8.125,16.875 C7.08946609,16.875 6.25,16.0355339 6.25,15 L10,15 C10,16.0355339
						9.16053391,16.875 8.125,16.875 Z M15,13.75 L1.25,13.75 L1.25,12.75625 L2.94375,11.0625 C3.0592151,10.9460871 3.12430961,
						10.7889624 3.125,10.625 L3.125,7.5 C3.125,4.73857625 5.36357625,2.5 8.125,2.5 C10.8864237,2.5 13.125,4.73857625 13.125,7.5
						L13.125,10.625 C13.1240395,10.7911269 13.1892584,10.9508007 13.30625,11.06875 L15,12.75625 L15,13.75 Z"
						id="bell"
					/>
				</defs>
				<g id="bellIcon"
					stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g id="Group"
						transform="translate(-1.000000, 0.000000)"
					>
						<g id="notification"
							transform="translate(1.875000, 0.625000)"
						>
							<mask id="bell-mask-2"
								fill="white"
							>
								<use xlinkHref="#bell" />
							</mask>
							<use id="Mask"
								className="ibp-fill-color"
								fillRule="nonzero"
								xlinkHref="#bell"
							/>
							<g id="color/black"
								mask="url(#bell-mask-2)"
							>
								<g transform="translate(-1.875000, -0.625000)" />
							</g>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

Bell.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Bell;
