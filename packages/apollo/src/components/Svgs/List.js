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

const List = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '24px'}
			height={height || '18px'}
			extendClass={extendClass}
			viewBox="0 0 24 18"
		>
			<title>{title}</title>
			<g fill="none"
				fillRule="evenodd"
			>
				<g className="ibp-fill-color"
					fillRule="nonzero"
				>
					<path d="M0 0h24v2H0zM0 16h24v2H0zM0 8h24v2H0z" />
				</g>
				<path d="M-4-7h32v32H-4z" />
			</g>
		</SvgContainer>
	);
};

List.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default List;
