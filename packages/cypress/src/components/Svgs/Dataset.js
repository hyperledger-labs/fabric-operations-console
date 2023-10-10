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

const Dataset = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '26px'}
			height={height || '25px'}
			extendClass={extendClass}
			viewBox="0 0 26 25"
			role="img"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g className="ibp-fill-color"
					fillRule="nonzero"
				>
					<path
						d="M22,9 L22,0 L20,0 L20,2 L17,2 L17,4 L20,4 L20,9 L17,9 L17,11 L25,11 L25,9 L22,
						9 Z M5.5,2 C7.43299662,2 9,3.56700338 9,5.5 C9,7.43299662 7.43299662,9 5.5,9 C3.56700338,
						9 2,7.43299662 2,5.5 C2,3.56700338 3.56700338,2 5.5,2 Z M5.5,0 C2.46243388,0 4.4408921e-16,2.46243388 0,
						5.5 C-8.8817842e-16,8.53756612 2.46243388,11 5.5,11 C8.53756612,11 11,8.53756612 11,5.5 C11,4.04130931 10.4205374,
						2.64236278 9.3890873,1.6109127 C8.35763722,0.579462622 6.95869069,0 5.5,0 Z M5.5,16 C7.43299662,16 9,17.5670034
						9,19.5 C9,21.4329966 7.43299662,23 5.5,23 C3.56700338,23 2,21.4329966 2,19.5 C2,17.5670034 3.56700338,16 5.5,16 Z M5.5,
						14 C2.46243388,14 4.4408921e-16,16.4624339 0,19.5 C-8.8817842e-16,22.5375661 2.46243388,25 5.5,25 C8.53756612,25 11,22.5375661
						11,19.5 C11,16.4624339 8.53756612,14 5.5,14 Z M20.5,16 C22.4329966,16 24,17.5670034 24,19.5 C24,21.4329966 22.4329966,23 20.5,
						23 C18.5670034,23 17,21.4329966 17,19.5 C17,17.5670034 18.5670034,16 20.5,16 Z M20.5,14 C17.4624339,14 15,16.4624339 15,19.5
						C15,22.5375661 17.4624339,25 20.5,25 C23.5375661,25 26,22.5375661 26,19.5 C26,16.4624339 23.5375661,14 20.5,14 Z"
					/>
				</g>
			</g>
		</SvgContainer>
	);
};

Dataset.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Dataset;
