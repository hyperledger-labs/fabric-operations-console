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

const UserAvatar = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '20px'}
			height={height || '26px'}
			extendClass={extendClass}
			viewBox="0 0 20 26"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-741.000000, -166.000000)">
					<g id="user"
						transform="translate(735.000000, 164.000000)"
					>
						<g transform="translate(6.000000, 2.000000)"
							className="ibp-fill-color"
							fillRule="nonzero"
						>
							<path
								d="M10,12 C13.3137085,12 16,9.3137085 16,6 C16,2.6862915 13.3137085,-1.33226763e-15 10,-1.77635684e-15
								C6.6862915,-2.22044605e-15 4,2.6862915 4,6 C4,9.3137085 6.6862915,12 10,12 Z M10,2 C12.209139,2 14,3.790861
								14,6 C14,8.209139 12.209139,10 10,10 C7.790861,10 6,8.209139 6,6 C6,3.790861 7.790861,2 10,2 Z"
							/>
							<path
								d="M12,14 L8,14 C3.581722,14 8.8817842e-16,17.581722 0,22 L0,26 L2,26 L2,22 C2,18.6862915 4.6862915,16 8,16
							L12,16 C15.3137085,16 18,18.6862915 18,22 L18,26 L20,26 L20,22 C20,17.581722 16.418278,14 12,14 Z"
							/>
						</g>
						<g id="transparent_box">
							<rect id="Avatar-Rectangle-path"
								x="0"
								y="0"
								width="32"
								height="32"
							/>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

UserAvatar.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default UserAvatar;
