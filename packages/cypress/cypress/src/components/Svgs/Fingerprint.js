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

const Fingerprint = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '18px'}
			viewBox="0 0 19 18"
			width={width || '19px'}
		>
			<title>{title}</title>
			<g>
				<defs>
					<path
						id="a"
						d="M2.524 3.255a.482.482 0 0 1-.386-.191.474.474 0 0 1 .097-.668 9.663 9.663 0 0 1 5.9-1.771c2.1-.07 4.173.501 5.942 1.638a.474.474 0 0 1 .108.666.484.484 0 0 1-.672.107 9.405 9.405 0 0 0-5.378-1.458A8.726 8.726 0 0 0 2.81 3.16a.48.48 0 0 1-.287.096zM15.77 7.66a.48.48 0 0 1-.394-.203C14.293 5.93 12.364 3.9 8.135 3.9A8.767 8.767 0 0 0 .869 7.465a.484.484 0 0 1-.672.103.474.474 0 0 1-.104-.666 9.714 9.714 0 0 1 8.042-3.956c3.51 0 6.137 1.296 8.027 3.963a.474.474 0 0 1-.392.751zM5.8 19.375a.475.475 0 1 1-.173-.921c2.73-1.047 4.36-3.199 4.36-5.757a1.745 1.745 0 0 0-1.857-1.894c-1.16 0-1.729.625-1.901 2.09a2.659 2.659 0 0 1-2.82 2.393 2.67 2.67 0 0 1-2.706-2.868 7.323 7.323 0 0 1 7.45-7.173 7.493 7.493 0 0 1 7.517 7.452 11.593 11.593 0 0 1-.872 4.064.482.482 0 0 1-.888-.003.475.475 0 0 1 .001-.365c.482-1.175.752-2.426.797-3.696A6.535 6.535 0 0 0 8.152 6.2a6.364 6.364 0 0 0-6.487 6.219 1.732 1.732 0 0 0 1.744 1.915 1.707 1.707 0 0 0 1.864-1.551c.23-1.946 1.19-2.932 2.857-2.932a2.688 2.688 0 0 1 2.818 2.847c0 2.968-1.86 5.452-4.975 6.646a.487.487 0 0 1-.173.032zm4.684-.451a.484.484 0 0 1-.327-.127.474.474 0 0 1-.027-.673 7.882 7.882 0 0 0 2.213-5.427c0-.975-.302-4.155-4.184-4.155a4.27 4.27 0 0 0-3.088 1.17 3.88 3.88 0 0 0-1.123 2.789.479.479 0 0 1-.48.477h-.001a.479.479 0 0 1-.481-.476A4.823 4.823 0 0 1 4.39 9.038a5.214 5.214 0 0 1 3.769-1.45c3.798 0 5.146 2.753 5.146 5.11a8.817 8.817 0 0 1-2.467 6.072.482.482 0 0 1-.354.154zm-6.948-1.588c-.326 0-.651-.02-.975-.057a.477.477 0 1 1 .107-.947c1.554.174 2.783-.102 3.648-.823a3.979 3.979 0 0 0 1.328-2.832.469.469 0 0 1 .51-.446.478.478 0 0 1 .45.505 4.932 4.932 0 0 1-1.67 3.503 5.152 5.152 0 0 1-3.398 1.097z"
					/>
				</defs>
				<g fill="none"
					fillRule="evenodd"
				>
					<use fill="#FFF"
						transform="translate(.875)"
						href="#a"
					/>
					<path d="M-1 0h20v20H-1z" />
				</g>
			</g>
		</SvgContainer>
	);
};

Fingerprint.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Fingerprint;
