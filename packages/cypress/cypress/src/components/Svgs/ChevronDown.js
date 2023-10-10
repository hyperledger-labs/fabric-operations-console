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

const ChevronDown = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '14px'}
			height={height || '8px'}
			extendClass={extendClass}
			viewBox="0 0 14 8"
		>
			<title>{title}</title>
			<g>
				<defs>
					<polygon id="chevronDown"
						points="6.25 7.5 0 1.25 0.88375 0.36625 6.25 5.7325 11.61625 0.36625 12.5 1.25"
					/>
				</defs>
				<g id="Symbols"
					stroke="none"
					strokeWidth="1"
					className="ibp-fill-color"
					fillRule="evenodd"
				>
					<g id="icon/navigation/chevron/down/20"
						transform="translate(-3.000000, -6.000000)"
					>
						<g id="Group"
							transform="translate(22.000000, -4.000000) rotate(-180.000000) translate(-22.000000, 4.000000) translate(3.000000, -22.000000)"
						>
							<g id="chevron--down"
								transform="translate(24.750000, 0.250000)"
							>
								<mask id="chevronDown2"
									className="ibp-fill-color"
								>
									<use xlinkHref="#chevronDown" />
								</mask>
								<use id="Mask"
									className="ibp-fill-color"
									fillRule="nonzero"
									xlinkHref="#chevronDown"
								/>
								<g id="color/black"
									mask="url(#chevronDown2)"
								>
									<g transform="translate(-3.750000, -6.250000)" />
								</g>
							</g>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

ChevronDown.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default ChevronDown;
