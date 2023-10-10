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

const Member = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '18px'}
			height={height || '18px'}
			extendClass={extendClass}
			viewBox="0 0 18 18"
			role="img"
		>
			<title>{title}</title>
			<g>
				<defs>
					<path
						d="M8.75,5.55111512e-16 C3.91750844,-2.77555756e-16 5.55111512e-16,3.91750844 0,8.75 C-5.55111512e-16,
						13.5824916 3.91750844,17.5 8.75,17.5 C13.5824916,17.5 17.5,13.5824916 17.5,8.75 C17.5,6.42935571 16.5781276,
						4.20375898 14.9371843,2.56281566 C13.296241,0.921872353 11.0706443,2.77555756e-16 8.75,5.55111512e-16 Z M5,15.2375
						L5,13.9875 C4.93943882,12.888127 5.77621081,11.9453638 6.875,11.875 L10.625,11.875 C11.7263664,11.945334 12.5641282,
						12.8920048 12.5,13.99375 L12.5,15.24375 C10.1829994,16.5965228 7.31700057,16.5965228 5,15.24375 L5,15.2375 Z M13.75,14.325
						L13.75,13.94375 C13.7888279,12.1699597 12.3979187,10.6928141 10.625,10.625 L6.875,10.625 C5.10208128,10.6928141 3.71117205,
						12.1699597 3.75,13.94375 L3.75,14.33125 C1.4322258,12.2581697 0.634126058,8.96983581 1.74370731,6.06491438 C2.85328856,3.15999296
						5.6403796,1.24108006 8.75,1.24108006 C11.8596204,1.24108006 14.6467114,3.15999296 15.7562927,6.06491438 C16.8658739,8.96983581
						16.0677742,12.2581697 13.75,14.33125 L13.75,14.325 Z M8.75,3.125 C7.02411016,3.125 5.625,4.52411016 5.625,6.25 C5.625,7.97588984
						7.02411016,9.375 8.75,9.375 C10.4758898,9.375 11.875,7.97588984 11.875,6.25 C11.875,5.42119847 11.5457599,4.62634249 10.9597087,
						4.04029131 C10.3736575,3.45424013 9.57880153,3.125 8.75,3.125 Z M8.75,8.125 C7.71446609,8.125 6.875,7.28553391 6.875,6.25 C6.875,
						5.21446609 7.71446609,4.375 8.75,4.375 C9.78553391,4.375 10.625,5.21446609 10.625,6.25 C10.625,6.74728092 10.4274559,7.22419451
						10.0758252,7.57582521 C9.72419451,7.92745592 9.24728092,8.125 8.75,8.125 Z"
						id="membersIcon"
					/>
				</defs>
				<g id="members"
					stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g transform="translate(-31.000000, -291.000000)">
						<g id="Side-Navigation">
							<g transform="translate(30.000000, 290.000000)">
								<g id="user--avatar"
									transform="translate(1.250000, 1.250000)"
								>
									<mask id="member-mask-2"
										fill="white"
									>
										<use xlinkHref="#membersIcon" />
									</mask>
									<use className="ibp-fill-color"
										xlinkHref="#membersIcon"
									/>
								</g>
							</g>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

Member.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Member;
