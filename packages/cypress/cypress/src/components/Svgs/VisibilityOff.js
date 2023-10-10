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

const VisibilityOff = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '16px'}
			viewBox="0 0 16 16"
			width={width || '16px'}
		>
			<title>{title}</title>
			<g fill="#fff">
				<path
					fillRule="nonzero"
					d="M11.846 3.45L15.293.007 16 .714l-3.284 3.281c1.261.902 2.377 2.212 3.347 3.93C14.02 11.642 11.333 13.5 8 13.5c-1.392 0-2.667-.324-3.822-.973L.703 16l-.706-.708 3.323-3.32C2.071 11.042.976 9.694.035 7.924 2.012 4.308 4.667 2.5 8 2.5c1.395 0 2.677.317 3.846.95zm-6.928 8.338c.944.477 1.97.712 3.082.712 2.795 0 5.076-1.483 6.907-4.568-.866-1.417-1.833-2.486-2.91-3.219l-1.55 1.55a3 3 0 0 1-4.185 4.182l-1.344 1.343zm-.882-.533l1.518-1.517A3 3 0 0 1 9.74 5.556l1.364-1.363C10.148 3.73 9.115 3.5 8 3.5c-2.798 0-5.047 1.439-6.819 4.432.842 1.465 1.792 2.568 2.855 3.323zm2.948-1.532a2 2 0 0 0 2.74-2.738l-2.74 2.738zm-.707-.707l2.74-2.738a2 2 0 0 0-2.74 2.738z"
				/>
			</g>
		</SvgContainer>
	);
};
VisibilityOff.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default VisibilityOff;
