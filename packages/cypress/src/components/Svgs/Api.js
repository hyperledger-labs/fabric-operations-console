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

const Api = ({ extendClass, height, width, title }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '28px'}
			viewBox="0 0 29 28"
			width={width || '29px'}
			role="img"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-1.000000, -1.000000)"
					className="ibp-fill-color"
					fillRule="nonzero"
				>
					<path
						d="M25,21 C24.2947382,21.0103424 23.6047512,21.2069887 23,21.57 L19.91,18.48
						C21.3883267,16.3991733 21.3883267,13.6108267 19.91,11.53 L23,8.43 C24.7361982,
						9.44688242 26.9575253,9.01582299 28.1873683,7.42336572 C29.4172113,5.83090844
						29.2727395,3.57276005 27.8499897,2.15001025 C26.4272399,0.727260451 24.1690916,
						0.582788724 22.5766343,1.81263173 C20.984177,3.04247473 20.5531176,5.26380182
						21.57,7 L18.48,10.09 C16.3991733,8.61167327 13.6108267,8.61167327 11.53,10.09 L8.43,
						7 C9.44688242,5.26380182 9.01582299,3.04247473 7.42336572,1.81263173 C5.83090844,
						0.582788724 3.57276005,0.727260451 2.15001025,2.15001025 C0.727260451,3.57276005
						0.582788724,5.83090844 1.81263173,7.42336572 C3.04247473,9.01582299 5.26380182,
						9.44688242 7,8.43 L10.09,11.52 C8.61167327,13.6008267 8.61167327,16.3891733 10.09,
						18.47 L7,21.57 C5.26380182,20.5531176 3.04247473,20.984177 1.81263173,22.5766343
						C0.582788724,24.1690916 0.727260451,26.4272399 2.15001025,27.8499897 C3.57276005,
						29.2727395 5.83090844,29.4172113 7.42336572,28.1873683 C9.01582299,26.9575253 9.44688242,
						24.7361982 8.43,23 L11.52,19.91 C13.6008267,21.3883267 16.3891733,21.3883267 18.47,19.91
						L21.57,23 C20.6632739,24.5706487 20.9267226,26.5547927 22.2118983,27.8344072 C23.4970739,
						29.1140217 25.4823418,29.3688636 27.0490436,28.4553348 C28.6157455,27.5418061 29.3717905,
						25.6885309 28.8911627,23.9397924 C28.4105348,22.1910538 26.8135185,20.9845002 25,21 Z M25,
						3 C26.1045695,3 27,3.8954305 27,5 C27,6.1045695 26.1045695,7 25,7 C23.8954305,7 23,6.1045695
						23,5 C23,3.8954305 23.8954305,3 25,3 Z M3,5 C3,3.8954305 3.8954305,3 5,3 C6.1045695,3 7,3.8954305 7,
						5 C7,6.1045695 6.1045695,7 5,7 C3.8954305,7 3,6.1045695 3,5 Z M5,27 C3.8954305,27 3,26.1045695 3,25 C3,
						23.8954305 3.8954305,23 5,23 C6.1045695,23 7,23.8954305 7,25 C7,26.1045695 6.1045695,27 5,27 Z M15,19 C12.790861,
						19 11,17.209139 11,15 C11,12.790861 12.790861,11 15,11 C17.209139,11 19,12.790861 19,15 C19,16.060866 18.5785726,
						17.0782816 17.8284271,17.8284271 C17.0782816,18.5785726 16.060866,19 15,19 Z M25,27 C23.8954305,27 23,26.1045695 23,
						25 C23,23.8954305 23.8954305,23 25,23 C26.1045695,23 27,23.8954305 27,25 C27,26.1045695 26.1045695,27 25,27 Z"
					/>
				</g>
			</g>
		</SvgContainer>
	);
};

Api.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Api;
