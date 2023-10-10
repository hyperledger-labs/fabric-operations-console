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

const FabricNodes = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '27px'}
			viewBox="0 0 31 27"
			width={width || '31px'}
		>
			<title>{title}</title>
			<g fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-1 -3)"
					fill="#3E87F4"
				>
					<path d="M18.5,16.3614 C18.5,17.5414 17.54,18.5014 16.36,18.5014 C15.18,18.5014 14.22,17.5414 14.22,16.3614 C14.22,15.1814 15.18,14.2214 16.36,14.2214 C17.54,14.2214 18.5,15.1814 18.5,16.3614 M13.5,16.3614 C13.5,14.7844 14.783,13.5014 16.36,13.5014 C17.937,13.5014 19.22,14.7844 19.22,16.3614 C19.22,17.9384 17.937,19.2214 16.36,19.2214 C14.783,19.2214 13.5,17.9384 13.5,16.3614 Z M28.8599,18.5015 C30.0399,18.5015 30.9999,17.5415 30.9999,16.3615 C30.9999,15.1815 30.0399,14.2215 28.8599,14.2215 C27.6799,14.2215 26.7199,15.1815 26.7199,16.3615 C26.7199,17.5415 27.6799,18.5015 28.8599,18.5015 Z M28.8599,13.5015 C30.4369,13.5015 31.7199,14.7845 31.7199,16.3615 C31.7199,17.9385 30.4369,19.2215 28.8599,19.2215 C27.2829,19.2215 25.9999,17.9385 25.9999,16.3615 C25.9999,14.7845 27.2829,13.5015 28.8599,13.5015 Z M6,16.3614 C6,15.1814 5.04,14.2214 3.86,14.2214 C2.68,14.2214 1.72,15.1814 1.72,16.3614 C1.72,17.5414 2.68,18.5014 3.86,18.5014 C5.04,18.5014 6,17.5414 6,16.3614 Z M1,16.3614 C1,14.7844 2.283,13.5014 3.86,13.5014 C5.437,13.5014 6.72,14.7844 6.72,16.3614 C6.72,17.9384 5.437,19.2214 3.86,19.2214 C2.283,19.2214 1,17.9384 1,16.3614 Z M24.7129,6.9312 C25.3029,5.9102 24.9519,4.5982 23.9299,4.0082 C23.5939,3.8142 23.2259,3.7222 22.8629,3.7222 C22.1239,3.7222 21.4019,4.1052 21.0069,4.7912 C20.4169,5.8132 20.7679,7.1242 21.7899,7.7142 C22.8109,8.3052 24.1239,7.9532 24.7129,6.9312 Z M25.6229,5.1212 C25.8199,5.8592 25.7189,6.6302 25.3369,7.2912 C24.9549,7.9532 24.3379,8.4262 23.5999,8.6242 C23.3539,8.6902 23.1039,8.7232 22.8559,8.7232 C22.3599,8.7232 21.8709,8.5932 21.4299,8.3382 C20.7679,7.9562 20.2949,7.3392 20.0969,6.6012 C19.8999,5.8642 20.0009,5.0932 20.3829,4.4312 C20.7649,3.7692 21.3819,3.2962 22.1199,3.0982 C22.8579,2.9012 23.6289,3.0022 24.2899,3.3852 C24.9519,3.7662 25.4249,4.3832 25.6229,5.1212 Z M11.7129,27.9312 C12.3029,26.9102 11.9519,25.5982 10.9299,25.0082 C10.5939,24.8142 10.2259,24.7222 9.8629,24.7222 C9.1239,24.7222 8.4019,25.1052 8.0069,25.7912 C7.4169,26.8132 7.7679,28.1242 8.7899,28.7142 C9.8099,29.3052 11.1239,28.9532 11.7129,27.9312 Z M11.2899,24.3852 C11.9519,24.7662 12.4249,25.3832 12.6229,26.1212 C12.8199,26.8592 12.7189,27.6302 12.3369,28.2912 C11.9549,28.9532 11.3379,29.4262 10.5999,29.6242 C10.3539,29.6902 10.1039,29.7232 9.8559,29.7232 C9.3599,29.7232 8.8709,29.5932 8.4299,29.3382 C7.7679,28.9562 7.2949,28.3392 7.0969,27.6012 C6.8999,26.8642 7.0009,26.0932 7.3829,25.4312 C7.7649,24.7692 8.3819,24.2962 9.1199,24.0982 C9.8589,23.9002 10.6279,24.0022 11.2899,24.3852 Z M10.9297,7.7144 C11.9517,7.1244 12.3037,5.8134 11.7127,4.7914 C11.3177,4.1054 10.5967,3.7214 9.8567,3.7214 C9.4937,3.7214 9.1257,3.8144 8.7897,4.0084 C7.7677,4.5984 7.4167,5.9094 8.0067,6.9314 C8.5967,7.9534 9.9087,8.3054 10.9297,7.7144 Z M12.3367,4.4314 C12.7187,5.0924 12.8207,5.8634 12.6227,6.6014 C12.4247,7.3394 11.9517,7.9564 11.2897,8.3384 C10.8487,8.5924 10.3597,8.7224 9.8647,8.7224 C9.6167,8.7224 9.3667,8.6904 9.1197,8.6244 C8.3817,8.4264 7.7647,7.9534 7.3837,7.2914 C7.0007,6.6304 6.8997,5.8594 7.0967,5.1214 C7.2947,4.3834 7.7677,3.7664 8.4297,3.3844 C9.0907,3.0024 9.8607,2.9014 10.5997,3.0984 C11.3377,3.2964 11.9547,3.7694 12.3367,4.4314 Z M23.9297,28.7144 C24.9517,28.1244 25.3037,26.8134 24.7127,25.7914 C24.3177,25.1054 23.5967,24.7214 22.8567,24.7214 C22.4937,24.7214 22.1257,24.8144 21.7897,25.0084 C20.7677,25.5984 20.4167,26.9094 21.0067,27.9314 C21.5957,28.9534 22.9087,29.3054 23.9297,28.7144 Z M23.5997,24.0984 C24.3377,24.2964 24.9547,24.7694 25.3367,25.4314 C25.7187,26.0924 25.8207,26.8634 25.6227,27.6014 C25.4247,28.3394 24.9517,28.9564 24.2897,29.3384 C23.8487,29.5924 23.3597,29.7224 22.8647,29.7224 C22.6167,29.7224 22.3667,29.6904 22.1197,29.6244 C21.3817,29.4264 20.7647,28.9534 20.3837,28.2914 C20.0007,27.6304 19.8997,26.8594 20.0967,26.1214 C20.2947,25.3834 20.7677,24.7664 21.4297,24.3844 C22.0917,24.0024 22.8617,23.9014 23.5997,24.0984 Z" />
				</g>
			</g>
		</SvgContainer>
	);
};

FabricNodes.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default FabricNodes;
