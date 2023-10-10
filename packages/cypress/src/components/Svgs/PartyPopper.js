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

const PartyPopper = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '550px'}
			height={height || '600px'}
			extendClass={extendClass}
			viewBox="0 0 550 600"
		>
			<title>{title}</title>
			<g>
				<defs>
					<linearGradient id="popB"
						x1="37.82"
						y1="442.39"
						x2="142.76"
						y2="442.39"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#b4b4b4"
						/>
						<stop offset="0.05"
							stopColor="#bdbdbd"
						/>
						<stop offset="0.22"
							stopColor="#d1d1d1"
						/>
						<stop offset="0.4"
							stopColor="#dfdfdf"
						/>
						<stop offset="0.63"
							stopColor="#e7e7e7"
						/>
						<stop offset="1"
							stopColor="#eaeaea"
						/>
					</linearGradient>
					<linearGradient
						id="popA"
						x1="-3116.06"
						y1="-1116.31"
						x2="-2979.46"
						y2="-1116.31"
						gradientTransform="rotate(40.49 -3558.165 3927.494)"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#0064ff"
						/>
						<stop offset="0.19"
							stopColor="#2086fa"
						/>
						<stop offset="0.4"
							stopColor="#3ca3f6"
						/>
						<stop offset="0.6"
							stopColor="#4fb7f3"
						/>
						<stop offset="0.81"
							stopColor="#5bc4f2"
						/>
						<stop offset="1"
							stopColor="#5fc8f1"
						/>
					</linearGradient>
					<linearGradient id="popF"
						x1="-3086.16"
						y1="-1043.85"
						x2="-3009.92"
						y2="-1043.85"
						xlinkHref="#popA"
					/>
					<linearGradient id="popG"
						x1="28.18"
						y1="485.54"
						x2="75.27"
						y2="485.54"
						xlinkHref="#popB"
					/>
					<linearGradient id="popH"
						x1="65.17"
						y1="376.04"
						x2="230.56"
						y2="376.04"
						xlinkHref="#popB"
					/>
					<linearGradient id="popI"
						x1="-3151.92"
						y1="-1205.76"
						x2="-2943.03"
						y2="-1205.76"
						xlinkHref="#popA"
					/>
					<linearGradient id="popJ"
						x1="97.98"
						y1="306.4"
						x2="317.25"
						y2="306.4"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#9ea5ae"
						/>
						<stop offset="0.05"
							stopColor="#abb1b9"
						/>
						<stop offset="0.18"
							stopColor="#c5c9d0"
						/>
						<stop offset="0.32"
							stopColor="#d9dce2"
						/>
						<stop offset="0.48"
							stopColor="#e7eaee"
						/>
						<stop offset="0.68"
							stopColor="#eff2f6"
						/>
						<stop offset="1"
							stopColor="#f2f4f8"
						/>
					</linearGradient>
					<linearGradient
						id="popK"
						x1="-3177.28"
						y1="-1294.01"
						x2="-2917.28"
						y2="-1294.01"
						gradientTransform="rotate(40.49 -3558.165 3927.494)"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#b4b4b4"
						/>
						<stop offset="0.04"
							stopColor="#b5b5b5"
						/>
						<stop offset="0.53"
							stopColor="#c2c2c2"
						/>
						<stop offset="1"
							stopColor="#c6c6c6"
						/>
					</linearGradient>
					<linearGradient
						id="popL"
						x1="-3047.28"
						y1="-1267.79"
						x2="-3047.28"
						y2="-1320.23"
						gradientTransform="rotate(40.49 -3558.165 3927.494)"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#9ea5ae"
						/>
						<stop offset="0"
							stopColor="#9da4ad"
							stopOpacity="0.99"
						/>
						<stop offset="0.09"
							stopColor="#8e9399"
							stopOpacity="0.73"
						/>
						<stop offset="0.18"
							stopColor="#808488"
							stopOpacity="0.51"
						/>
						<stop offset="0.28"
							stopColor="#75787a"
							stopOpacity="0.32"
						/>
						<stop offset="0.37"
							stopColor="#6d6e70"
							stopOpacity="0.18"
						/>
						<stop offset="0.47"
							stopColor="#676768"
							stopOpacity="0.08"
						/>
						<stop offset="0.58"
							stopColor="#636363"
							stopOpacity="0.02"
						/>
						<stop offset="0.71"
							stopColor="#626262"
							stopOpacity="0"
						/>
					</linearGradient>
					<linearGradient id="popM"
						x1="341.67"
						y1="344.63"
						x2="366.56"
						y2="344.63"
						gradientTransform="translate(58.77 23.45)"
						xlinkHref="#popA"
					/>
					<linearGradient id="popN"
						x1="-1636.57"
						y1="-987.29"
						x2="-1611.68"
						y2="-987.29"
						gradientTransform="translate(1844.79 1020.07)"
						xlinkHref="#popA"
					/>
					<linearGradient
						id="popC"
						x1="-1251.78"
						y1="-773.36"
						x2="-1226.88"
						y2="-773.36"
						gradientTransform="translate(1599.93 1179.86)"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#eaeaea"
						/>
						<stop offset="0.11"
							stopColor="#eee"
						/>
						<stop offset="0.56"
							stopColor="#fbfbfb"
						/>
						<stop offset="1"
							stopColor="#fff"
						/>
					</linearGradient>
					<linearGradient id="popO"
						x1="-1237.81"
						y1="-954.6"
						x2="-1212.91"
						y2="-954.6"
						gradientTransform="translate(1724 1242.82)"
						xlinkHref="#popC"
					/>
					<linearGradient id="popP"
						x1="-105.64"
						y1="439.93"
						x2="-80.75"
						y2="439.93"
						gradientTransform="translate(205.33 -394.27)"
						xlinkHref="#popC"
					/>
					<linearGradient
						id="popD"
						x1="-1606.42"
						y1="-797.66"
						x2="-1581.52"
						y2="-797.66"
						gradientTransform="translate(1723.7 924.95)"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#5fc8f1"
						/>
						<stop offset="0.14"
							stopColor="#77cdf4"
						/>
						<stop offset="0.39"
							stopColor="#99d4f9"
						/>
						<stop offset="0.61"
							stopColor="#b1dafc"
						/>
						<stop offset="0.83"
							stopColor="#c0ddfe"
						/>
						<stop offset="1"
							stopColor="#c5deff"
						/>
					</linearGradient>
					<linearGradient id="popQ"
						x1="200.91"
						y1="143.68"
						x2="225.81"
						y2="143.68"
						gradientTransform="translate(297.05 -48.11)"
						xlinkHref="#popD"
					/>
					<linearGradient
						id="popE"
						x1="-1216.04"
						y1="-940.32"
						x2="-1191.15"
						y2="-940.32"
						gradientTransform="translate(1564.2 1246.71)"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#0064ff"
						/>
						<stop offset="0.15"
							stopColor="#0766fd"
						/>
						<stop offset="0.47"
							stopColor="#0f68fc"
						/>
						<stop offset="1"
							stopColor="#1269fb"
						/>
					</linearGradient>
					<linearGradient id="popR"
						x1="-669.64"
						y1="3696.98"
						x2="-644.75"
						y2="3696.98"
						gradientTransform="translate(1110.64 -3526.61)"
						xlinkHref="#popE"
					/>
					<linearGradient id="popS"
						x1="235.81"
						y1="139.18"
						x2="424.76"
						y2="139.18"
						xlinkHref="#popA"
					/>
					<linearGradient id="popT"
						x1="119.81"
						y1="114.67"
						x2="239.29"
						y2="234.15"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0"
							stopColor="#5fc8f1"
						/>
						<stop offset="0"
							stopColor="#c5deff"
						/>
						<stop offset="1"
							stopColor="#6bcbf3"
						/>
					</linearGradient>
					<linearGradient id="popU"
						x1="-69.85"
						y1="-310.63"
						x2="-3.51"
						y2="-244.28"
						gradientTransform="rotate(14.77 -1946.808 1510.509)"
						xlinkHref="#d"
					/>
				</defs>
				<g data-name="Layer 10">
					<path d="M55.44 392.2l-17.62 50.31a88.27 88.27 0 0 0 57.51 50.06l47.43-25.29a171.66 171.66 0 0 1-87.32-75.08z"
						fill="url(#popB)"
					/>
					<path d="M65.17 364.41l-9.73 27.79a171.66 171.66 0 0 0 87.32 75.08l26.06-13.89a191.48 191.48 0 0 1-103.65-89z"
						fill="url(#popA)"
					/>
					<path d="M61.53 474.62a87.86 87.86 0 0 1-23.71-32.11l-7.48 21.36a70 70 0 0 0 44.93 39.4l20.06-10.7a87.82 87.82 0 0 1-33.8-17.95z"
						fill="url(#popF)"
					/>
					<path d="M30.34 463.87l-.43 1.21a31.76 31.76 0 0 0 45 38.39l.38-.2a70 70 0 0 1-44.93-39.4z"
						fill="url(#popG)"
					/>
					<path d="M88.2 298.68l-23 65.73a191.48 191.48 0 0 0 103.65 89l61.74-32.92A281.18 281.18 0 0 1 88.2 298.68z"
						fill="url(#popH)"
					/>
					<path
						d="M149.16 372a279.22 279.22 0 0 0 81.4 48.5l26.2-14A319.51 319.51 0 0 1 98 270.77l-9.8 27.91A279.41 279.41 0 0 0 149.16 372z"
						fill="url(#popI)"
					/>
					<path
						d="M203.64 308.17c-51.2-43.71-86.6-87.5-83.08-101.88L98 270.77A319.51 319.51 0 0 0 256.76 406.5l60.49-32.25c-13.7 5.67-62.46-22.41-113.61-66.08z"
						fill="url(#popJ)"
					/>
					<path
						d="M237.69 268.28c-54.61-46.62-106.5-75.48-115.9-64.46a5.93 5.93 0 0 0-1.23 2.47c-3.52 14.38 31.88 58.17 83.08 101.88s99.91 71.75 113.61 66.08a6 6 0 0 0 2.28-1.62c9.41-11.01-27.24-57.73-81.84-104.35z"
						fill="url(#popK)"
					/>
					<path
						d="M237.69 268.28c-54.61-46.62-106.5-75.48-115.9-64.46a5.93 5.93 0 0 0-1.23 2.47c-3.52 14.38 31.88 58.17 83.08 101.88s99.91 71.75 113.61 66.08a6 6 0 0 0 2.28-1.62c9.41-11.01-27.24-57.73-81.84-104.35z"
						fill="url(#popL)"
					/>
					<path fill="url(#popM)"
						d="M400.44 355.62h24.89v24.89h-24.89z"
					/>
					<path transform="rotate(45 220.662 32.781)"
						fill="url(#popN)"
						d="M208.22 20.33h24.89v24.89h-24.89z"
					/>
					<path transform="rotate(45 360.6 406.505)"
						fill="url(#popC)"
						d="M348.16 394.05h24.89v24.89h-24.89z"
					/>
					<path transform="rotate(45 498.635 288.221)"
						fill="url(#popO)"
						d="M486.19 275.78h24.89v24.89h-24.89z"
					/>
					<path fill="url(#popP)"
						d="M99.68 33.2h24.89v24.89H99.68z"
					/>
					<path transform="rotate(45 129.739 127.28)"
						fill="url(#popD)"
						d="M117.29 114.83h24.89v24.89h-24.89z"
					/>
					<path fill="url(#popQ)"
						d="M497.96 83.13h24.89v24.89h-24.89z"
					/>
					<path transform="rotate(45 360.597 306.394)"
						fill="url(#popE)"
						d="M348.16 293.95h24.89v24.89h-24.89z"
					/>
					<path transform="rotate(-90 453.445 170.375)"
						fill="url(#popR)"
						d="M441 157.93h24.89v24.89H441z"
					/>
					<path
						d="M259.29 216.92l-23.48-5C250.7 142.22 270.45 108 298 104.16c19.37-2.7 34.12 10.78 47.13 22.67 9 8.24 18.32 16.75 25 15.46 4.65-.91 20.65-9.41 30.92-80.86l23.75 3.41c-9.2 64.06-25.12 96.15-50.09 101a32.32 32.32 0 0 1-6.18.6c-15.61 0-28.26-11.56-39.57-21.9-9.55-8.73-19.43-17.76-27.64-16.62-7.16 1-25.52 11.65-42.03 89z"
						fill="url(#popS)"
					/>
					<path
						d="M165.61 272.85c14.26-25.34 38.57-81 20.93-143a167.17 167.17 0 0 0-27.32-54.6l19.2-14.4a190.93 190.93 0 0 1 31.2 62.42c21.45 75.34-11.17 141.67-26.27 166.8 0 0-5.66-5.29-10.53-10-3.82-3.79-7.21-7.22-7.21-7.22z"
						fill="url(#popT)"
					/>
					<path
						d="M261.71 303.45l-16.81-17.13a202.83 202.83 0 0 1 77.69-47.68c60.33-20 113.75-5.59 140.22 4.78l-8.76 22.35c-23.45-9.19-70.74-22-123.92-4.35a178.81 178.81 0 0 0-68.42 42.03z"
						fill="url(#popU)"
					/>
					<ellipse cx="164.21"
						cy="552.71"
						rx="145.33"
						ry="19.09"
						opacity="0.4"
					/>
				</g>
			</g>
		</SvgContainer>
	);
};

PartyPopper.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default PartyPopper;
