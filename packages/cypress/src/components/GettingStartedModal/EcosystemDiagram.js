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
/* eslint-disable max-len */ // Of course svg content is going to get a little long.  This is just noise.
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';

const SCOPE = 'ecosystemDiagram';

class EcosystemDiagram extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			activeItem: null,
		});
	}

	hoverItem = item => {
		if (item) {
			this.props.updateState(SCOPE, {
				activeItem: item,
			});
		}
	};

	mouseOutItem = item => {
		if (item) {
			this.props.updateState(SCOPE, {
				activeItem: null,
			});
		}
	};

	render() {
		const translate = this.props.translate;
		return (
			<div className="diagram--outer-svg-container">
				<svg
					width="1120"
					height="695"
					viewBox="0 0 1120 695" // **WE NEED A VIEWBOX TO SCALE THE DIAGRAM** //
					className="diagram--parent-container"
				>
					<defs>
						<linearGradient id="a"
							x1="309.42"
							y1="465.51"
							x2="768.94"
							y2="465.51"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#363d41"
							/>
							<stop offset="0.62"
								stopColor="#242a2e"
							/>
							<stop offset="1"
								stopColor="#363d41"
							/>
						</linearGradient>
						<linearGradient id="l"
							x1="530.96"
							y1="542.3"
							x2="758.21"
							y2="542.3"
							xlinkHref="#a"
						/>
						<linearGradient id="c"
							x1="539.59"
							y1="599.81"
							x2="539.59"
							y2="335.73"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#005cff"
							/>
							<stop offset="0.54"
								stopColor="#021a82"
							/>
						</linearGradient>
						<clipPath id="m">
							<path fill="none"
								d="M364.62 481.85l-.08-11.23-29.52-17.06.53-.92 30.05 17.37.08 11.83-1.06.01z"
							/>
						</clipPath>
						<clipPath id="n">
							<path fill="none"
								d="M352.16 481.46l-.09-11.06-29.52-17.06.53-.92 30.05 17.36.09 11.67-1.06.01z"
							/>
						</clipPath>
						<clipPath id="o">
							<path fill="none"
								d="M373.89 477.36l-.1-11.16-29.53-17.06.54-.92 30.04 17.37.11 11.76-1.06.01z"
							/>
						</clipPath>
						<clipPath id="p">
							<path transform="rotate(-59.7 749.886 486.831)"
								fill="none"
								d="M749.53 470.03h.66v33.61h-.66z"
							/>
						</clipPath>
						<clipPath id="q">
							<path transform="rotate(-59.7 767.31 484.16)"
								fill="none"
								d="M767.04 467.39h.66v33.55h-.66z"
							/>
						</clipPath>
						<clipPath id="r">
							<path d="M676.72 421.7l-25.25 14.59a7 7 0 0 1-7 0l-27.57-16a2.31 2.31 0 0 1 0-4l25.1-14.85z"
								fill="#051044"
							/>
						</clipPath>
						<clipPath id="s">
							<path
								d="M749.42 516.23l-41.13 23.88a9.16 9.16 0 0 1-9.22 0L662.71 519a3 3 0 0 1 0-5.23l41-24a9.29 9.29 0 0 1 9.37 0l36.38 21.14a3.09 3.09 0 0 1-.04 5.32z"
								fill="none"
							/>
						</clipPath>
						<linearGradient id="t"
							x1="625.81"
							y1="478.46"
							x2="693.86"
							y2="478.46"
							xlinkHref="#a"
						/>
						<clipPath id="u">
							<path
								d="M749.42 509.71l-41.13 23.87a9.16 9.16 0 0 1-9.22 0l-36.36-21.14a3 3 0 0 1 0-5.24l41-24a9.32 9.32 0 0 1 9.37 0l36.38 21.14a3.09 3.09 0 0 1-.04 5.37z"
								fill="none"
							/>
						</clipPath>
						<linearGradient id="v"
							x1="659.91"
							y1="487.16"
							x2="730.04"
							y2="512.68"
							xlinkHref="#a"
						/>
						<clipPath id="w">
							<path
								d="M749.42 506.47l-41.13 23.88a9.16 9.16 0 0 1-9.22 0l-36.36-21.15a3 3 0 0 1 0-5.23l41-24a9.29 9.29 0 0 1 9.37 0l36.38 21.13a3.09 3.09 0 0 1-.04 5.37z"
								fill="none"
							/>
						</clipPath>
						<linearGradient id="x"
							x1="666.54"
							y1="499.8"
							x2="747.23"
							y2="499.8"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0.12"
								stopColor="#242a2e"
							/>
							<stop offset="1"
								stopColor="#52585e"
							/>
						</linearGradient>
						<clipPath id="y">
							<path d="M672.6 419.3l-21.13 12.27a7 7 0 0 1-7 0l-27.57-16a2.31 2.31 0 0 1 0-4l21.2-12.4z"
								fill="none"
							/>
						</clipPath>
						<linearGradient id="z"
							x1="604.99"
							y1="414.94"
							x2="672.6"
							y2="414.94"
							xlinkHref="#a"
						/>
						<linearGradient id="b"
							x1="615.77"
							y1="414"
							x2="670.5"
							y2="414"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0.27"
								stopColor="#242a2e"
							/>
							<stop offset="0.47"
								stopColor="#292f33"
							/>
							<stop offset="0.71"
								stopColor="#363c41"
							/>
							<stop offset="0.96"
								stopColor="#4c5257"
							/>
							<stop offset="1"
								stopColor="#50565c"
							/>
						</linearGradient>
						<linearGradient id="A"
							x1="518.91"
							y1="416.66"
							x2="586.96"
							y2="416.66"
							xlinkHref="#a"
						/>
						<linearGradient id="B"
							x1="518.91"
							y1="414.21"
							x2="586.96"
							y2="414.21"
							xlinkHref="#b"
						/>
						<linearGradient id="C"
							x1="552.76"
							y1="446"
							x2="642.5"
							y2="446"
							xlinkHref="#a"
						/>
						<linearGradient id="D"
							x1="419.46"
							y1="452.4"
							x2="509.2"
							y2="452.4"
							xlinkHref="#a"
						/>
						<linearGradient id="E"
							x1="419.46"
							y1="449.16"
							x2="509.2"
							y2="449.16"
							xlinkHref="#b"
						/>
						<linearGradient id="F"
							x1="552.76"
							y1="442.76"
							x2="642.5"
							y2="442.76"
							xlinkHref="#b"
						/>
						<linearGradient id="G"
							x1="625.81"
							y1="476"
							x2="693.86"
							y2="476"
							xlinkHref="#b"
						/>
						<linearGradient id="H"
							x1="433.68"
							y1="520.93"
							x2="619.66"
							y2="520.93"
							xlinkHref="#a"
						/>
						<linearGradient id="I"
							x1="433.68"
							y1="516.14"
							x2="619.66"
							y2="516.14"
							xlinkHref="#b"
						/>
						<linearGradient id="J"
							x1="496.41"
							y1="546.23"
							x2="496.41"
							y2="525.43"
							xlinkHref="#a"
						/>
						<linearGradient id="K"
							x1="523.36"
							y1="561.77"
							x2="523.36"
							y2="540.98"
							xlinkHref="#a"
						/>
						<linearGradient id="L"
							x1="524.37"
							y1="509.23"
							x2="524.37"
							y2="530.02"
							xlinkHref="#a"
						/>
						<linearGradient id="M"
							x1="551.39"
							y1="545.57"
							x2="551.39"
							y2="524.78"
							xlinkHref="#a"
						/>
						<linearGradient id="N"
							x1="579.2"
							y1="529.62"
							x2="579.2"
							y2="508.82"
							xlinkHref="#a"
						/>
						<linearGradient id="d"
							x1="206.34"
							y1="614.36"
							x2="373.17"
							y2="614.36"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#363d41"
							/>
							<stop offset="0.27"
								stopColor="#121719"
							/>
							<stop offset="0.49"
								stopColor="#161b1e"
							/>
							<stop offset="0.75"
								stopColor="#23292c"
							/>
							<stop offset="1"
								stopColor="#363d41"
							/>
						</linearGradient>
						<linearGradient id="O"
							x1="278.55"
							y1="679.17"
							x2="317.76"
							y2="527.84"
							xlinkHref="#c"
						/>
						<linearGradient id="P"
							x1="246.11"
							y1="637.14"
							x2="324.77"
							y2="637.14"
							xlinkHref="#a"
						/>
						<linearGradient id="e"
							x1="246.11"
							y1="634.3"
							x2="324.77"
							y2="634.3"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0.27"
								stopColor="#242a2e"
							/>
							<stop offset="0.48"
								stopColor="#292f33"
							/>
							<stop offset="0.71"
								stopColor="#363c41"
							/>
							<stop offset="0.96"
								stopColor="#4c5257"
							/>
							<stop offset="1"
								stopColor="#50565c"
							/>
						</linearGradient>
						<linearGradient id="Q"
							x1="305.73"
							y1="656.52"
							x2="355.01"
							y2="656.52"
							xlinkHref="#a"
						/>
						<linearGradient id="R"
							x1="676.55"
							y1="625.36"
							x2="843.38"
							y2="625.36"
							xlinkHref="#d"
						/>
						<linearGradient id="S"
							x1="747.85"
							y1="689.79"
							x2="790.44"
							y2="539.38"
							xlinkHref="#c"
						/>
						<linearGradient id="T"
							x1="751.66"
							y1="615.33"
							x2="802.09"
							y2="615.33"
							xlinkHref="#a"
						/>
						<linearGradient id="U"
							x1="720.51"
							y1="653.22"
							x2="799.17"
							y2="653.22"
							xlinkHref="#a"
						/>
						<linearGradient id="V"
							x1="720.51"
							y1="650.38"
							x2="799.17"
							y2="650.38"
							xlinkHref="#e"
						/>
						<linearGradient id="g"
							x1="190.7"
							y1="387.44"
							x2="611.97"
							y2="397.8"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#242a2e"
							/>
							<stop offset="0.62"
								stopColor="#121719"
							/>
							<stop offset="1"
								stopColor="#242a2e"
							/>
						</linearGradient>
						<linearGradient id="h"
							x1="177.47"
							y1="327.87"
							x2="637.8"
							y2="327.87"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#121719"
							/>
							<stop offset="1"
								stopColor="#363d41"
							/>
						</linearGradient>
						<linearGradient id="f"
							x1="788.78"
							y1="357.67"
							x2="884.18"
							y2="357.67"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0.27"
								stopColor="#242a2e"
							/>
							<stop offset="0.48"
								stopColor="#292f33"
							/>
							<stop offset="0.71"
								stopColor="#363c41"
							/>
							<stop offset="0.96"
								stopColor="#4c5257"
							/>
							<stop offset="1"
								stopColor="#50565c"
							/>
						</linearGradient>
						<linearGradient id="W"
							x1="788.78"
							y1="348.21"
							x2="884.18"
							y2="348.21"
							xlinkHref="#f"
						/>
						<linearGradient id="X"
							x1="788.78"
							y1="338.59"
							x2="884.18"
							y2="338.59"
							xlinkHref="#f"
						/>
						<linearGradient id="Y"
							x1="1014.92"
							y1="340.93"
							x2="1058.12"
							y2="340.93"
							xlinkHref="#g"
						/>
						<linearGradient id="i"
							x1="1036.04"
							y1="349"
							x2="1045.87"
							y2="331.99"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#4e545a"
							/>
							<stop offset="0"
								stopColor="#4e545a"
							/>
							<stop offset="0.05"
								stopColor="#4b5157"
							/>
							<stop offset="0.43"
								stopColor="#3c4247"
							/>
							<stop offset="0.72"
								stopColor="#363d41"
							/>
							<stop offset="0.88"
								stopColor="#383f43"
							/>
							<stop offset="0.94"
								stopColor="#3e454a"
							/>
							<stop offset="0.98"
								stopColor="#4a5055"
							/>
							<stop offset="1"
								stopColor="#50565c"
							/>
						</linearGradient>
						<linearGradient id="Z"
							x1="975.04"
							y1="272.34"
							x2="1112.04"
							y2="272.34"
							xlinkHref="#a"
						/>
						<linearGradient id="aa"
							x1="976.66"
							y1="179.46"
							x2="1107.9"
							y2="366.89"
							xlinkHref="#h"
						/>
						<linearGradient id="ab"
							x1="763.59"
							y1="117.69"
							x2="791.76"
							y2="117.69"
							xlinkHref="#a"
						/>
						<linearGradient id="ac"
							x1="765.31"
							y1="86.4"
							x2="788.47"
							y2="150.04"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0.27"
								stopColor="#363d41"
							/>
							<stop offset="0.55"
								stopColor="#3b4146"
							/>
							<stop offset="0.86"
								stopColor="#484e53"
							/>
							<stop offset="1"
								stopColor="#50565c"
							/>
						</linearGradient>
						<linearGradient
							id="k"
							x1="-7348.76"
							y1="4252.92"
							x2="-7268.55"
							y2="4252.92"
							gradientTransform="matrix(-.5 .87 .87 .5 -7274.94 4535.92)"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0.28"
								stopColor="#4f555b"
							/>
							<stop offset="1"
								stopColor="#242a2e"
							/>
						</linearGradient>
						<linearGradient id="ad"
							x1="52.77"
							y1="348.13"
							x2="90.44"
							y2="348.13"
							xlinkHref="#a"
						/>
						<linearGradient id="j"
							x1="53.89"
							y1="348.45"
							x2="90.44"
							y2="348.45"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#363d41"
							/>
							<stop offset="1"
								stopColor="#121719"
							/>
						</linearGradient>
						<linearGradient id="ae"
							x1="-6587.39"
							y1="169.38"
							x2="-6544.2"
							y2="169.38"
							gradientTransform="matrix(-1 0 0 1 -6379.51 0)"
							xlinkHref="#g"
						/>
						<linearGradient id="af"
							x1="-6566.27"
							y1="177.45"
							x2="-6556.44"
							y2="160.44"
							gradientTransform="matrix(-1 0 0 1 -6379.51 0)"
							xlinkHref="#i"
						/>
						<linearGradient id="ag"
							x1="-6564.01"
							y1="105.92"
							x2="-6427"
							y2="105.92"
							gradientTransform="matrix(-1 0 0 1 -6321.82 0)"
							xlinkHref="#a"
						/>
						<linearGradient id="ah"
							x1="-6562.99"
							y1="128.53"
							x2="-6432.45"
							y2="85.57"
							gradientTransform="matrix(-1 0 0 1 -6321.82 0)"
							xlinkHref="#j"
						/>
						<linearGradient id="ai"
							x1="-7792.24"
							y1="4418.17"
							x2="-7712.03"
							y2="4418.17"
							xlinkHref="#k"
						/>
						<linearGradient id="aj"
							x1="418.23"
							y1="47.43"
							x2="455.91"
							y2="47.43"
							xlinkHref="#a"
						/>
						<linearGradient id="ak"
							x1="419.35"
							y1="47.75"
							x2="455.91"
							y2="47.75"
							xlinkHref="#j"
						/>
						<linearGradient
							id="al"
							x1="-2041.46"
							y1="-5495.99"
							x2="-1961.25"
							y2="-5495.99"
							gradientTransform="rotate(59.88 -5513.728 -468.326)"
							xlinkHref="#k"
						/>
						<linearGradient
							id="am"
							x1="-11043.1"
							y1="47.41"
							x2="-11005.42"
							y2="47.41"
							gradientTransform="matrix(-1 0 0 1 -10426.9 .02)"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0"
								stopColor="#363d41"
							/>
							<stop offset="0.41"
								stopColor="#242a2e"
							/>
							<stop offset="1"
								stopColor="#363d41"
							/>
						</linearGradient>
						<linearGradient id="an"
							x1="-11041.98"
							y1="47.74"
							x2="-11005.42"
							y2="47.74"
							gradientTransform="matrix(-1 0 0 1 -10426.9 .02)"
							xlinkHref="#h"
						/>
					</defs>
					<g
						data-name="Infrastructure layer"
						className={`
								diagram--infra-container
								${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--active-hover-item' : ''}
								${this.props.activeItem && this.props.activeItem !== 'infra' ? 'diagram--inactive-hover-item' : ''}
								${this.props.activeTextItem && this.props.activeTextItem !== 'infra' ? 'diagram--inactive-hover-item' : ''}
							`}
						onMouseOver={() => this.hoverItem('infra')}
						onMouseOut={() => this.mouseOutItem('infra')}
					>
						<path d="M706.86 397.34l2.61-4.1-5.76-3.39.79 7.45c-.03.98 1.93.88 2.36.04z"
							fill="#939292"
						/>
						<path
							d="M722.68 401.88l-17.59-12.08-41.53-24a6.77 6.77 0 0 1-3.39-5.87l-1.7-20.24c0-2.63 4.56-4.3 6.84-3l61.31 35.41a6.09 6.09 0 0 1 3 5.28v20.28c.02 3.05-4.02 5.9-6.94 4.22z"
							fill="#939292"
						/>
						<path
							d="M722.39 401.74l-19.11-11L662.15 367a7.6 7.6 0 0 1-3.79-6.57v-20.27a3.17 3.17 0 0 1 4.76-2.75l62 35.8a5.49 5.49 0 0 1 2.76 4.79v20.6c-.05 3.01-2.57 4.81-5.49 3.14z"
							fill="#bbbdbf"
						/>
						<path d="M705.53 397.6l2.62-4.1-5.76-3.39 2.05 7.32a.6.6 0 0 0 1.09.17z"
							fill="#bbbdbf"
						/>
						<path
							fill="#231f20"
							d="M671.45 353.9l-.01.5-1.43-.83-.04 6.27 1.44.83v.5l-3.34-1.93v-.5l1.43.83.04-6.27-1.44-.83v-.5l3.35 1.93zM675.24 359.6a3 3 0 0 1 1 2.35c0 1.17-.57 1.69-1.44 1.19l-2-1.16v-7.27l1.81 1a3 3 0 0 1 1.41 2.68c0 .9-.33 1.22-.83 1.15zm.54 2.29v-.43a2.1 2.1 0 0 0-1-1.85l-1.44-.83v2.93l1.43.83c.68.39 1 .1 1.06-.65m-2.46-6.37v2.74l1.3.75c.63.37 1 .1 1-.6V358a2 2 0 0 0-1-1.73l-1.3-.75M680.95 359.38l-.04 7.28-.43-.26.03-6.33-.05-.03-1.3 3.25-1.27-4.73-.04-.03-.04 6.34-.43-.25.04-7.27.61.35 1.13 4.26.04.02 1.15-2.94.6.34zM688.79 363.78a3.76 3.76 0 0 1 1.6 2.47H690a2.94 2.94 0 0 0-1.22-1.95c-1-.56-1.46.16-1.47 1.89v1c0 1.73.47 3 1.44 3.58.67.38 1 .05 1.22-.54l.4.47c-.25.68-.72 1.13-1.62.61q-1.95-1.14-1.94-4.9c.01-2.51.68-3.41 1.98-2.63zM693.54 366.21l-.04 7.2 1.46.85v.51l-3.39-1.96.01-.51 1.47.85.04-6.69-1.48-.85v-.51l1.93 1.11zM698 371a4.25 4.25 0 0 1 1.75 3.83c0 1.78-.68 2.44-1.78 1.8a4.23 4.23 0 0 1-1.75-3.83c.01-1.8.68-2.43 1.78-1.8zm0 5.11c.8.46 1.29.06 1.3-1.22v-.66a3 3 0 0 0-1.27-2.71c-.8-.45-1.29 0-1.3 1.22v.67a3 3 0 0 0 1.27 2.7M704.21 374.71v5.38l-.45-.26V379c-.16.42-.51.68-1.19.28a3.11 3.11 0 0 1-1.38-2.83v-3.47l.45.25v3.37a2.34 2.34 0 0 0 1 2.22c.56.32 1.11.26 1.11-.55v-3.79zM708.49 374.84l.45.26v7.71l-.45-.26v-.85c-.23.45-.65.61-1.26.25-1-.57-1.6-1.93-1.59-3.74s.62-2.46 1.62-1.89a3 3 0 0 1 1.25 1.71zm0 6.09v-2.13a2.32 2.32 0 0 0-1.12-1.87c-.82-.47-1.29 0-1.29 1.17v.75a3 3 0 0 0 1.27 2.65c.61.35 1.13.19 1.14-.57"
						/>
						<path
							fill="#231f20"
							d="M792.39 543.24l-.04 7.27-.43-.25.04-6.33-.05-.03-1.31 3.25-1.26-4.73-.05-.03-.03 6.34-.44-.26.04-7.27.61.35 1.13 4.26.04.02 1.16-2.93.59.34zM796.82 547.7v5.38l-.44-.26V552c-.16.41-.51.66-1.19.27a3.09 3.09 0 0 1-1.38-2.83v-3.47l.45.26v3.36a2.33 2.33 0 0 0 1 2.22c.56.32 1.1.26 1.1-.56v-3.77zM800.27 547.35l-.04 7.2 1.47.85-.01.5-3.39-1.95.01-.51 1.47.85.04-6.68-1.48-.86.01-.51 1.92 1.11zM804.57 550.27v1.9l1.93 1.12v.51l-1.93-1.12v4.36l1.93 1.11v.51l-1.74-1a1.35 1.35 0 0 1-.63-1.22v-4l-1.43-.83v-.5l1.14.65c.23.13.31.07.32-.24V550zM809.9 560.13l1.41.82v.51l-3.39-1.96v-.51l1.53.88.02-4.35-1.52-.88v-.51l1.97 1.14-.02 4.86zM809.7 553.7a.74.74 0 0 1-.39-.65v-.14c0-.23.11-.35.4-.18a.72.72 0 0 1 .39.64v.14c0 .23-.1.35-.4.19zM815.24 560.23l-.01.62-2.19-1.27v-.61l2.2 1.26zM819 560.39a3.15 3.15 0 0 1 1.44 2h-.36a2.37 2.37 0 0 0-1.08-1.49c-.82-.47-1.29 0-1.3 1.18v.75a3 3 0 0 0 1.28 2.66c.57.33 1 .18 1.17-.32l.33.48c-.23.56-.72.81-1.5.36a4.22 4.22 0 0 1-1.75-3.83c0-1.77.67-2.43 1.77-1.79zM823.8 560.93l-.04 7.2 1.47.85-.01.51-3.38-1.95v-.51l1.47.85.04-6.69-1.47-.85v-.51l1.92 1.1zM828.26 565.73a4.24 4.24 0 0 1 1.75 3.83c0 1.77-.68 2.43-1.78 1.79a4.22 4.22 0 0 1-1.74-3.82c.01-1.77.68-2.43 1.77-1.8zm0 5.11c.79.46 1.29 0 1.3-1.22V569a2.94 2.94 0 0 0-1.28-2.7c-.79-.46-1.29-.06-1.29 1.22v.66a3 3 0 0 0 1.28 2.71M834.47 569.44v5.37l-.45-.26v-.83c-.16.41-.51.66-1.19.26a3.06 3.06 0 0 1-1.38-2.82v-3.47l.44.25v3.37a2.29 2.29 0 0 0 1 2.21c.55.32 1.1.26 1.1-.55v-3.78zM838.76 569.57l.44.26v7.71l-.44-.26v-.85c-.23.46-.65.61-1.27.25-1-.57-1.6-1.93-1.59-3.73s.62-2.46 1.62-1.89a3 3 0 0 1 1.26 1.71zm0 6.08v-2.12a2.33 2.33 0 0 0-1.13-1.87c-.81-.47-1.28 0-1.29 1.17v.75a2.91 2.91 0 0 0 1.27 2.64c.6.35 1.13.2 1.14-.57M790.56 554.61c1.27.73 1.86 2.35 1.85 4.83s-.62 3.42-1.89 2.69-1.86-2.35-1.84-4.84.62-3.41 1.88-2.68zm0 7c.94.54 1.37-.21 1.38-1.94v-1c0-1.73-.41-3-1.35-3.52s-1.37.22-1.38 1.94v1c0 1.73.41 3 1.35 3.52M797.15 558.1v.51l-1.68-1v1.82l1.68 1v.51l-1.68-1v4.35l1.49.86v.51l-3.37-1.94v-.51l1.43.82v-4.35l-1.5-.87v-.51l1.5.87v-1.47c0-.52.2-.76.64-.5zM801.86 560.81v.52l-1.67-1v1.82l1.67 1v.51l-1.68-1v4.36l1.5.86v.51l-3.37-1.95V566l1.43.83v-4.36l-1.51-.87v-.5l1.51.87v-1.47c0-.53.2-.76.64-.51zM806.41 568.6l-3-1.76v.27a3.06 3.06 0 0 0 1.34 2.69c.58.34 1 .22 1.25-.36l.34.49c-.25.63-.81.84-1.6.39a4.27 4.27 0 0 1-1.79-3.85c0-1.78.71-2.42 1.78-1.8a4.17 4.17 0 0 1 1.72 3.67zm-3-2.26v.06l2.55 1.47v-.08a2.93 2.93 0 0 0-1.24-2.62c-.78-.45-1.31 0-1.31 1.17M811.4 568.67v.58l-.83-.48c-.73-.42-1.22-.08-1.22.89v2.69l1.65.95v.51l-3.37-1.94v-.51l1.27.73v-4.35l-1.27-.74v-.51l1.72 1v1.22c.17-.56.52-.93 1.32-.47zM814.53 575.36l1.42.82v.5l-3.39-1.95.01-.51 1.51.88.03-4.36-1.52-.87v-.51l1.97 1.13-.03 4.87zM814.34 568.92a.72.72 0 0 1-.39-.64v-.14c0-.23.11-.35.39-.19a.72.72 0 0 1 .39.64v.14c0 .27-.11.36-.39.19zM819 572.9a3.13 3.13 0 0 1 1.38 2.84v3.46l-.45-.26v-3.36a2.3 2.3 0 0 0-1-2.21c-.55-.32-1.1-.26-1.1.55v3.78l-.45-.26v-5.37l.45.26v.83c.09-.39.44-.65 1.17-.26zM825.5 576.7l-.93-.53v.49a3.21 3.21 0 0 1 .41 1.56c0 1.08-.61 1.48-1.51 1a2 2 0 0 1-.4-.29c-.33-.08-.63 0-.64.34s.21.59.66.85l1 .55a2.45 2.45 0 0 1 1.4 2.18c0 1.08-.7 1.17-2 .43s-1.77-1.52-1.77-2.36c0-.6.27-.8.72-.72v-.08a1.35 1.35 0 0 1-.38-1c0-.52.32-.61.72-.52a3.13 3.13 0 0 1-.76-2.07c0-1.1.59-1.49 1.49-1a2.87 2.87 0 0 1 .84.75v-.22c0-.32.11-.48.38-.32l.79.45zm-1 1.42v-.35a2 2 0 0 0-1-1.78c-.67-.38-1-.1-1 .61v.34a2.08 2.08 0 0 0 1 1.78c.68.39 1 .09 1-.6m-1.77 2.3c-.36 0-.59.11-.59.59a1.94 1.94 0 0 0 1.05 1.6l.53.3c.8.47 1.31.39 1.31-.32a1.59 1.59 0 0 0-1-1.4l-1.32-.77"
						/>
						<path
							d="M764.32 460.81L537.57 329.09l-224 131.51a8.33 8.33 0 0 0 0 14.38l215.82 126.13c.51.3 1 .57 1.57.82l-.56-.3-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.48 6.48 0 0 1 .06 11.17l6.11-3.54a9.28 9.28 0 0 0 0-16.05z"
							fill="url(#a)"
						/>
						<path d="M531 601.93a18.81 18.81 0 0 0 18.4-.27l208.74-121.21.07-.05-208 120.74a20.68 20.68 0 0 1-19.21.79z"
							fill="url(#l)"
						/>
						<path
							d="M758.14 480.45L549.36 601.66a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.49 6.49 0 0 1-.01 11.22z"
							fill="url(#c)"
						/>
						<g clipPath="url(#m)">
							<path
								d="M758.14 480.45L549.36 601.66a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.49 6.49 0 0 1-.01 11.22z"
								fill="#3989ff"
							/>
						</g>
						<g clipPath="url(#n)">
							<path
								d="M758.14 480.45L549.36 601.66a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.49 6.49 0 0 1-.01 11.22z"
								fill="#3989ff"
							/>
						</g>
						<path
							d="M352.73 485.78c-2.39 0-4.26-1-4.26-2.37s1.87-2.37 4.26-2.37 4.26 1 4.26 2.37-1.87 2.37-4.26 2.37zm0-3.94c-2 0-3.46.83-3.46 1.57s1.42 1.57 3.46 1.57 3.46-.83 3.46-1.57-1.42-1.57-3.46-1.57z"
							fill="#3989ff"
						/>
						<ellipse
							cx="425.37"
							cy="485.69"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="390.79"
							cy="485.52"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="442.61"
							cy="476.13"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="459.97"
							cy="465.9"
							rx="1.94"
							ry="0.99"
							fill="#989898"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="460.02"
							cy="485.92"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="407.82"
							cy="475.62"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="425.06"
							cy="466.06"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="529.25"
							cy="425.48"
							rx="1.94"
							ry="0.99"
							fill="#0043dd"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="511.83"
							cy="435.33"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="529.45"
							cy="445.4"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="668.52"
							cy="506.07"
							rx="1.94"
							ry="0.99"
							fill="#989898"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="651.1"
							cy="515.91"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="738.1"
							cy="465.44"
							rx="1.94"
							ry="0.99"
							fill="#0043dd"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="633.68"
							cy="505.57"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="703.04"
							cy="465.7"
							rx="1.94"
							ry="0.99"
							fill="#0043dd"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="599.03"
							cy="385.26"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="599.28"
							cy="405.33"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="581.61"
							cy="395.11"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="581.47"
							cy="375.19"
							rx="1.94"
							ry="0.99"
							fill="#005cff"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<path
							d="M365.2 486c-2.39 0-4.26-1-4.26-2.37s1.87-2.37 4.26-2.37 4.26 1 4.26 2.37-1.87 2.37-4.26 2.37zm0-3.94c-2 0-3.46.83-3.46 1.57s1.42 1.57 3.46 1.57 3.46-.82 3.46-1.57-1.42-1.57-3.46-1.57zM374.45 481.59c-2.39 0-4.26-1-4.26-2.37s1.87-2.38 4.26-2.38 4.26 1.05 4.26 2.38-1.87 2.37-4.26 2.37zm0-3.95c-2 0-3.46.83-3.46 1.58s1.42 1.56 3.46 1.56 3.46-.82 3.46-1.56-1.42-1.58-3.46-1.58z"
							fill="#3989ff"
						/>
						<g clipPath="url(#o)">
							<path
								d="M758.14 480.45L549.36 601.66a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.49 6.49 0 0 1-.01 11.22z"
								fill="#3989ff"
							/>
						</g>
						<g clipPath="url(#p)">
							<path
								d="M758.14 480.45L549.36 601.66a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.49 6.49 0 0 1-.01 11.22z"
								fill="#3989ff"
							/>
						</g>
						<g clipPath="url(#q)">
							<path
								d="M758.14 480.45L549.36 601.66a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.49 6.49 0 0 1-.01 11.22z"
								fill="#3989ff"
							/>
						</g>
						<path
							d="M733.33 478.89c-1.69 0-3-.73-3-1.67s1.33-1.66 3-1.66 3 .73 3 1.66-1.33 1.67-3 1.67zm0-2.83c-1.49 0-2.52.61-2.52 1.16s1 1.17 2.52 1.17 2.52-.61 2.52-1.17-1.03-1.16-2.52-1.16z"
							fill="#3989ff"
						/>
						<path fill="none"
							stroke="#3989ff"
							strokeMiterlimit="10"
							strokeWidth="0.5"
							d="M718.51 469.16l5.9 3.37"
						/>
						<path
							d="M726.31 475.26c-1.69 0-3-.73-3-1.66s1.33-1.67 3-1.67 3 .74 3 1.67-1.31 1.66-3 1.66zm0-2.83c-1.48 0-2.52.62-2.52 1.17s1 1.16 2.52 1.16 2.53-.61 2.53-1.16-1.04-1.17-2.53-1.17zM716.75 469.89c-1.7 0-3-.73-3-1.67s1.32-1.66 3-1.66 3 .73 3 1.66-1.31 1.67-3 1.67zm0-2.83c-1.49 0-2.52.61-2.52 1.16s1 1.17 2.52 1.17 2.52-.62 2.52-1.17-1.03-1.16-2.52-1.16zM750.75 476.33c-1.7 0-3-.73-3-1.67s1.32-1.66 3-1.66 3 .73 3 1.66-1.31 1.67-3 1.67zm0-2.83c-1.49 0-2.52.61-2.52 1.16s1 1.17 2.52 1.17 2.52-.62 2.52-1.17-1.03-1.16-2.52-1.16zM744.29 473.07c-1.7 0-3-.73-3-1.66s1.33-1.67 3-1.67 3 .73 3 1.67-1.29 1.66-3 1.66zm0-2.83c-1.49 0-2.53.61-2.53 1.17s1 1.16 2.53 1.16 2.52-.61 2.52-1.16-1.03-1.17-2.52-1.17z"
							fill="#3989ff"
						/>
						<ellipse
							cx="494.82"
							cy="545.86"
							rx="1.94"
							ry="0.99"
							fill="#989898"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="512.23"
							cy="555.64"
							rx="1.94"
							ry="0.99"
							fill="#989898"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="529.48"
							cy="526.45"
							rx="1.94"
							ry="0.99"
							fill="#989898"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="546.83"
							cy="516.22"
							rx="1.94"
							ry="0.99"
							fill="#989898"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="546.89"
							cy="536.24"
							rx="1.94"
							ry="0.99"
							fill="#989898"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<ellipse
							cx="668.51"
							cy="526.13"
							rx="1.94"
							ry="0.99"
							fill="#0043dd"
							className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--animate-shimmer-ellipse' : ''}`}
						/>
						<g opacity="0.4"
							fill="#051044"
						>
							<path d="M676.72 421.7l-25.25 14.59a7 7 0 0 1-7 0l-27.57-16a2.31 2.31 0 0 1 0-4l25.1-14.85z" />
							<g clipPath="url(#r)">
								<path
									d="M758.14 485.17L549.36 606.38a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65l216.22-126.44L758.15 474a6.49 6.49 0 0 1-.01 11.17z"
									opacity="0.8"
								/>
								<path d="M672.6 424.02l-25.39 15.04-42.22-24.32 26.91-14.48 40.7 23.76z" />
							</g>
						</g>
						<path
							d="M585.8 421l-31.19 18.11a7 7 0 0 1-7 0L520 423a2.31 2.31 0 0 1 0-4l31.07-18.17a7.07 7.07 0 0 1 7.1 0l27.59 16a2.34 2.34 0 0 1 .04 4.17z"
							fill="#051044"
							opacity="0.4"
						/>
						<g clipPath="url(#s)">
							<path fill="#051044"
								opacity="0.4"
								d="M708.85 481.99l-56.34 32.02 23.85 13.92 55.8-32.34-23.31-13.6z"
							/>
						</g>
						<path
							d="M641 453.71l-41.13 23.88a9.18 9.18 0 0 1-9.22 0l-36.36-21.14a3 3 0 0 1 0-5.23l41-24a9.29 9.29 0 0 1 9.37 0L641 448.37a3.09 3.09 0 0 1 0 5.34zM692.7 484.4l-31.19 18.11a7 7 0 0 1-7 0l-27.57-16a2.31 2.31 0 0 1 0-4L658 464.33a7 7 0 0 1 7.1 0l27.59 16a2.34 2.34 0 0 1 .01 4.07z"
							fill="#051044"
							opacity="0.4"
						/>
						<path
							d="M692.7 479.45l-31.19 18.1a7 7 0 0 1-7 0l-27.57-16a2.31 2.31 0 0 1 0-4L658 459.38a7 7 0 0 1 7.1 0l27.59 16a2.34 2.34 0 0 1 .01 4.07z"
							fill="url(#t)"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M674.81 489.21l7.07 4.1"
						/>
						<g clipPath="url(#u)">
							<path fill="url(#v)"
								d="M708.85 475.46l-56.34 32.02 29.5 17.23 55.34-32.13-28.5-17.12z"
							/>
						</g>
						<g clipPath="url(#w)">
							<path fill="url(#x)"
								d="M708.79 476.38l-51.8 29.58 27.58 17.26 53.11-30.83-28.89-16.01z"
							/>
						</g>
						<g clipPath="url(#y)">
							<path
								d="M758.14 480.45L549.36 601.66a18.85 18.85 0 0 1-19 0l-209-122.07a7.33 7.33 0 0 1 0-12.65L537.58 340.5l220.57 128.73a6.49 6.49 0 0 1-.01 11.22z"
								fill="#626366"
								opacity="0.8"
							/>
							<path fill="url(#z)"
								d="M672.6 419.3l-25.39 15.03-42.22-24.31 26.91-14.48 40.7 23.76z"
							/>
						</g>
						<path d="M670.5 418.07L636 397.94l-19.1 11.17a2.31 2.31 0 0 0 0 4l27.57 16a7 7 0 0 0 7 0z"
							fill="url(#b)"
						/>
						<path
							d="M585.8 417.65l-31.19 18.11a7 7 0 0 1-7 0l-27.57-16a2.3 2.3 0 0 1 0-4l31.07-18.17a7 7 0 0 1 7.1 0l27.59 16a2.34 2.34 0 0 1 0 4.06z"
							fill="url(#A)"
						/>
						<path
							d="M585.8 415.2l-31.19 18.11a7 7 0 0 1-7 0l-27.57-16a2.31 2.31 0 0 1 0-4l31.07-18.17a7 7 0 0 1 7.1 0l27.59 16a2.34 2.34 0 0 1 0 4.06z"
							fill="url(#B)"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M568.12 427.56l7.07 4.1"
						/>
						<path
							d="M641 447.31l-41.13 23.87a9.16 9.16 0 0 1-9.22 0L554.26 450a3 3 0 0 1 0-5.24l41-24a9.29 9.29 0 0 1 9.37 0L641 442a3.1 3.1 0 0 1 0 5.31z"
							fill="url(#C)"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M622.57 428.31l8.78-5.07"
						/>
						<g data-name="CA 1">
							<path
								d="M507.67 453.71l-41.13 23.88a9.18 9.18 0 0 1-9.22 0L421 456.44a3 3 0 0 1 0-5.23l41-24a9.29 9.29 0 0 1 9.37 0l36.38 21.14a3.09 3.09 0 0 1-.08 5.36z"
								fill="url(#D)"
							/>
							<path
								d="M507.67 450.48l-41.13 23.87a9.16 9.16 0 0 1-9.22 0L421 453.2a3 3 0 0 1 0-5.23l41-24a9.29 9.29 0 0 1 9.37 0l36.38 21.13a3.1 3.1 0 0 1-.08 5.38z"
								fill="url(#E)"
							/>
						</g>
						<path
							d="M641 444.07L599.84 468a9.16 9.16 0 0 1-9.22 0l-36.36-21.2a3 3 0 0 1 0-5.23l41-24a9.29 9.29 0 0 1 9.37 0L641 438.73a3.09 3.09 0 0 1 0 5.34z"
							fill="url(#F)"
						/>
						<path
							d="M692.7 477l-31.19 18.1a7 7 0 0 1-7 0l-27.57-16a2.31 2.31 0 0 1 0-4L658 456.93a7 7 0 0 1 7.1 0l27.59 16a2.35 2.35 0 0 1 .01 4.07z"
							fill="url(#G)"
						/>
						<path
							d="M616.48 534.63l-85.22 49.47a19 19 0 0 1-19.12 0l-75.35-43.82a6.29 6.29 0 0 1 0-10.84l84.9-49.66a19.25 19.25 0 0 1 19.41 0l75.39 43.8a6.42 6.42 0 0 1-.01 11.05z"
							fill="#051044"
							opacity="0.4"
						/>
						<path
							d="M616.48 523.64l-85.22 49.48a19 19 0 0 1-19.12 0l-75.35-43.82a6.3 6.3 0 0 1 0-10.85l84.9-49.65a19.25 19.25 0 0 1 19.41 0l75.39 43.8a6.41 6.41 0 0 1-.01 11.04z"
							fill="url(#H)"
						/>
						<path
							d="M616.48 518.85l-85.22 49.48a19 19 0 0 1-19.12 0l-75.35-43.81a6.3 6.3 0 0 1 0-10.85L521.68 464a19.25 19.25 0 0 1 19.41 0l75.39 43.8a6.41 6.41 0 0 1 0 11.05z"
							fill="url(#I)"
						/>
						<path
							d="M513.46 536.35l-16.18 9.39a3.62 3.62 0 0 1-3.63 0l-14.3-8.32a1.19 1.19 0 0 1 0-2.06l16.12-9.42a3.64 3.64 0 0 1 3.68 0l14.32 8.32a1.21 1.21 0 0 1-.01 2.09z"
							fill="url(#J)"
						/>
						<path
							d="M512.57 536.86l-15.39 8.93a3.43 3.43 0 0 1-3.45 0l-13.6-7.91a1.13 1.13 0 0 1 0-2l15.33-9a3.48 3.48 0 0 1 3.5 0l13.61 7.91a1.15 1.15 0 0 1 0 2.07z"
							fill="#1c2225"
						/>
						<path
							d="M540.41 551.89l-16.18 9.4a3.6 3.6 0 0 1-3.63 0L506.3 553a1.2 1.2 0 0 1 0-2.06l16.12-9.43a3.66 3.66 0 0 1 3.69 0l14.31 8.32a1.21 1.21 0 0 1-.01 2.06z"
							fill="url(#K)"
						/>
						<path
							d="M539.52 552.4l-15.39 8.94a3.41 3.41 0 0 1-3.45 0l-13.6-7.91a1.13 1.13 0 0 1 0-1.95l15.33-9a3.5 3.5 0 0 1 3.51 0l13.61 7.9a1.16 1.16 0 0 1-.01 2.02z"
							fill="#1c2225"
						/>
						<path
							d="M541.42 520.14l-16.18 9.4a3.6 3.6 0 0 1-3.63 0l-14.3-8.31a1.2 1.2 0 0 1 0-2.06l16.12-9.43a3.66 3.66 0 0 1 3.69 0l14.3 8.26a1.21 1.21 0 0 1 0 2.14z"
							fill="url(#L)"
						/>
						<path
							d="M540.53 520.65l-15.39 8.94a3.43 3.43 0 0 1-3.45 0l-13.6-7.92a1.13 1.13 0 0 1 0-1.95l15.33-9a3.5 3.5 0 0 1 3.51 0l13.61 7.9a1.16 1.16 0 0 1-.01 2.03z"
							fill="#1c2225"
						/>
						<path
							d="M568.44 535.69l-16.18 9.39a3.6 3.6 0 0 1-3.63 0l-14.31-8.32a1.2 1.2 0 0 1 0-2.06l16.12-9.42a3.66 3.66 0 0 1 3.69 0l14.31 8.32a1.22 1.22 0 0 1 0 2.09z"
							fill="url(#M)"
						/>
						<path
							d="M567.55 536.2l-15.39 8.93a3.43 3.43 0 0 1-3.45 0l-13.61-7.91a1.14 1.14 0 0 1 0-2l15.33-9a3.5 3.5 0 0 1 3.51 0l13.61 7.91a1.16 1.16 0 0 1 0 2.07z"
							fill="#1c2225"
						/>
						<path
							d="M596.25 519.74l-16.18 9.39a3.62 3.62 0 0 1-3.63 0l-14.3-8.32a1.19 1.19 0 0 1 0-2.06l16.11-9.43a3.69 3.69 0 0 1 3.69 0l14.31 8.31a1.22 1.22 0 0 1 0 2.11z"
							fill="url(#N)"
						/>
						<path
							d="M595.36 520.25L580 529.18a3.43 3.43 0 0 1-3.45 0l-13.6-7.91a1.13 1.13 0 0 1 0-2l15.32-9a3.47 3.47 0 0 1 3.51 0l13.61 7.91a1.16 1.16 0 0 1-.03 2.07z"
							fill="#1c2225"
						/>
						<path
							d="M448.83 552.73a.5.5 0 0 1-.25-.93l.26-.15a.49.49 0 0 1 .68.18.51.51 0 0 1-.18.69l-.26.15a.54.54 0 0 1-.25.06zm3.72-2.15a.5.5 0 0 1-.25-.93l.26-.15a.5.5 0 1 1 .5.86l-.26.15a.45.45 0 0 1-.25.07zm3.72-2.15a.49.49 0 0 1-.43-.26.5.5 0 0 1 .19-.68l.26-.15a.51.51 0 0 1 .68.19.5.5 0 0 1-.19.68l-.26.15a.52.52 0 0 1-.25.07zm3.73-2.16a.51.51 0 0 1-.44-.25.51.51 0 0 1 .19-.68l.25-.15a.51.51 0 0 1 .69.18.49.49 0 0 1-.18.68l-.26.15a.47.47 0 0 1-.25.07zm3.72-2.15a.52.52 0 0 1-.44-.25.52.52 0 0 1 .19-.69l.26-.15a.51.51 0 0 1 .68.19.5.5 0 0 1-.18.68l-.26.15a.59.59 0 0 1-.25.07z"
							fill="#bbb"
						/>
						<path
							d="M484.26 536.51l2.85 1.65-.25.14-3.2-1.85.39-.22 4.12.89-2.83-1.64.25-.14 3.2 1.84-.39.23zM488.35 536.07c-.78-.45-.85-.94-.21-1.31a2.27 2.27 0 0 1 2.27.12c.78.45.85.94.21 1.31a2.27 2.27 0 0 1-2.27-.12zm1.93-.94L490 535a1.58 1.58 0 0 0-1.61-.07c-.46.27-.45.61.11.94l.29.16a1.58 1.58 0 0 0 1.62.07c.44-.31.43-.65-.13-.97zM493.56 534c.12.22.05.47-.3.67a2.17 2.17 0 0 1-2.18-.17c-.8-.46-.89-.92-.3-1.26a1.74 1.74 0 0 1 1.16-.17l-1.4-.81.26-.15 3.39 2-.26.15zm-.34-.19l-.93-.54a1.25 1.25 0 0 0-1.2.07c-.48.27-.42.62.09.91l.33.19a1.59 1.59 0 0 0 1.59.06c.35-.22.46-.5.12-.7zM493.87 532.89c-.79-.45-.84-.95-.21-1.32a2.23 2.23 0 0 1 2.19.1l.11.06-1.77 1 .11.06a1.66 1.66 0 0 0 1.63 0c.35-.2.44-.45.26-.7h.32c.2.28.11.6-.35.87a2.27 2.27 0 0 1-2.29-.07zm.09-.26l1.5-.86a1.58 1.58 0 0 0-1.57-.06c-.47.29-.43.63.11.92zM512.26 520.51l2.85 1.65-.25.14-3.2-1.85.39-.22 4.12.89-2.83-1.64.25-.14 3.2 1.84-.39.23zM516.35 520.07c-.78-.45-.85-.94-.21-1.31a2.27 2.27 0 0 1 2.27.12c.78.45.85.94.2 1.31a2.25 2.25 0 0 1-2.26-.12zm1.93-.94L518 519a1.56 1.56 0 0 0-1.61-.07c-.47.27-.45.61.11.93l.29.17a1.6 1.6 0 0 0 1.62.07c.44-.31.43-.65-.13-.97zM521.56 518c.12.22.05.46-.31.67a2.15 2.15 0 0 1-2.17-.17c-.8-.46-.89-.92-.3-1.26a1.68 1.68 0 0 1 1.16-.17l-1.41-.81.27-.15 3.39 2-.26.15zm-.34-.2l-.93-.54a1.28 1.28 0 0 0-1.2.08c-.48.27-.42.62.09.91l.33.19a1.59 1.59 0 0 0 1.59.06c.35-.22.46-.5.12-.71zM521.87 516.89c-.79-.45-.84-.95-.21-1.32a2.26 2.26 0 0 1 2.19.09l.11.07-1.77 1 .11.06a1.66 1.66 0 0 0 1.63 0c.34-.2.43-.45.26-.7h.32c.2.28.11.6-.35.87a2.27 2.27 0 0 1-2.29-.07zm.09-.26l1.5-.86a1.58 1.58 0 0 0-1.57-.06c-.47.29-.43.62.11.92zM511.26 552.51l2.85 1.65-.25.14-3.2-1.85.39-.22 4.12.89-2.83-1.64.25-.14 3.2 1.84-.39.23zM515.35 552.07c-.79-.45-.85-.94-.21-1.31a2.27 2.27 0 0 1 2.27.12c.78.45.85.94.2 1.31a2.25 2.25 0 0 1-2.26-.12zm1.93-1L517 551a1.56 1.56 0 0 0-1.61-.07c-.47.27-.45.61.11.93l.29.17a1.58 1.58 0 0 0 1.61.07c.45-.31.43-.65-.12-.98zM520.56 550c.12.22.05.46-.31.67a2.15 2.15 0 0 1-2.17-.17c-.8-.46-.89-.92-.3-1.26a1.68 1.68 0 0 1 1.16-.17l-1.41-.81.26-.15 3.4 2-.26.15zm-.34-.2l-.93-.53a1.25 1.25 0 0 0-1.2.07c-.48.27-.42.62.09.91l.33.19a1.59 1.59 0 0 0 1.59.06c.35-.22.46-.5.12-.71zM520.87 548.89c-.79-.45-.84-.95-.21-1.32a2.26 2.26 0 0 1 2.19.09l.11.07-1.77 1 .11.06a1.66 1.66 0 0 0 1.63 0c.34-.2.43-.45.26-.7h.32c.2.28.11.6-.35.87a2.27 2.27 0 0 1-2.29-.07zm.09-.26l1.49-.86a1.58 1.58 0 0 0-1.57-.06c-.46.29-.42.63.12.92zM540.26 535.51l2.85 1.65-.25.14-3.2-1.85.39-.22 4.12.89-2.83-1.64.25-.14 3.2 1.84-.39.23zM544.35 535.07c-.78-.45-.85-.94-.21-1.31a2.27 2.27 0 0 1 2.27.12c.78.45.85.94.2 1.31a2.25 2.25 0 0 1-2.26-.12zm1.93-.94L546 534a1.58 1.58 0 0 0-1.61-.07c-.46.27-.45.61.11.93l.29.17a1.58 1.58 0 0 0 1.62.07c.44-.31.43-.65-.13-.97zM549.56 533c.12.22.05.47-.3.67a2.17 2.17 0 0 1-2.18-.17c-.8-.46-.89-.92-.3-1.26a1.74 1.74 0 0 1 1.16-.17l-1.41-.81.27-.15 3.39 2-.26.15zm-.34-.19l-.93-.54a1.25 1.25 0 0 0-1.2.07c-.48.27-.42.62.09.91l.33.19a1.59 1.59 0 0 0 1.59.06c.35-.22.46-.5.12-.7zM549.87 531.89c-.79-.45-.84-.95-.21-1.32a2.23 2.23 0 0 1 2.19.1l.11.06-1.77 1 .11.06a1.66 1.66 0 0 0 1.63 0c.35-.2.44-.45.26-.7h.32c.2.28.11.6-.35.87a2.27 2.27 0 0 1-2.29-.07zm.09-.26l1.5-.86a1.58 1.58 0 0 0-1.57-.06c-.47.29-.43.63.11.92zM568.26 519.51l2.85 1.65-.25.14-3.2-1.85.39-.22 4.12.89-2.83-1.64.25-.14 3.2 1.84-.39.23zM572.34 519.07c-.78-.45-.84-.94-.2-1.31a2.27 2.27 0 0 1 2.27.12c.78.45.85.94.2 1.31a2.27 2.27 0 0 1-2.27-.12zm1.94-.94L574 518a1.56 1.56 0 0 0-1.61-.07c-.47.27-.45.61.11.93l.29.17a1.58 1.58 0 0 0 1.61.07c.45-.31.43-.65-.12-.97zM577.56 517c.12.22.05.46-.31.67a2.15 2.15 0 0 1-2.17-.17c-.8-.46-.89-.92-.3-1.26a1.62 1.62 0 0 1 1.16-.17l-1.4-.81.26-.15 3.4 2-.26.15zm-.34-.2l-.94-.54a1.27 1.27 0 0 0-1.19.08c-.48.27-.42.62.09.91l.33.19a1.59 1.59 0 0 0 1.59.06c.35-.22.46-.5.12-.71zM577.86 515.89c-.78-.45-.83-1-.2-1.32a2.26 2.26 0 0 1 2.19.09l.11.07-1.77 1 .11.06a1.66 1.66 0 0 0 1.63 0c.34-.2.43-.45.26-.7h.32c.2.28.11.6-.35.87a2.29 2.29 0 0 1-2.3-.07zm.1-.26l1.49-.86a1.58 1.58 0 0 0-1.57-.06c-.46.29-.42.62.12.92z"
							fill="#f1f5f8"
						/>
						<path
							d="M447.49 518.34c-1.65-1-2-1.74-.85-2.38s2.48-.46 4.12.49 2 1.74.85 2.38-2.48.46-4.12-.49zm3.16-1.45l-.65-.38a3 3 0 0 0-3-.35c-.83.48-.54 1.08.6 1.74l.65.37a3 3 0 0 0 3 .35c.83-.48.54-1.07-.6-1.73zM453.79 517.08l1.12-.64-2.91-1.66-1.11.64-.34-.19 1.51-.87.81.46c-.29-.34-.36-.73.34-1.14l.61-.35.39.22-.73.42c-.64.37-.66.86 0 1.23l1.77 1 1.45-.83.33.19-2.95 1.71zM460.16 513.14c.19.34.08.7-.45 1a3.28 3.28 0 0 1-3.27-.25c-1.2-.69-1.33-1.38-.45-1.89a2.55 2.55 0 0 1 1.75-.26l-2.11-1.21.39-.23 5.1 2.94-.4.23zm-.51-.29l-1.4-.81a1.92 1.92 0 0 0-1.8.11c-.72.41-.63.92.14 1.37l.49.29a2.41 2.41 0 0 0 2.39.08c.53-.31.68-.75.18-1.04zM460.61 511.49c-1.17-.68-1.25-1.43-.31-2a3.39 3.39 0 0 1 3.29.14l.17.1-2.66 1.54.17.1a2.45 2.45 0 0 0 2.44.05c.52-.3.66-.66.4-1l.48-.07c.3.42.16.91-.53 1.31a3.45 3.45 0 0 1-3.45-.17zm.15-.39l2.24-1.3h-.05a2.38 2.38 0 0 0-2.35-.09c-.6.39-.6.95.16 1.39zM466.19 509.93l1.11-.65-2.88-1.66-1.11.65-.34-.2 1.51-.87.81.47c-.29-.33-.36-.73.34-1.13l.61-.36.39.23-.73.42c-.64.37-.65.85 0 1.22l1.77 1 1.45-.84.33.2-3 1.7zM467.28 504.17l-.09-.05c-.16-.1-.18-.22.07-.36a.61.61 0 0 1 .62 0h.09c.16.09.18.21-.07.36a.61.61 0 0 1-.62.05zm3.25 3.24l1.34-.77L469 505l-1.33.77-.34-.19 1.73-1 3.21 1.86 1.25-.72.34.19-3 1.72zM475 505.23l-3.56-2.05.4-.23.55.32c-.19-.27-.19-.62.41-1a2.51 2.51 0 0 1 2.56.07l2.29 1.32-.39.23-2.22-1.28a1.85 1.85 0 0 0-2-.08c-.49.28-.72.7-.18 1l2.5 1.44zM481.92 502.92c-1.11.64-1.89.71-2.45.39-.4-.24-.39-.5-.12-.8h-.05a1.08 1.08 0 0 1-.82-.08c-.35-.2-.25-.46 0-.71a2.43 2.43 0 0 1-1.74-.23c-.73-.42-.7-1 .09-1.45a2.49 2.49 0 0 1 .9-.32l-.14-.09c-.22-.12-.27-.26 0-.4l.7-.4.34.2-.81.47.32.18a2.4 2.4 0 0 1 1.24.3c.71.41.68 1-.11 1.45a2.83 2.83 0 0 1-.39.19c-.22.21-.34.44-.09.58s.5.07.89-.15l.84-.49a2.07 2.07 0 0 1 2.14-.19c.66.36.34.9-.74 1.55zm-2.9-2.69l-.22-.13a1.66 1.66 0 0 0-1.68.06c-.59.34-.57.71-.11 1l.23.13a1.67 1.67 0 0 0 1.67-.06c.6-.37.57-.74.09-1zm1.82 1.49l-1.16.67c-.22.24-.22.47.1.65a1.65 1.65 0 0 0 1.58-.16l.46-.27c.7-.41.91-.8.43-1.07a1.36 1.36 0 0 0-1.41.18zM457.49 524l.06-.31a3.53 3.53 0 0 0 2.12-.41c.76-.44.84-.9.19-1.27a2.05 2.05 0 0 0-1.94 0l-.63.26a2.76 2.76 0 0 1-2.52 0c-.86-.5-.67-1.1.28-1.65a3.67 3.67 0 0 1 2.27-.49v.31a3 3 0 0 0-1.9.4c-.71.41-.82.83-.22 1.18a2.07 2.07 0 0 0 1.92 0l.61-.26a2.8 2.8 0 0 1 2.56 0c.87.51.77 1.15-.25 1.74a4.06 4.06 0 0 1-2.55.5zM460.76 521c-1.18-.68-1.26-1.43-.32-2a3.37 3.37 0 0 1 3.29.14l.17.1-2.66 1.54.17.1a2.45 2.45 0 0 0 2.44 0c.52-.3.66-.66.4-1l.48-.07c.3.42.16.91-.53 1.31a3.43 3.43 0 0 1-3.44-.12zm.14-.4l2.25-1.3h-.06a2.38 2.38 0 0 0-2.35-.09c-.65.35-.6.91.16 1.34zM466.32 519.39l1.12-.65-2.88-1.66-1.11.64-.34-.19 1.51-.87.81.47c-.29-.33-.36-.73.34-1.13l.61-.36.39.22-.73.43c-.64.36-.65.85 0 1.22l1.77 1 1.45-.84.33.2-2.95 1.7zM472.07 516.46l-4.85-1.3.4-.23 4.35 1.19-2.08-2.51.4-.22 2.25 2.8zM471.55 511.24l-.09-.05c-.16-.09-.18-.21.07-.36a.61.61 0 0 1 .62 0h.09c.16.1.18.22-.07.36a.61.61 0 0 1-.62.05zm3.26 3.25l1.33-.77-2.88-1.66-1.33.77-.34-.2 1.73-1 3.21 1.86 1.25-.72.34.2-3 1.71zM477.39 511.34c-1.17-.68-1.28-1.41-.31-2a2.75 2.75 0 0 1 2.06-.27l-.16.27a2 2 0 0 0-1.56.2c-.72.42-.62.94.14 1.38l.49.29a2.44 2.44 0 0 0 2.41.07c.5-.29.59-.62.37-1l.47-.06c.27.38.18.84-.5 1.23a3.38 3.38 0 0 1-3.41-.11zM481.41 509c-1.18-.68-1.26-1.43-.31-2a3.32 3.32 0 0 1 3.28.14l.17.1-2.66 1.53.17.1a2.49 2.49 0 0 0 2.45.06c.51-.3.65-.67.39-1.05l.48-.06c.3.42.16.9-.53 1.3a3.41 3.41 0 0 1-3.44-.12zm.14-.39l2.25-1.29h-.06a2.36 2.36 0 0 0-2.35-.09c-.65.41-.6.96.16 1.4zM568.56 447.11l-5.56-3.24 2-1.16a3 3 0 0 1 3.09 0c1 .56 1.05 1.21.06 1.78l-1.53.88 2.46 1.42zm-2.39-1.94l1.52-.87c.66-.39.6-.83 0-1.15l-.38-.22a2 2 0 0 0-2 0l-1.52.88zM571.15 443.23c-1.37-.79-1.46-1.67-.36-2.31a3.89 3.89 0 0 1 3.83.17l.21.11-3.11 1.8.2.11a2.87 2.87 0 0 0 2.85.06c.6-.34.76-.77.46-1.22l.56-.07c.35.49.19 1.06-.62 1.53a4 4 0 0 1-4.02-.18zm.17-.46l2.62-1.51h-.06a2.77 2.77 0 0 0-2.75-.1c-.76.45-.69 1.1.19 1.61zM576 440.45c-1.37-.8-1.46-1.67-.36-2.31a3.92 3.92 0 0 1 3.83.16l.2.12-3.11 1.8.21.11a2.87 2.87 0 0 0 2.85.06c.6-.35.76-.77.45-1.22l.57-.07c.35.49.19 1.06-.62 1.52a4 4 0 0 1-4.02-.17zm.17-.46h.05l2.62-1.52h-.07a2.75 2.75 0 0 0-2.74-.1c-.84.46-.77 1.11.11 1.63zM582.47 438.63l1.3-.76-3.36-1.93-1.3.75-.39-.23 1.76-1 .95.55c-.34-.39-.42-.85.4-1.32l.71-.42.46.26-.86.49c-.74.44-.76 1 0 1.43l2.07 1.2 1.69-1 .39.22-3.45 2zM435 454.83l-5.6-3.23 2-1.16a3 3 0 0 1 3.1 0c1 .56 1 1.21.05 1.78l-1.52.89 2.46 1.42zm-2.39-1.93l1.52-.88c.66-.39.61-.83.05-1.15l-.38-.22a2 2 0 0 0-2 0l-1.51.88zM437.62 451c-1.38-.79-1.47-1.67-.37-2.3a3.91 3.91 0 0 1 3.84.16l.2.11-3.11 1.8.2.12a2.9 2.9 0 0 0 2.85.06c.6-.35.77-.78.46-1.22l.56-.08c.36.49.19 1.06-.62 1.53a4 4 0 0 1-4.01-.18zm.16-.46h.05l2.62-1.51h-.06a2.79 2.79 0 0 0-2.75-.1c-.8.4-.74 1.07.14 1.56zM442.44 448.17c-1.38-.79-1.47-1.67-.37-2.31a3.91 3.91 0 0 1 3.84.17l.2.11-3.11 1.8.2.11a2.87 2.87 0 0 0 2.85.06c.6-.34.76-.77.46-1.22l.56-.07c.36.49.19 1.06-.62 1.53a4 4 0 0 1-4.01-.18zm.16-.46l2.62-1.51h-.06a2.77 2.77 0 0 0-2.75-.1c-.75.45-.69 1.1.19 1.61zM448.93 446.35l1.3-.75-3.35-1.94-1.3.75-.4-.23 1.76-1 .95.54c-.34-.39-.42-.85.4-1.32l.71-.4.45.26-.85.5c-.75.43-.77 1 0 1.43l2.07 1.19 1.69-1 .39.22-3.44 2zM633.12 477.46q-1.65-1-.51-1.62a2.17 2.17 0 0 1 1.63-.15l-.13.2a1.62 1.62 0 0 0-1.26.09c-.57.33-.41.75.35 1.19l.43.25a2 2 0 0 0 2.06.2c.39-.23.35-.48.16-.73l.34-.07c.22.29.26.63-.27.93a2.71 2.71 0 0 1-2.8-.29zM636.31 476.11c-.78-.46-.83-1-.2-1.32a2.24 2.24 0 0 1 2.18.09l.12.07-1.78 1 .12.07a1.62 1.62 0 0 0 1.62 0c.35-.19.44-.44.27-.69h.32c.2.28.11.6-.35.87a2.32 2.32 0 0 1-2.3-.09zm.1-.27l1.49-.86a1.58 1.58 0 0 0-1.57-.06c-.46.26-.43.63.08.92zM640 475.06l.75-.42-1.92-1.11-.74.43-.23-.13 1-.58.54.31c-.2-.22-.24-.49.23-.76l.4-.23.26.15-.48.28c-.43.24-.44.57 0 .81l1.18.68 1-.55.23.13-2 1.13zM644 473a.72.72 0 0 1-.75 0l-1.76-1-.84.48-.23-.13.67-.38c.13-.08.13-.13 0-.21l-.65-.38.25-.14.83.48 1.13-.65.23.13-1.13.65 1.91 1.11 1.13-.66.23.13zM643.51 469.64h-.06c-.11-.06-.12-.14 0-.24a.41.41 0 0 1 .41 0h.06c.1.06.12.15-.05.24a.39.39 0 0 1-.36 0zm2.17 2.16l.89-.51-1.92-1.11-.89.51-.22-.13 1.15-.66 2.14 1.24.83-.48.22.13-2 1.14zM648.33 470.27l.83-.48-1.92-1.11-.88.51-.22-.13.88-.51-.65-.37c-.23-.13-.26-.29 0-.44l.87-.5.23.13-1 .57.8.46 1-.57.23.13-1 .57 1.91 1.11.88-.51.22.13-2 1.14zM649 466.46h-.06c-.11-.06-.12-.14 0-.24a.42.42 0 0 1 .42 0h.05c.11.06.12.15 0 .24a.39.39 0 0 1-.41 0zm2.17 2.16l.88-.51-1.89-1.11-.89.51-.23-.13 1.15-.66 2.15 1.23.83-.47.22.13-2 1.14zM652.91 466.52c-.78-.45-.86-.94-.21-1.31a1.83 1.83 0 0 1 1.38-.18l-.11.18a1.39 1.39 0 0 0-1 .13c-.48.28-.41.63.09.92l.33.19a1.61 1.61 0 0 0 1.6.05c.34-.19.4-.42.25-.64h.32c.17.25.11.55-.34.82a2.27 2.27 0 0 1-2.31-.16zM658.61 464.59a.59.59 0 0 1-.6 0h-.08c.14.2.09.44-.32.67a1.45 1.45 0 0 1-1.49.06c-.42-.24-.41-.54.29-.95l.59-.37-.29-.17a1.13 1.13 0 0 0-1.2 0c-.33.18-.42.39-.29.61h-.31c-.15-.23-.07-.52.39-.78a1.63 1.63 0 0 1 1.65 0l1.4.8.35-.2.23.13zm-1-.21l-.44-.25-.58.34c-.49.28-.54.49-.28.64l.12.07a1 1 0 0 0 1-.09c.38-.23.49-.52.18-.71zM660.55 463.47a.72.72 0 0 1-.75 0l-1.76-1-.84.48-.23-.13.67-.38c.13-.08.13-.13 0-.21l-.65-.38.25-.14.84.48 1.12-.65.23.13-1.13.65 1.92 1.11 1.12-.66.23.13zM661.1 461.8c-.79-.46-.84-1-.21-1.32a2.26 2.26 0 0 1 2.19.09l.11.07-1.77 1 .11.07a1.66 1.66 0 0 0 1.63 0c.34-.2.43-.45.26-.7h.32c.2.28.11.6-.35.87a2.3 2.3 0 0 1-2.29-.08zm.09-.27l1.49-.86a1.58 1.58 0 0 0-1.57-.06c-.46.26-.42.63.08.92zM642.27 480.39L641 480l-1.21.7.67.74-.29.16-2.17-2.43.36-.21 4.22 1.26zm-3.8-1.16l1.16 1.28 1.08-.62zM644.36 478.76c.13.18.13.41-.27.64a1.67 1.67 0 0 1-1.7-.05l-1.53-.88.26-.15 1.48.86a1.26 1.26 0 0 0 1.33.05c.32-.19.47-.47.12-.68l-1.67-1 .26-.15 2.37 1.37-.26.15zM646.88 477.73a.76.76 0 0 1-.76 0l-1.76-1-.83.48-.23-.13.66-.38c.14-.08.14-.14 0-.22l-.65-.37.26-.15.83.48 1.13-.65.22.13-1.13.65 1.92 1.11 1.13-.65.22.13zM645.35 474.69l.26-.15 1.4.8c-.13-.18-.13-.41.27-.64a1.67 1.67 0 0 1 1.7.05l1.53.88-.26.15-1.48-.86a1.26 1.26 0 0 0-1.33-.05c-.32.19-.48.47-.12.68l1.67 1-.26.15zM650.16 474.47c-.78-.45-.85-.94-.21-1.31a2.24 2.24 0 0 1 2.27.11c.78.45.85.94.21 1.31a2.27 2.27 0 0 1-2.27-.11zm1.93-1l-.29-.17a1.6 1.6 0 0 0-1.62-.06c-.46.26-.45.61.11.93l.3.17a1.58 1.58 0 0 0 1.61.06c.46-.22.45-.56-.11-.88zM653.89 473.42l.74-.43-1.92-1.1-.74.42-.23-.13 1-.58.54.32c-.2-.23-.24-.49.23-.76l.4-.24.26.15-.48.28c-.43.25-.44.57 0 .82l1.18.68 1-.56.23.13-2 1.14zM654.62 469.58h-.06c-.11-.06-.12-.14 0-.24a.43.43 0 0 1 .42 0h.06c.1.06.11.14-.05.24a.4.4 0 0 1-.37 0zm2.17 2.17l.89-.52-1.92-1.1-.89.51-.23-.13 1.15-.66 2.15 1.23.83-.48.22.13-2 1.15zM660.64 469.78a.72.72 0 0 1-.75 0l-1.76-1-.84.48-.22-.13.66-.38c.13-.08.14-.14 0-.22l-.65-.37.25-.15.84.49 1.13-.66.22.13-1.13.66 1.92 1.1 1.13-.65.22.13zM661.84 466.36l.26-.16 1.77 2.45c.12.16.1.27-.15.41l-.39.23-.22-.13.53-.31-.44-.62-3.26-.78.28-.16 2.78.71zM622.33 411.64q-1.65-1-.51-1.62a2.17 2.17 0 0 1 1.63-.15l-.13.19a1.62 1.62 0 0 0-1.26.1c-.57.33-.41.75.35 1.18l.43.25a2 2 0 0 0 2.06.2c.38-.22.35-.47.16-.72l.34-.08c.22.3.26.64-.27.94a2.71 2.71 0 0 1-2.8-.29zM625.52 410.28c-.78-.45-.83-.95-.2-1.31a2.21 2.21 0 0 1 2.18.09l.12.07-1.78 1 .12.07a1.66 1.66 0 0 0 1.63 0c.34-.2.43-.44.26-.69l.32-.05c.2.28.11.61-.36.87a2.28 2.28 0 0 1-2.29-.05zm.1-.26l1.49-.87a1.6 1.6 0 0 0-1.57-.06c-.46.27-.43.64.08.91zM629.23 409.24l.75-.43-1.92-1.1-.74.43-.23-.13 1-.58.54.31c-.2-.22-.24-.49.22-.76l.41-.24.26.15-.49.28c-.42.25-.43.57 0 .82l1.19.68 1-.55.23.13-2 1.13zM633.24 407.19a.72.72 0 0 1-.75 0l-1.76-1-.84.48-.23-.13.67-.38c.13-.08.13-.14 0-.21l-.65-.38.25-.15.83.49 1.13-.66.22.14-1.11.61 1.91 1.1 1.13-.65.23.13zM632.72 403.81h-.06c-.11-.06-.12-.14 0-.24a.4.4 0 0 1 .42 0h.06c.1.06.12.14 0 .24a.4.4 0 0 1-.42 0zm2.17 2.17l.89-.52-1.92-1.1-.89.51-.22-.13 1.15-.66 2.14 1.23.83-.48.22.13-2 1.15zM637.53 404.45l.84-.48-1.92-1.11-.88.51-.22-.13.88-.51-.65-.37c-.23-.14-.26-.29 0-.44l.87-.5.23.13-1 .57.8.46 1-.57.22.13-1 .57 1.92 1.11.88-.51.22.13-2 1.14zM638.23 400.63h-.06c-.11-.06-.12-.14 0-.24a.38.38 0 0 1 .41 0h.06c.11.06.12.14 0 .24a.38.38 0 0 1-.41 0zm2.16 2.17l.89-.52-1.91-1.1-.89.51-.23-.13 1.15-.66 2.15 1.23.83-.48.22.13-2 1.15zM631.48 414.57l-1.28-.39-1.21.69.67.75-.29.16-2.18-2.43.36-.21 4.22 1.26zm-3.8-1.17l1.17 1.28 1.08-.62zM633.57 412.93c.13.18.13.42-.27.65a1.67 1.67 0 0 1-1.7 0l-1.53-.88.26-.15 1.48.85a1.26 1.26 0 0 0 1.33.05c.32-.19.47-.46.12-.67l-1.67-1 .26-.15 2.35 1.37-.26.16zM636.09 411.9a.74.74 0 0 1-.76 0l-1.76-1-.84.49-.22-.13.66-.39c.14-.07.14-.13 0-.21l-.65-.37.26-.15.83.48 1.13-.65.22.13-1.13.65 1.92 1.11 1.13-.65.22.13zM634.56 408.87l.26-.15 1.4.8c-.12-.18-.12-.41.28-.64a1.65 1.65 0 0 1 1.7 0l1.53.89-.26.15-1.48-.86a1.26 1.26 0 0 0-1.33 0c-.32.19-.48.47-.12.67l1.67 1-.27.15zM639.37 408.64c-.78-.45-.85-.94-.21-1.31a2.27 2.27 0 0 1 2.27.12c.78.45.85.94.21 1.31a2.27 2.27 0 0 1-2.27-.12zm1.93-.94l-.29-.17a1.6 1.6 0 0 0-1.62-.07c-.46.27-.45.61.11.94l.3.17a1.58 1.58 0 0 0 1.61.06c.46-.27.45-.63-.11-.93zM643.1 407.6l.74-.43-1.92-1.11-.74.43-.23-.13 1-.58.54.31c-.2-.22-.24-.48.23-.75l.4-.24.26.15-.48.28c-.43.25-.44.57 0 .81l1.18.69 1-.56.23.13-2 1.14zM643.83 403.76h-.06c-.11-.07-.12-.15 0-.24a.4.4 0 0 1 .42 0c.11.06.12.14 0 .23a.39.39 0 0 1-.36.01zm2.17 2.16l.88-.51-1.88-1.11-.89.52-.22-.13L645 404l2.14 1.24.83-.48.22.13-2 1.14zM677.6 509.9l-5.6-3.24 2-1.16a3 3 0 0 1 3.1 0c1 .56 1 1.22 0 1.79l-1.53.88 2.46 1.42zm-2.39-1.9l1.51-.88c.67-.38.62-.83.06-1.15l-.38-.22a2 2 0 0 0-2 0l-1.52.88zM680.19 506c-1.37-.79-1.46-1.67-.36-2.3a3.94 3.94 0 0 1 3.84.16l.2.12-3.11 1.79.2.12a2.9 2.9 0 0 0 2.85.06c.6-.35.76-.78.46-1.22l.56-.08c.35.5.19 1.06-.62 1.53a4 4 0 0 1-4.02-.18zm.17-.45l2.62-1.51h-.06a2.79 2.79 0 0 0-2.75-.1c-.75.46-.69 1.06.19 1.62zM685 503.23c-1.37-.79-1.46-1.67-.36-2.3a3.89 3.89 0 0 1 3.83.16l.21.12-3.1 1.79.2.12a2.9 2.9 0 0 0 2.85.06c.6-.35.76-.78.46-1.22l.56-.08c.35.49.19 1.06-.62 1.53a4 4 0 0 1-4.03-.18zm.17-.46h.05l2.62-1.51h-.07a2.77 2.77 0 0 0-2.74-.1c-.8.45-.73 1.1.15 1.61zM691.51 501.41l1.3-.75-3.36-1.94-1.3.75-.39-.23 1.76-1 1 .55c-.34-.39-.42-.86.4-1.33l.71-.41.45.26-.85.49c-.74.43-.76 1 0 1.43l2.07 1.19 1.69-1 .39.23-3.45 2zM526 415.67q-1.65-1-.51-1.62a2.12 2.12 0 0 1 1.63-.15l-.13.19a1.62 1.62 0 0 0-1.26.1c-.57.33-.41.74.35 1.18l.43.25a2 2 0 0 0 2.06.2c.39-.22.35-.47.16-.72l.34-.08c.22.3.26.64-.27.94a2.73 2.73 0 0 1-2.8-.29zM529.23 414.31c-.78-.45-.83-.95-.2-1.31a2.21 2.21 0 0 1 2.18.09l.12.07-1.78 1 .12.07a1.66 1.66 0 0 0 1.63 0c.34-.2.43-.44.26-.7h.32c.2.28.11.61-.35.87a2.29 2.29 0 0 1-2.3-.09zm.1-.26l1.49-.87a1.59 1.59 0 0 0-1.56-.06c-.47.27-.44.64.07.93zM532.94 413.27l.75-.43-1.92-1.1-.74.42-.23-.13 1-.58.54.32c-.2-.23-.24-.49.23-.76l.4-.24.26.15-.48.28c-.43.25-.44.57 0 .82l1.18.68 1-.56.23.13-2 1.14zM537 411.22a.74.74 0 0 1-.75 0l-1.76-1-.84.48-.23-.13.67-.38c.13-.08.13-.14 0-.22l-.65-.37.25-.15.83.48 1.13-.65.23.13-1.13.65 1.91 1.11 1.13-.65.23.13zM536.43 407.84h-.06c-.11-.06-.12-.14 0-.24a.41.41 0 0 1 .41 0h.06c.1.06.12.14 0 .24a.4.4 0 0 1-.41 0zm2.17 2.16l.89-.52-1.92-1.1-.89.51-.22-.13 1.15-.66 2.14 1.23.83-.48.22.13-2 1.15zM541.25 408.48l.83-.49-1.92-1.1-.88.51-.22-.13.88-.51-.65-.37c-.23-.14-.26-.29 0-.44l.88-.5.22.13-1 .56.8.47 1-.57.23.13-1 .57 1.91 1.1.88-.5.22.13-2 1.14zM541.94 404.66h-.06c-.11-.06-.12-.14 0-.24a.4.4 0 0 1 .42 0c.11.06.12.14 0 .24a.4.4 0 0 1-.36 0zm2.17 2.17l.89-.52-1.92-1.1-.89.51-.23-.13 1.15-.66 2.15 1.23.83-.48.22.13-2 1.15zM545.83 404.73c-.78-.45-.86-.94-.21-1.32a1.88 1.88 0 0 1 1.38-.18l-.11.19a1.31 1.31 0 0 0-1 .13c-.48.27-.41.63.09.92l.33.19a1.61 1.61 0 0 0 1.6 0c.34-.19.4-.42.25-.65h.32c.17.26.11.56-.34.82a2.26 2.26 0 0 1-2.31-.1zM551.53 402.8a.61.61 0 0 1-.6 0l-.08-.05c.14.2.09.43-.32.67a1.48 1.48 0 0 1-1.49.06c-.42-.24-.41-.54.29-.95l.58-.34-.29-.16a1.15 1.15 0 0 0-1.2 0c-.33.19-.42.4-.29.62h-.31c-.15-.23-.07-.52.39-.79a1.68 1.68 0 0 1 1.65 0l1.4.81.35-.2.23.13zm-1-.21l-.44-.25-.58.33c-.49.28-.53.5-.28.65l.12.06a1 1 0 0 0 1-.08c.38-.23.49-.53.18-.71zM553.47 401.68a.74.74 0 0 1-.75 0l-1.76-1-.84.48-.23-.13.67-.38c.13-.08.13-.14 0-.22l-.65-.37.25-.15.84.48 1.12-.65.23.13-1.13.65 1.92 1.11 1.13-.65.22.13zM554 400c-.79-.45-.84-.95-.21-1.31a2.23 2.23 0 0 1 2.19.09l.11.07-1.77 1 .11.07a1.66 1.66 0 0 0 1.63 0c.34-.2.44-.44.26-.69h.32c.2.28.11.61-.35.87a2.27 2.27 0 0 1-2.29-.1zm.09-.26l1.49-.87a1.6 1.6 0 0 0-1.57-.06c-.44.27-.4.64.1.93zM535.19 418.59l-1.28-.39-1.21.7.67.75-.29.16-2.18-2.44.36-.21 4.22 1.27zm-3.8-1.16l1.16 1.28 1.08-.62zM537.28 417c.13.18.13.42-.27.65a1.67 1.67 0 0 1-1.7-.05l-1.53-.88.26-.15 1.48.85a1.26 1.26 0 0 0 1.33.05c.32-.19.47-.46.12-.67l-1.67-1 .26-.15 2.37 1.36-.26.15zM539.8 415.93a.74.74 0 0 1-.76 0l-1.76-1-.84.49-.22-.13.66-.39c.14-.07.14-.13 0-.21l-.65-.38.26-.14.83.48 1.13-.65.22.13-1.13.65 1.92 1.11 1.13-.65.22.13zM538.27 412.9l.26-.16 1.4.81c-.12-.18-.12-.41.28-.64a1.65 1.65 0 0 1 1.7 0l1.53.88-.26.16-1.48-.86a1.26 1.26 0 0 0-1.33-.05c-.32.19-.48.47-.12.67l1.67 1-.27.15zM543.08 412.67c-.78-.45-.85-.94-.21-1.31a2.27 2.27 0 0 1 2.27.12c.78.45.85.94.21 1.31a2.27 2.27 0 0 1-2.27-.12zm1.93-.94l-.29-.17a1.6 1.6 0 0 0-1.62-.07c-.46.27-.45.61.11.94l.3.17a1.58 1.58 0 0 0 1.61.06c.46-.27.45-.61-.12-.93zM546.8 411.63l.75-.43-1.92-1.11-.74.43-.23-.13 1-.58.54.31c-.2-.22-.24-.48.23-.75l.4-.24.26.15-.48.28c-.43.24-.44.57 0 .81l1.18.69 1-.56.23.13-2 1.14zM547.54 407.79h-.06c-.11-.07-.12-.15 0-.24a.4.4 0 0 1 .42 0h.06c.1.07.11.15 0 .24a.39.39 0 0 1-.42 0zm2.16 2.21l.9-.51-1.92-1.11-.89.52-.23-.13 1.15-.67 2.15 1.24.83-.48.22.13-2 1.14zM553.56 408a.72.72 0 0 1-.75 0l-1.76-1-.84.49-.22-.13.66-.39c.13-.07.14-.13 0-.21l-.65-.37.25-.15.84.48 1.13-.65.22.13-1.13.65 1.92 1.11 1.13-.65.22.13zM554.76 404.56l.26-.15 1.77 2.45c.11.15.1.26-.15.4l-.39.23-.22-.13.53-.31-.44-.61-3.26-.78.27-.16 2.79.68z"
							fill="#fff"
						/>
						<path
							d="M607.74 563.38v-1.84a2.26 2.26 0 0 1 3.4-1.93L717.91 622a4.45 4.45 0 0 1 1.08 3.12V637c0 .65.22 1.47.91 1.58l9.78 5.55M554.1 471.33l19-10.88M483.97 466.69l16.77 9.73M586.16 539.58l25.91 15a5.8 5.8 0 0 0 5.81 0l59.39-34.29M571.31 547.89l34.42 19.93M402.6 419.44L436.29 439M320.28 626.52l10.25-5.94a2.92 2.92 0 0 0 1.45-2.51v-10.72a6.49 6.49 0 0 1 3.23-5.62l100.72-58.36a2.1 2.1 0 0 1 3.14 1.81v2.24"
							fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeDasharray="0.3 4"
						/>
						<path
							fill="#fff"
							d="M767.82 406.15l-.01.78-1.2-.69-.05 9.36 1.2.69v.78l-3.11-1.79v-.78l1.21.69.04-9.36-1.19-.69v-.78l3.11 1.79zM772.12 411.37a4.62 4.62 0 0 1 2 4.23v5.14l-.67-.38v-5a3.49 3.49 0 0 0-1.53-3.3c-.85-.49-1.64-.37-1.65.82v5.63l-.67-.39v-8l.68.38v1.27c.33-.64.87-.95 1.84-.4zM778.56 411.7v.78l-1.33-.77v2.79l1.33.77v.78l-1.33-.77v7.23l-.67-.39v-7.22l-1-.6v-.78l1 .59v-2.24c0-.81.32-1.15 1-.79zM782.81 417.73v.88l-.53-.31c-1-.57-1.72-.36-1.73.67v5.47l-.67-.38v-8l.67.39v1.44c.24-.61.78-1 1.81-.4zM788 428l.82.47v.78l-.68-.39a1.61 1.61 0 0 1-.76-1.43v-.28h-.06c-.27.73-.89.94-1.83.4a4 4 0 0 1-2-3.51c0-1.42.72-1.91 2.46-.9l1.39.8V423a3.1 3.1 0 0 0-1.53-2.88c-.8-.46-1.32-.29-1.66.35l-.42-.71c.34-.73 1-1 2.1-.4a4.37 4.37 0 0 1 2.18 3.93zm-.66-1.93v-1.49l-1.41-.81c-1.2-.7-1.72-.45-1.73.44v.38a2.6 2.6 0 0 0 1.37 2.22c1 .56 1.76.34 1.76-.74M791.94 422.82a5 5 0 0 1 2 2.42l-.45.29a4.23 4.23 0 0 0-1.64-2c-.86-.49-1.37-.25-1.37.65a2.68 2.68 0 0 0 1.29 2.22l.48.37a4 4 0 0 1 1.79 3.28c0 1.49-.83 1.91-2.16 1.14a5.61 5.61 0 0 1-2.31-2.87l.5-.23a4.62 4.62 0 0 0 1.86 2.36c.92.53 1.45.29 1.46-.68a2.67 2.67 0 0 0-1.23-2.21l-.49-.4a4 4 0 0 1-1.84-3.3c.06-1.47.95-1.71 2.11-1.04zM796.81 423.57v2.24l1.36.79v.78l-1.36-.79v6.45l1.27.73v.78l-1.2-.69a1.59 1.59 0 0 1-.74-1.41v-6.24l-1-.61v-.78l.68.39c.33.19.43.08.43-.36v-1.64zM802.69 429.21v.88l-.53-.31c-1-.57-1.72-.36-1.73.67v5.47l-.67-.38v-8l.67.39v1.44c.24-.61.77-1 1.8-.4zM808.41 432.51v8l-.67-.39v-1.26c-.23.62-.73 1-1.76.44a4.61 4.61 0 0 1-2-4.23v-5.14l.67.38v5a3.5 3.5 0 0 0 1.54 3.32c.83.48 1.62.36 1.63-.85v-5.61zM812.72 434.81a4.85 4.85 0 0 1 2.13 3l-.57.05a3.49 3.49 0 0 0-1.57-2.26c-1.22-.71-1.88.06-1.89 1.74v1.13a4.36 4.36 0 0 0 1.87 3.92c.82.47 1.39.3 1.73-.4l.5.73c-.4.84-1.13 1.1-2.24.47-1.64-1-2.59-3.05-2.57-5.7s.96-3.63 2.61-2.68zM817.41 435.46v2.24l1.36.79v.78l-1.36-.78v6.44l1.27.73v.78l-1.2-.69a1.59 1.59 0 0 1-.74-1.41v-6.24l-1-.61v-.78l.68.4c.33.19.43.08.43-.37v-1.63zM824.81 442v8l-.67-.39v-1.26c-.23.62-.73 1-1.76.44a4.62 4.62 0 0 1-2-4.23v-5.14l.67.38v5a3.5 3.5 0 0 0 1.54 3.32c.83.48 1.62.35 1.63-.85v-5.61zM829.92 444.93v.88l-.53-.31c-1-.58-1.72-.36-1.72.67v5.47l-.67-.39v-8l.67.38v1.44h.05c.24-.61.77-1 1.81-.4zM835.82 452.53l-4.45-2.53v.39a4.55 4.55 0 0 0 1.95 4c.86.49 1.5.3 1.84-.56l.49.72c-.39 1-1.23 1.26-2.37.6-1.61-.93-2.62-3.09-2.61-5.71s1.05-3.6 2.65-2.68 2.53 3.06 2.52 5.41zm-4.45-3.34v.08l3.73 2.15v-.12a4.43 4.43 0 0 0-1.8-3.85c-1.16-.67-1.92.05-1.93 1.74M841 447.76v10.79l.93.54v.78l-.86-.49a1.59 1.59 0 0 1-.74-1.4l.06-10.61zM847.41 462.28l.81.47v.78l-.69-.4a1.65 1.65 0 0 1-.76-1.42v-.28h-.06c-.28.74-.89.95-1.83.4a3.92 3.92 0 0 1-2-3.51c0-1.42.72-1.9 2.46-.9l1.39.8v-.93a3 3 0 0 0-1.53-2.88c-.8-.46-1.32-.29-1.65.35l-.42-.72c.33-.73 1-1 2.1-.4a4.37 4.37 0 0 1 2.17 3.94zm-.66-1.94v-1.48l-1.41-.82c-1.2-.69-1.72-.44-1.72.45v.37a2.59 2.59 0 0 0 1.37 2.22c1 .56 1.76.34 1.77-.74M853.83 458.74l-2.83 8.65c-.19.56-.39.65-1 .3l-.68-.4v-.78l1 .59.59-1.78-2.19-9.53.7.4 1.81 8.12 1.87-6zM859.77 466.35l-4.46-2.57v.39a4.56 4.56 0 0 0 2 4c.86.5 1.5.3 1.84-.56l.49.72c-.38 1-1.22 1.26-2.37.6-1.61-.93-2.62-3.08-2.61-5.71s1-3.6 2.65-2.68 2.53 3.06 2.52 5.41zm-4.46-3.35v.08l3.73 2.15v-.12a4.41 4.41 0 0 0-1.8-3.85c-1.16-.67-1.92.05-1.93 1.74M864.41 464.85v.87l-.53-.3c-1-.58-1.72-.37-1.73.66v5.48l-.67-.39v-8l.67.39V465c.24-.62.78-1 1.81-.4z"
						/>
					</g>
					<g
						data-name="Multi cloud"
						className={`
								diagram--multiCloud-container
								${this.props.activeItem === 'multiCloud' || this.props.activeTextItem === 'multiCloud' ? 'diagram--active-hover-item' : ''}
								${this.props.activeItem && this.props.activeItem !== 'multiCloud' ? 'diagram--inactive-hover-item' : ''}
								${this.props.activeTextItem && this.props.activeTextItem !== 'multiCloud' ? 'diagram--inactive-hover-item' : ''}
								`}
						onMouseOver={() => this.hoverItem('multiCloud')}
						onMouseOut={() => this.mouseOutItem('multiCloud')}
					>
						<path d="M223.24 590.54l-2.68-4.18 5.9-3.48-.81 7.63c.03 1-1.97.9-2.41.03z"
							fill="#939292"
						/>
						<path
							d="M265.76 518.26L203 554.51a6.26 6.26 0 0 0-3.12 5.41v31c0 3.08 4.14 6 7.12 4.28l18-12.37 42.51-24.55a6.92 6.92 0 0 0 3.47-6l1.74-31c.05-2.66-4.62-4.37-6.96-3.02z"
							fill="#939292"
						/>
						<path
							d="M207.33 595.05l19.57-11.3 42.1-24.3a7.77 7.77 0 0 0 3.88-6.73v-30.94A3.24 3.24 0 0 0 268 519l-63.43 36.64a5.66 5.66 0 0 0-2.83 4.9v31.33c.03 3.06 2.61 4.89 5.59 3.18z"
							fill="#bbbdbf"
						/>
						<path d="M224.6 590.81l-2.68-4.19 5.89-3.47-2.1 7.49a.61.61 0 0 1-1.11.17z"
							fill="#bbbdbf"
						/>
						<path
							fill="#231f20"
							d="M214.47 560.86l.1 7.23-.43.26-.09-6.31-.05.03-1.25 4.72-1.36-3.21-.05.03.09 6.3-.43.25-.1-7.24.62-.35 1.2 2.91.05-.03 1.1-4.24.6-.35zM219 560.14l.07 5.35-.45.26v-.83a2.64 2.64 0 0 1-1.19 1.65c-.88.51-1.42.09-1.44-1.21l-.05-3.46.46-.26V565c0 1.09.41 1.37 1.1 1a2.17 2.17 0 0 0 1.1-1.82l-.06-3.77zM222.46 555.81l.1 7.16 1.49-.86.01.51-3.44 1.98-.01-.5 1.5-.86-.1-6.66-1.49.86-.01-.51 1.95-1.12zM226.84 553.72v1.88l2-1.13v.53l-2 1.13.06 4.33 2-1.13v.5l-1.77 1c-.44.26-.65 0-.66-.49l-.05-4-1.46.84v-.51l1.16-.67a.57.57 0 0 0 .31-.6v-1.47zM232.37 557.31l1.44-.83.01.5-3.44 1.99-.01-.51 1.55-.89-.06-4.33-1.55.89-.01-.51 2-1.16.07 4.85zM232.05 551.17c-.29.16-.4.05-.41-.19v-.13a.71.71 0 0 1 .4-.64c.28-.17.4-.06.4.18v.13a.7.7 0 0 1-.39.65zM237.73 551.23l.01.62-2.23 1.28v-.61l2.22-1.29zM241.52 547c.76-.45 1.26-.23 1.48.36l-.36.45c-.18-.5-.56-.61-1.11-.29a2.93 2.93 0 0 0-1.28 2.66v.74c0 1.15.5 1.64 1.34 1.15a2.64 2.64 0 0 0 1.17-1.66l.34.08a3.39 3.39 0 0 1-1.51 2.1c-1.14.66-1.81 0-1.83-1.76a4.16 4.16 0 0 1 1.76-3.83zM246.34 542.02l.1 7.16 1.49-.85.01.5-3.44 1.99-.01-.51 1.5-.86-.09-6.66-1.5.86-.01-.5 1.95-1.13zM250.92 541.59c1.11-.65 1.8 0 1.83 1.77a4.21 4.21 0 0 1-1.75 3.83c-1.11.64-1.81 0-1.83-1.77a4.19 4.19 0 0 1 1.75-3.83zm.07 5.08a2.92 2.92 0 0 0 1.28-2.7v-.67c0-1.26-.53-1.65-1.33-1.19a2.91 2.91 0 0 0-1.28 2.7v.67c0 1.26.53 1.65 1.33 1.19M257.22 538.08l.07 5.35-.45.26v-.83a2.59 2.59 0 0 1-1.18 1.65c-.89.51-1.42.09-1.44-1.21v-3.45l.45-.27.05 3.36c0 1.09.41 1.37 1.1 1a2.2 2.2 0 0 0 1.1-1.83l-.06-3.76zM261.52 533.26l.48-.26.11 7.67-.45.27v-.85a3 3 0 0 1-1.27 1.71c-1 .59-1.64-.06-1.66-1.86s.57-3.16 1.59-3.74c.62-.36 1.05-.21 1.29.24zm.09 6v-2.12c0-.75-.55-.9-1.16-.55a2.93 2.93 0 0 0-1.28 2.65v.76c0 1.16.5 1.63 1.33 1.15a2.3 2.3 0 0 0 1.13-1.87M212.86 574.21c1.28-.73 1.91.17 1.94 2.65s-.56 4.1-1.84 4.84-1.91-.17-2-2.65.62-4.05 1.9-4.84zm.1 6.95c.95-.55 1.36-1.79 1.34-3.51v-1c0-1.72-.46-2.47-1.41-1.92s-1.37 1.8-1.35 3.51v1c0 1.71.47 2.46 1.43 1.91M219.54 570v.51l-1.7 1v1.82l1.7-1v.52l-1.71 1 .07 4.33 1.52-.88v.51l-3.43 2v-.5l1.44-.84-.06-4.33-1.53.88v-.51l1.53-.88v-1.47a1.32 1.32 0 0 1 .64-1.22zM224.31 567.29v.5l-1.7 1v1.82l1.71-1v.51l-1.7 1 .06 4.33 1.52-.87v.5l-3.42 2v-.51l1.45-.83-.06-4.34-1.53.89v-.52l1.53-.88v-1.46a1.3 1.3 0 0 1 .63-1.23zM229 569.71l-3 1.78v.26c0 1.14.54 1.61 1.39 1.12a2.86 2.86 0 0 0 1.25-1.8l.35.08a3.62 3.62 0 0 1-1.6 2.24c-1.13.65-1.85 0-1.87-1.72a4.25 4.25 0 0 1 1.76-3.86c1.09-.63 1.77.07 1.79 1.64zm-3 1.29v.06l2.6-1.5v-.09c0-1.15-.51-1.6-1.29-1.15A3 3 0 0 0 226 571M234 564v.58l-.84.49a2.62 2.62 0 0 0-1.22 2.3v2.67l1.67-1v.5l-3.41 2v-.5l1.29-.74-.06-4.34-1.29.74v-.51l1.73-1v1.23a2.89 2.89 0 0 1 1.32-2zM237.32 567l1.44-.83.01.5-3.44 1.99-.01-.51 1.55-.89-.06-4.33-1.55.89-.01-.51 2-1.16.07 4.85zM237 560.86c-.29.16-.4.06-.4-.19v-.13a.71.71 0 0 1 .4-.64c.28-.17.4-.06.4.18v.13a.73.73 0 0 1-.4.65zM241.71 559.46c.88-.51 1.42-.09 1.43 1.21l.05 3.45-.45.26-.05-3.34c0-1.11-.4-1.39-1.1-1a2.19 2.19 0 0 0-1.09 1.83l.05 3.76-.45.27-.08-5.36.46-.26v.83a2.57 2.57 0 0 1 1.23-1.65zM248.36 555.64l-.94.54v.49a1.21 1.21 0 0 1 .44 1.08 3.18 3.18 0 0 1-1.49 2.69 1.9 1.9 0 0 1-.42.18 1.6 1.6 0 0 0-.62 1.07c0 .31.22.34.67.08l1-.57c1-.57 1.43-.29 1.45.53 0 1.08-.68 2-2 2.73s-1.8.54-1.81-.3a2 2 0 0 1 .7-1.53v-.09c-.26 0-.39-.15-.4-.5a1.89 1.89 0 0 1 .71-1.34c-.5 0-.79-.4-.8-1.17a3.09 3.09 0 0 1 1.48-2.69 1.23 1.23 0 0 1 .85-.22v-.22a.83.83 0 0 1 .39-.78l.8-.46zm-1 2.55v-.35c0-.69-.37-1-1.06-.58a2 2 0 0 0-1 1.78v.34c0 .68.37 1 1 .59a2 2 0 0 0 1-1.78m-1.74 4.33a1.8 1.8 0 0 0-.57 1.27c0 .56.37.77 1.08.35l.54-.31A2.22 2.22 0 0 0 248 562c0-.51-.27-.69-1-.26l-1.35.77"
						/>
						<path d="M828.08 598.19l2.62-4.09-5.76-3.4.79 7.46c-.04.98 1.92.84 2.35.03z"
							fill="#939292"
						/>
						<path
							d="M843.9 602.74l-17.59-12.09-41.53-24a6.77 6.77 0 0 1-3.38-5.86l-1.71-30.24c0-2.63 4.57-4.31 6.85-3l61.3 35.45a6.08 6.08 0 0 1 3 5.28v30.28c.02 3.01-4.02 5.85-6.94 4.18z"
							fill="#939292"
						/>
						<path
							d="M843.62 602.59l-19.12-11-41.12-23.75a7.53 7.53 0 0 1-3.79-6.56V531a3.17 3.17 0 0 1 4.76-2.74l62 35.79a5.53 5.53 0 0 1 2.77 4.79v30.61c-.07 3.02-2.58 4.82-5.5 3.14z"
							fill="#bbbdbf"
						/>
						<path d="M826.75 598.45l2.62-4.09-5.76-3.4 2 7.33a.6.6 0 0 0 1.14.16z"
							fill="#bbbdbf"
						/>
						<path
							fill="#231f20"
							d="M792.39 543.24l-.04 7.27-.43-.25.04-6.33-.05-.03-1.31 3.25-1.26-4.73-.05-.03-.03 6.34-.44-.26.04-7.27.61.35 1.13 4.26.04.02 1.16-2.93.59.34zM796.82 547.7v5.38l-.44-.26V552c-.16.41-.51.66-1.19.27a3.09 3.09 0 0 1-1.38-2.83v-3.47l.45.26v3.36a2.33 2.33 0 0 0 1 2.22c.56.32 1.1.26 1.1-.56v-3.77zM800.27 547.35l-.04 7.2 1.47.85-.01.5-3.39-1.95.01-.51 1.47.85.04-6.68-1.48-.86.01-.51 1.92 1.11zM804.57 550.27v1.9l1.93 1.12v.51l-1.93-1.12v4.36l1.93 1.11v.51l-1.74-1a1.35 1.35 0 0 1-.63-1.22v-4l-1.43-.83v-.5l1.14.65c.23.13.31.07.32-.24V550zM809.9 560.13l1.41.82v.51l-3.39-1.96v-.51l1.53.88.02-4.35-1.52-.88v-.51l1.97 1.14-.02 4.86zM809.7 553.7a.74.74 0 0 1-.39-.65v-.14c0-.23.11-.35.4-.18a.72.72 0 0 1 .39.64v.14c0 .23-.1.35-.4.19zM815.24 560.23l-.01.62-2.19-1.27v-.61l2.2 1.26zM819 560.39a3.15 3.15 0 0 1 1.44 2h-.36a2.37 2.37 0 0 0-1.08-1.49c-.82-.47-1.29 0-1.3 1.18v.75a3 3 0 0 0 1.28 2.66c.57.33 1 .18 1.17-.32l.33.48c-.23.56-.72.81-1.5.36a4.22 4.22 0 0 1-1.75-3.83c0-1.77.67-2.43 1.77-1.79zM823.8 560.93l-.04 7.2 1.47.85-.01.51-3.38-1.95v-.51l1.47.85.04-6.69-1.47-.85v-.51l1.92 1.1zM828.26 565.73a4.24 4.24 0 0 1 1.75 3.83c0 1.77-.68 2.43-1.78 1.79a4.22 4.22 0 0 1-1.74-3.82c.01-1.77.68-2.43 1.77-1.8zm0 5.11c.79.46 1.29 0 1.3-1.22V569a2.94 2.94 0 0 0-1.28-2.7c-.79-.46-1.29-.06-1.29 1.22v.66a3 3 0 0 0 1.28 2.71M834.47 569.44v5.37l-.45-.26v-.83c-.16.41-.51.66-1.19.26a3.06 3.06 0 0 1-1.38-2.82v-3.47l.44.25v3.37a2.29 2.29 0 0 0 1 2.21c.55.32 1.1.26 1.1-.55v-3.78zM838.76 569.57l.44.26v7.71l-.44-.26v-.85c-.23.46-.65.61-1.27.25-1-.57-1.6-1.93-1.59-3.73s.62-2.46 1.62-1.89a3 3 0 0 1 1.26 1.71zm0 6.08v-2.12a2.33 2.33 0 0 0-1.13-1.87c-.81-.47-1.28 0-1.29 1.17v.75a2.91 2.91 0 0 0 1.27 2.64c.6.35 1.13.2 1.14-.57M790.56 554.61c1.27.73 1.86 2.35 1.85 4.83s-.62 3.42-1.89 2.69-1.86-2.35-1.84-4.84.62-3.41 1.88-2.68zm0 7c.94.54 1.37-.21 1.38-1.94v-1c0-1.73-.41-3-1.35-3.52s-1.37.22-1.38 1.94v1c0 1.73.41 3 1.35 3.52M797.15 558.1v.51l-1.68-1v1.82l1.68 1v.51l-1.68-1v4.35l1.49.86v.51l-3.37-1.94v-.51l1.43.82v-4.35l-1.5-.87v-.51l1.5.87v-1.47c0-.52.2-.76.64-.5zM801.86 560.81v.52l-1.67-1v1.82l1.67 1v.51l-1.68-1v4.36l1.5.86v.51l-3.37-1.95V566l1.43.83v-4.36l-1.51-.87v-.5l1.51.87v-1.47c0-.53.2-.76.64-.51zM806.41 568.6l-3-1.76v.27a3.06 3.06 0 0 0 1.34 2.69c.58.34 1 .22 1.25-.36l.34.49c-.25.63-.81.84-1.6.39a4.27 4.27 0 0 1-1.79-3.85c0-1.78.71-2.42 1.78-1.8a4.17 4.17 0 0 1 1.72 3.67zm-3-2.26v.06l2.55 1.47v-.08a2.93 2.93 0 0 0-1.24-2.62c-.78-.45-1.31 0-1.31 1.17M811.4 568.67v.58l-.83-.48c-.73-.42-1.22-.08-1.22.89v2.69l1.65.95v.51l-3.37-1.94v-.51l1.27.73v-4.35l-1.27-.74v-.51l1.72 1v1.22c.17-.56.52-.93 1.32-.47zM814.53 575.36l1.42.82v.5l-3.39-1.95.01-.51 1.51.88.03-4.36-1.52-.87v-.51l1.97 1.13-.03 4.87zM814.34 568.92a.72.72 0 0 1-.39-.64v-.14c0-.23.11-.35.39-.19a.72.72 0 0 1 .39.64v.14c0 .27-.11.36-.39.19zM819 572.9a3.13 3.13 0 0 1 1.38 2.84v3.46l-.45-.26v-3.36a2.3 2.3 0 0 0-1-2.21c-.55-.32-1.1-.26-1.1.55v3.78l-.45-.26v-5.37l.45.26v.83c.09-.39.44-.65 1.17-.26zM825.5 576.7l-.93-.53v.49a3.21 3.21 0 0 1 .41 1.56c0 1.08-.61 1.48-1.51 1a2 2 0 0 1-.4-.29c-.33-.08-.63 0-.64.34s.21.59.66.85l1 .55a2.45 2.45 0 0 1 1.4 2.18c0 1.08-.7 1.17-2 .43s-1.77-1.52-1.77-2.36c0-.6.27-.8.72-.72v-.08a1.35 1.35 0 0 1-.38-1c0-.52.32-.61.72-.52a3.13 3.13 0 0 1-.76-2.07c0-1.1.59-1.49 1.49-1a2.87 2.87 0 0 1 .84.75v-.22c0-.32.11-.48.38-.32l.79.45zm-1 1.42v-.35a2 2 0 0 0-1-1.78c-.67-.38-1-.1-1 .61v.34a2.08 2.08 0 0 0 1 1.78c.68.39 1 .09 1-.6m-1.77 2.3c-.36 0-.59.11-.59.59a1.94 1.94 0 0 0 1.05 1.6l.53.3c.8.47 1.31.39 1.31-.32a1.59 1.59 0 0 0-1-1.4l-1.32-.77"
						/>
						<path
							d="M370.32 626.6l-67.63-39.29a17.27 17.27 0 0 0-17.41 0l-76.16 44.54a5.64 5.64 0 0 0 0 9.73l3.69 2.15a5.28 5.28 0 0 1 .76-8.56l71.6-41.73a16.29 16.29 0 0 1 16.37 0l63.57 36.81a5.39 5.39 0 0 1 .08 9.26l5.12-3a5.76 5.76 0 0 0 .01-9.91z"
							fill="url(#d)"
						/>
						<path
							d="M365.12 639.56l-71.87 41.59a16.07 16.07 0 0 1-16.12 0l-63.53-36.83a5.28 5.28 0 0 1 0-9.12l71.6-41.73a16.29 16.29 0 0 1 16.37 0l63.57 36.81a5.39 5.39 0 0 1-.02 9.28z"
							fill="url(#O)"
						/>
						<path
							d="M323.42 643.87l-36 20.93a8 8 0 0 1-8.09 0l-31.87-18.53a2.66 2.66 0 0 1 0-4.59l35.91-21a8.17 8.17 0 0 1 8.21 0l31.88 18.53a2.71 2.71 0 0 1-.04 4.66z"
							fill="#051044"
							opacity="0.4"
						/>
						<path
							d="M323.42 638.29l-36 20.93a8 8 0 0 1-8.09 0l-31.87-18.53a2.66 2.66 0 0 1 0-4.59l35.91-21a8.15 8.15 0 0 1 8.21 0l31.88 18.52a2.72 2.72 0 0 1-.04 4.67z"
							fill="url(#P)"
						/>
						<path
							d="M323.42 635.45l-36 20.93a8.07 8.07 0 0 1-8.09 0l-31.87-18.53a2.66 2.66 0 0 1 0-4.59l35.91-21a8.15 8.15 0 0 1 8.21 0l31.88 18.53a2.71 2.71 0 0 1-.04 4.66z"
							fill="url(#e)"
						/>
						<path fill="none"
							stroke="#b9bfc8"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M304.41 648.41l14.82 8.63"
						/>
						<path d="M351.16 643.15a8.15 8.15 0 0 0-8.21 0l-35.91 21a2.65 2.65 0 0 0 0 4.58l3.86 2.27 44.1-25.61z"
							fill="url(#Q)"
						/>
						<path d="M351.16 641.18a8.17 8.17 0 0 0-8.21 0l-35.91 21a2.66 2.66 0 0 0 0 4.59l5.58 3.25 44.1-25.61z"
							fill="#242a2e"
						/>
						<path
							d="M840.53 637.6l-67.63-39.29a17.29 17.29 0 0 0-17.41 0l-76.16 44.55a5.64 5.64 0 0 0 0 9.73l3.69 2.14a5.28 5.28 0 0 1 .76-8.56l71.6-41.73a16.25 16.25 0 0 1 16.36 0l63.58 36.81a5.38 5.38 0 0 1 .08 9.25l5.12-3a5.75 5.75 0 0 0 .01-9.9z"
							fill="url(#R)"
						/>
						<path
							d="M835.33 650.56l-71.87 41.58a16.07 16.07 0 0 1-16.12 0l-63.53-36.83a5.27 5.27 0 0 1 0-9.11l71.6-41.74a16.25 16.25 0 0 1 16.36 0l63.58 36.81a5.39 5.39 0 0 1-.02 9.29z"
							fill="url(#S)"
						/>
						<path
							d="M806.19 624.37l-34.3-19.93a16.26 16.26 0 0 0-7.49-2.18L753 609a2.65 2.65 0 0 0 0 4.58l31.87 18.54a8 8 0 0 0 8.08 0z"
							fill="#051044"
							opacity="0.4"
						/>
						<path d="M771.75 604.44a16.25 16.25 0 0 0-16.36 0l-3.73 2.17a2.6 2.6 0 0 0 1.3 2.17l31.87 18.53a8 8 0 0 0 8.08 0l9.18-5.33z"
							fill="url(#T)"
						/>
						<path d="M799.66 620.58l-27.77-16.14a16.25 16.25 0 0 0-16.36 0l-2.68 1.42.11.09 31.87 18.53a8 8 0 0 0 8.08 0z"
							fill="#242a2e"
						/>
						<path d="M747.21 642.7L731 633.21a1.08 1.08 0 0 1 0-1.88l30.82-17.93"
							fill="none"
							stroke="#868686"
							strokeLinecap="round"
							strokeMiterlimit="10"
						/>
						<path
							d="M797.83 661.7l-36.05 20.93a8 8 0 0 1-8.08 0l-31.87-18.53a2.66 2.66 0 0 1 0-4.59l35.91-21a8.15 8.15 0 0 1 8.21 0L797.83 657a2.71 2.71 0 0 1 0 4.7z"
							fill="#051044"
							opacity="0.4"
						/>
						<path
							d="M797.83 654.37l-36.05 20.92a8 8 0 0 1-8.08 0l-31.87-18.53a2.66 2.66 0 0 1 0-4.59l35.91-21a8.15 8.15 0 0 1 8.21 0l31.89 18.52a2.72 2.72 0 0 1-.01 4.68z"
							fill="url(#U)"
						/>
						<path
							d="M797.83 651.53l-36.05 20.93a8 8 0 0 1-8.08 0l-31.87-18.53a2.65 2.65 0 0 1 0-4.58l35.91-21a8.17 8.17 0 0 1 8.21 0l31.89 18.53a2.71 2.71 0 0 1-.01 4.65z"
							fill="url(#V)"
						/>
						<path
							d="M735.21 654.3l-5.6-3.24 2-1.16a3 3 0 0 1 3.1 0c1 .56 1 1.22 0 1.79l-1.52.88 2.45 1.42zm-2.39-1.94l1.52-.88c.66-.38.61-.82 0-1.14l-.38-.23a2 2 0 0 0-2 0l-1.51.87zM737.81 650.42c-1.38-.8-1.47-1.67-.37-2.31a3.94 3.94 0 0 1 3.84.16l.2.12-3.11 1.8.2.11a2.87 2.87 0 0 0 2.85.06c.61-.35.76-.77.46-1.22l.56-.07c.35.49.19 1-.62 1.52a4 4 0 0 1-4.01-.17zm.19-.42l2.62-1.52h-.06a2.77 2.77 0 0 0-2.75-.11c-.81.43-.72 1.08.19 1.63zM742.62 647.63c-1.37-.79-1.46-1.67-.36-2.3a3.94 3.94 0 0 1 3.84.16l.2.12-3.11 1.79.2.12a2.9 2.9 0 0 0 2.85.06c.6-.35.76-.78.46-1.22l.56-.08c.35.5.19 1.06-.62 1.53a4 4 0 0 1-4.02-.18zm.17-.45h.05l2.62-1.51h-.06a2.79 2.79 0 0 0-2.75-.1c-.8.43-.74 1.1.14 1.61zM749.12 645.81l1.31-.75-3.36-1.94-1.31.75-.39-.22 1.76-1 1 .55c-.34-.39-.42-.85.4-1.33l.72-.41.45.26-.85.49c-.75.43-.77 1 0 1.43l2.07 1.2 1.69-1 .39.23-3.44 2zM260.81 638.15l-5.61-3.23 2-1.16a3 3 0 0 1 3.09 0c1 .56 1.05 1.21.06 1.78l-1.53.89 2.46 1.42zm-2.39-1.93l1.51-.88c.67-.39.61-.83.06-1.15l-.38-.22a2 2 0 0 0-2 0l-1.52.88zM263.4 634.27c-1.37-.79-1.46-1.67-.36-2.3a3.89 3.89 0 0 1 3.83.16l.2.11L264 634l.21.12a2.9 2.9 0 0 0 2.85.06c.6-.35.76-.78.46-1.22l.56-.08c.35.49.19 1.06-.62 1.53a4 4 0 0 1-4.06-.14zm.17-.46h.05l2.62-1.51h-.07a2.77 2.77 0 0 0-2.74-.1c-.81.45-.74 1.1.14 1.61zM268.22 631.49c-1.37-.79-1.46-1.67-.36-2.3a3.87 3.87 0 0 1 3.83.16l.2.11-3.11 1.8.2.11a2.92 2.92 0 0 0 2.86.07c.6-.35.76-.78.45-1.23l.57-.07c.35.49.19 1.06-.62 1.53a4 4 0 0 1-4.02-.18zm.17-.46h.05l2.62-1.51h-.07a2.75 2.75 0 0 0-2.74-.1c-.81.45-.74 1.1.14 1.58zM274.72 629.67l1.3-.75-3.36-1.92-1.3.75-.39-.23 1.76-1 .95.54c-.34-.39-.42-.86.4-1.33l.71-.41.45.25-.85.5c-.74.43-.76 1 0 1.43l2.07 1.19 1.69-1 .39.23-3.45 2z"
							fill="#fff"
						/>
					</g>
					<g
						data-name="Hyperledger Fabric"
						className={`
		diagram--infraLid-container
		${this.props.activeItem === 'infraLid' || this.props.activeTextItem === 'infraLid' ? 'diagram--active-hover-item' : ''}
		${this.props.activeItem && this.props.activeItem !== 'infraLid' ? 'diagram--inactive-hover-item' : ''}
		${this.props.activeTextItem && this.props.activeTextItem !== 'infraLid' ? 'diagram--inactive-hover-item' : ''}
		`}
						onMouseOver={() => this.hoverItem('infraLid')}
						onMouseOut={() => this.mouseOutItem('infraLid')}
					>
						<path
							fill="#fff"
							d="M437.51 172.4l-.06 10.92-.7-.41.02-5.13-4.5-2.6-.03 5.13-.7-.41.05-10.91.71.4-.03 4.96 4.51 2.6.03-4.95.7.4zM444 179.09l-2.85 8.65c-.19.57-.39.66-1 .3l-.67-.39v-.78l1 .58.59-1.79-2.2-9.53.71.41 1.82 8.12 1.87-6zM447.93 181.15c1.54.89 2.48 3 2.46 5.62s-1 3.65-2.5 2.76a4.21 4.21 0 0 1-1.83-2.53v4.42l-.67-.39.05-11.14.68.38v1.29c.26-.73.88-.94 1.81-.41zm-.19 7.5c1.2.69 1.92 0 1.93-1.73v-1.12a4.42 4.42 0 0 0-1.9-3.94c-.93-.54-1.73-.26-1.74.79v3.17a3.49 3.49 0 0 0 1.71 2.83M456.8 190.65l-4.46-2.58v.39a4.52 4.52 0 0 0 2 4c.86.5 1.5.3 1.83-.55l.5.72c-.39 1-1.23 1.26-2.37.6-1.61-.93-2.63-3.09-2.62-5.72s1.06-3.6 2.66-2.67 2.53 3.06 2.52 5.41zm-4.46-3.35v.08l3.74 2.16v-.13a4.4 4.4 0 0 0-1.8-3.84c-1.16-.67-1.93 0-1.94 1.73M461.45 189.14v.86l-.53-.31c-1-.58-1.72-.37-1.73.66v5.48l-.67-.39v-8l.67.39v1.44h.05c.24-.62.77-1 1.81-.4zM463.41 186.7l-.05 10.79.93.54v.78l-.85-.49a1.59 1.59 0 0 1-.74-1.4l.05-10.61zM470.5 198.55L466 196v.39a4.54 4.54 0 0 0 2 4c.86.5 1.49.3 1.83-.56l.49.73c-.38.95-1.22 1.25-2.36.59-1.62-.93-2.64-3.09-2.62-5.71s1-3.6 2.65-2.68 2.53 3.07 2.52 5.41zm-4.5-3.34v.08l3.73 2.15v-.12a4.43 4.43 0 0 0-1.79-3.85c-1.17-.67-1.93.05-1.94 1.74M476.14 194.05l.67.38-.06 11.57-.67-.39v-1.28c-.32.7-.93.94-1.84.41-1.55-.9-2.48-3-2.47-5.63s1-3.65 2.51-2.76a4.15 4.15 0 0 1 1.83 2.53zm-.05 9.13V200a3.53 3.53 0 0 0-1.72-2.77c-1.2-.7-1.92 0-1.93 1.72v1.13a4.43 4.43 0 0 0 1.91 3.93c.93.54 1.72.29 1.73-.83M481.81 207.85a3.58 3.58 0 0 1 2.06 3.21c0 1.63-1 1.79-2.91.7s-2.6-2.24-2.59-3.5c0-.91.4-1.21 1-1.09V207a2 2 0 0 1-.56-1.42c0-.78.45-.91 1-.78v-.06a4.86 4.86 0 0 1-1.11-3.09c0-1.61.88-2.23 2.21-1.46a4.09 4.09 0 0 1 1.21 1.1v-.39c0-.49.17-.72.56-.5l1 .6v.78l-1.22-.71v.77a4.89 4.89 0 0 1 .63 2.35c0 1.63-.89 2.24-2.22 1.47a4.31 4.31 0 0 1-.62-.46c-.52-.11-.9 0-.9.52s.3.9 1 1.28zm-2.31-5.5A3 3 0 0 0 481 205c.92.53 1.48.22 1.49-.91v-.5A3 3 0 0 0 481 201c-.94-.54-1.49-.2-1.5.89v.5m1.82 8.88c1.16.67 1.9.6 1.9-.48a2.28 2.28 0 0 0-1.41-2.07l-2-1.13c-.52-.07-.84.2-.84.89a2.82 2.82 0 0 0 1.56 2.36l.75.43M489.79 209.69l-4.46-2.57v.39a4.56 4.56 0 0 0 2 4c.86.5 1.5.3 1.83-.56l.49.73c-.38 1-1.22 1.25-2.36.59-1.62-.93-2.63-3.09-2.62-5.71s1.05-3.6 2.65-2.68 2.54 3.07 2.52 5.41zm-4.46-3.34v.08l3.74 2.15v-.12a4.43 4.43 0 0 0-1.8-3.85c-1.17-.67-1.93 0-1.94 1.74M494.44 208.19v.87l-.53-.3c-1-.58-1.72-.37-1.73.66v5.47l-.67-.38v-8l.67.39v1.44c.24-.61.78-1 1.81-.4zM503.28 210.37l-.01.83-3.99-2.3-.02 4.12 3.72 2.15v.83l-3.73-2.15-.02 5.13-.71-.41.06-10.91 4.7 2.71zM508.52 223.56l.81.47v.78l-.68-.39a1.61 1.61 0 0 1-.76-1.43v-.28h-.05c-.28.73-.89.94-1.84.4a4 4 0 0 1-2-3.51c0-1.43.72-1.91 2.47-.9l1.39.8v-.94a3.07 3.07 0 0 0-1.54-2.88c-.8-.46-1.32-.29-1.65.35l-.42-.71c.33-.74 1-1 2.1-.41a4.39 4.39 0 0 1 2.18 3.94zm-.67-1.93v-1.49l-1.42-.82c-1.2-.69-1.72-.44-1.72.45v.38a2.55 2.55 0 0 0 1.37 2.21c1 .57 1.76.35 1.76-.73M513.28 218.88c1.55.89 2.48 3 2.47 5.63s-1 3.64-2.51 2.75a4.17 4.17 0 0 1-1.83-2.53V226l-.67-.39.06-11.57.67.39v4.85c.27-.71.89-.93 1.81-.4zm-.19 7.49c1.2.7 1.93 0 1.94-1.72v-1.12a4.4 4.4 0 0 0-1.91-3.94c-.93-.54-1.72-.26-1.72.79v3.17a3.46 3.46 0 0 0 1.71 2.82M520.41 223.18v.88l-.53-.31c-1-.58-1.72-.36-1.72.67v5.47l-.67-.39v-8l.67.38v1.44h.05c.24-.61.78-1 1.81-.4zM522 220.66a.88.88 0 0 1 .45.82v.16c0 .33-.14.48-.46.3a.9.9 0 0 1-.45-.83V221c.04-.37.18-.53.46-.34zM521.65 231.93l.04-8.01.67.39-.04 8.01-.67-.39zM526.67 226.61a4.87 4.87 0 0 1 2.14 3h-.58a3.48 3.48 0 0 0-1.57-2.26c-1.22-.7-1.88.06-1.89 1.75v1.12a4.34 4.34 0 0 0 1.87 3.92c.82.48 1.39.31 1.73-.39l.5.72c-.39.84-1.12 1.11-2.24.47-1.64-1-2.59-3.05-2.57-5.69s.94-3.59 2.61-2.64z"
						/>
						<path
							d="M634.51 368.09l-.3-.21-.42-.28c-.13-.08-.24-.18-.38-.25L421.05 245.57a26.94 26.94 0 0 0-27 .14L191 363.48a6.29 6.29 0 0 0-2.43 2.57 12.74 12.74 0 0 0 3.49 19l125.71 73 .14 13.7 79.9 46.41a20.06 20.06 0 0 0 20.14 0l212.8-123.33-.04-11.83c9.63-5.59 12.51-8.59 3.8-14.91z"
							fill="#121719"
							opacity="0.3"
						/>
						<path
							d="M633 318.8a8.74 8.74 0 0 1 .06 15.12L418.64 459.17a22.46 22.46 0 0 1-22.62 0L180.7 333.57a6.42 6.42 0 0 1-2.42-8.56 12.76 12.76 0 0 0 3.41 19.15l216.15 125.55a20.06 20.06 0 0 0 20.14 0L633.15 345a15.22 15.22 0 0 0-.07-26.36"
							fill="url(#g)"
						/>
						<path
							d="M633.47 334L418.82 459.17a22.47 22.47 0 0 1-22.63 0L180.65 333.61a6.4 6.4 0 0 1 0-11.05L394 197.21a26.94 26.94 0 0 1 27-.14l212.41 121.78a8.73 8.73 0 0 1 .06 15.15z"
							fill="url(#h)"
						/>
						<path
							d="M467.42 332.91c4.19 5.48 6.51 11.52 6.51 17.87 0 24.91-35.77 45.1-79.9 45.1s-79.9-20.19-79.9-45.1 35.77-45.11 79.9-45.11a141.17 141.17 0 0 1 14.1.7M426.65 309.59a92.74 92.74 0 0 1 27.8 11.67"
							fill="none"
							stroke="#d4d9e1"
							strokeMiterlimit="10"
							strokeWidth="0.7"
						/>
						<ellipse cx="393.02"
							cy="346.09"
							rx="6.94"
							ry="3.92"
							fill="none"
							stroke="#231f20"
							strokeMiterlimit="10"
							strokeWidth="0.7"
							opacity="0.18"
						/>
						<ellipse cx="393.02"
							cy="344.09"
							rx="6.94"
							ry="3.92"
							fill="none"
							stroke="#d4d9e1"
							strokeMiterlimit="10"
							strokeWidth="0.7"
						/>
						<path
							fill="none"
							stroke="#e5e5e4"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeWidth="0.5"
							strokeDasharray="0.6 2 0 0"
							d="M318.79 301.35l69.02 40.15"
						/>
						<path
							d="M445.76 336.85l9.15-14.3a2.16 2.16 0 0 1 1.94-1l17.57.82a.55.55 0 0 1 .44.85l-9.3 14.46a2.75 2.75 0 0 1-2.45 1.27l-16.66-.77a.87.87 0 0 1-.69-1.33z"
							fill="none"
							stroke="#231f20"
							strokeMiterlimit="10"
							strokeWidth="0.7"
							opacity="0.18"
						/>
						<path
							d="M445.76 334.85l9.15-14.3a2.16 2.16 0 0 1 1.94-1l17.57.82a.55.55 0 0 1 .44.85l-9.3 14.46a2.75 2.75 0 0 1-2.45 1.27l-16.66-.77a.87.87 0 0 1-.69-1.33z"
							fill="none"
							stroke="#d4d9e1"
							strokeMiterlimit="10"
							strokeWidth="0.7"
						/>
						<path
							fill="none"
							stroke="#e5e5e4"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeWidth="0.5"
							strokeDasharray="0.6 2 0 0"
							d="M475.46 285.57L463 319.83"
						/>
						<path
							d="M492 281.56l-14.18 8.18a1 1 0 0 1-1.36-.37l-6.8-12a.56.56 0 0 1 .61-.83l21.65 4.53a.26.26 0 0 1 .08.49z"
							fill="none"
							stroke="#231f20"
							strokeMiterlimit="10"
							strokeWidth="0.7"
							opacity="0.18"
						/>
						<path
							d="M492 279.56l-14.18 8.18a1 1 0 0 1-1.36-.37l-6.8-12a.56.56 0 0 1 .61-.83l21.65 4.53a.26.26 0 0 1 .08.49z"
							fill="none"
							stroke="#d4d9e1"
							strokeMiterlimit="10"
							strokeWidth="0.7"
						/>
						<ellipse cx="309.39"
							cy="297.08"
							rx="14.56"
							ry="8.22"
							fill="none"
							stroke="#231f20"
							strokeMiterlimit="10"
							strokeWidth="0.7"
							opacity="0.18"
						/>
						<ellipse cx="309.39"
							cy="295.08"
							rx="14.56"
							ry="8.22"
							fill="none"
							stroke="#d4d9e1"
							strokeMiterlimit="10"
							strokeWidth="0.7"
						/>
						<path
							d="M402.14 317.73l9.15-14.3a2.16 2.16 0 0 1 1.94-1l17.57.82a.55.55 0 0 1 .44.85l-9.3 14.46a2.74 2.74 0 0 1-2.46 1.27l-16.65-.77a.86.86 0 0 1-.69-1.33z"
							fill="none"
							stroke="#231f20"
							strokeMiterlimit="10"
							strokeWidth="0.7"
							opacity="0.18"
						/>
						<path
							d="M402.14 315.73l9.15-14.3a2.16 2.16 0 0 1 1.94-1l17.57.82a.55.55 0 0 1 .44.85l-9.3 14.46a2.74 2.74 0 0 1-2.46 1.27l-16.65-.77a.86.86 0 0 1-.69-1.33z"
							fill="none"
							stroke="#d4d9e1"
							strokeMiterlimit="10"
							strokeWidth="0.7"
						/>
						<path
							fill="none"
							stroke="#e5e5e4"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeWidth="0.5"
							strokeDasharray="0.6 2 0 0"
							d="M430.92 265.26l-12.86 35.39"
						/>
						<path
							d="M447.13 260.64L433 268.82a1 1 0 0 1-1.35-.37l-6.8-12a.57.57 0 0 1 .61-.84l21.65 4.54a.25.25 0 0 1 .02.49z"
							fill="none"
							stroke="#231f20"
							strokeMiterlimit="10"
							strokeWidth="0.7"
							opacity="0.18"
						/>
						<path
							d="M447.13 258.64L433 266.82a1 1 0 0 1-1.35-.37l-6.8-12a.57.57 0 0 1 .61-.84l21.65 4.54a.25.25 0 0 1 .02.49z"
							fill="none"
							stroke="#d4d9e1"
							strokeMiterlimit="10"
							strokeWidth="0.7"
						/>
						<path
							d="M447.89 395.54c-1.83-1.06-2.05-2.09-.71-2.86a4.12 4.12 0 0 1 3-.37l-.15.35a3.26 3.26 0 0 0-2.39.26c-1 .59-.86 1.38.49 2.15l.61.36a3.64 3.64 0 0 0 3.69.25c.72-.41.83-.93.44-1.43l.6-.09c.42.62.26 1.26-.62 1.77-1.38.77-3.12.67-4.96-.39zM449.87 390.86l.44-.26 2.41 1.39c-.24-.35-.19-.73.45-1.1a2.8 2.8 0 0 1 2.87.1l2.56 1.48-.44.25-2.49-1.43a2.11 2.11 0 0 0-2.22-.11c-.56.33-.8.8-.2 1.14l2.8 1.62-.44.26zM462.77 390.07a1 1 0 0 1-1 0l-.14-.08c.27.36.14.76-.48 1.11a2.45 2.45 0 0 1-2.49.09c-.71-.41-.69-.94.46-1.61l.92-.53-.47-.27a1.89 1.89 0 0 0-2 0c-.53.31-.64.64-.44 1h-.52c-.24-.39-.14-.85.59-1.26a2.7 2.7 0 0 1 2.78-.07l2.36 1.36.54-.31.39.23zm-1.69-.37l-.74-.42-.94.54c-.79.46-.86.81-.42 1.07l.19.1a1.64 1.64 0 0 0 1.62-.11c.65-.38.83-.88.29-1.18zM464.13 389.28l-4-2.3.45-.26.63.36c-.23-.34-.19-.73.45-1.1a2.82 2.82 0 0 1 2.87.1l2.57 1.48-.45.26-2.49-1.44a2.11 2.11 0 0 0-2.22-.1c-.56.32-.79.79-.2 1.13l2.81 1.62zM468.52 386.75l-4-2.31.44-.25.64.36c-.23-.34-.19-.73.45-1.1a2.82 2.82 0 0 1 2.87.1l2.57 1.48-.45.26-2.49-1.44a2.08 2.08 0 0 0-2.22-.1c-.56.32-.79.79-.2 1.13l2.81 1.62zM470.59 383.25c-1.31-.76-1.41-1.6-.35-2.22a3.78 3.78 0 0 1 3.65.17l.21.12-3 1.71.19.11a2.75 2.75 0 0 0 2.72.06c.57-.32.71-.73.41-1.16l.58-.04c.33.48.17 1-.59 1.46a3.88 3.88 0 0 1-3.82-.21zm.18-.45l2.48-1.43h-.07a2.7 2.7 0 0 0-2.59-.11c-.74.44-.67 1.06.18 1.54zM477.63 381.49a1 1 0 0 1-1 0l-5.29-3.05.45-.26 5.38 3.11.61-.36.39.23zM486.77 332.27l-5.45-3.15 2.14-1.23a2.94 2.94 0 0 1 3 0c.93.54 1 1.18.07 1.72l-1.67 1 2.39 1.38zm-2.34-1.9l1.67-1c.62-.36.57-.78 0-1.09l-.38-.21a1.88 1.88 0 0 0-1.88 0l-1.67 1zM489 328.67c-1.3-.75-1.41-1.59-.35-2.21a3.78 3.78 0 0 1 3.65.16l.21.13-2.95 1.7.19.12a2.75 2.75 0 0 0 2.72.06c.57-.33.71-.73.41-1.16l.55-.06c.33.48.17 1-.59 1.46a3.85 3.85 0 0 1-3.84-.2zm.18-.44l2.48-1.43h-.07a2.69 2.69 0 0 0-2.59-.11c-.75.43-.68 1.06.17 1.54zM493.23 326.23c-1.31-.76-1.42-1.6-.36-2.21a3.78 3.78 0 0 1 3.65.16l.21.12-3 1.71.2.11a2.78 2.78 0 0 0 2.72.07c.57-.33.71-.73.4-1.16l.55-.07c.33.49.17 1-.59 1.47a3.86 3.86 0 0 1-3.78-.2zm.17-.44l2.47-1.43h-.06a2.66 2.66 0 0 0-2.6-.11c-.73.43-.65 1.05.19 1.54zM499.78 324.75l-4-2.3.45-.26.71.42c-.22-.31-.21-.71.47-1.1l.27-.16.43.26-.35.2c-.66.38-.82.83-.31 1.13l2.73 1.58zM482.08 302.06c-1.83-1.06-2.05-2.08-.71-2.86a4.16 4.16 0 0 1 3-.37l-.15.35a3.26 3.26 0 0 0-2.39.27c-1 .58-.86 1.37.49 2.15l.61.35a3.67 3.67 0 0 0 3.69.26c.72-.42.82-.94.43-1.43l.61-.09c.42.61.26 1.25-.62 1.76-1.38.78-3.12.67-4.96-.39zM487.51 299.74c-1.31-.75-1.41-1.59-.35-2.21a3.76 3.76 0 0 1 3.65.17l.21.12-3 1.7.2.12a2.75 2.75 0 0 0 2.72.06c.57-.33.71-.73.41-1.16l.54-.06c.34.48.18 1-.58 1.46a3.85 3.85 0 0 1-3.8-.2zm.17-.44l2.47-1.42h-.06a2.66 2.66 0 0 0-2.6-.11c-.73.42-.65 1.05.19 1.53zM494.06 298.27l-4-2.31.44-.25.72.41c-.22-.3-.21-.7.48-1.1l.26-.15.44.25-.35.2c-.67.38-.83.84-.31 1.14l2.76 1.54zM497.59 296.23a1 1 0 0 1-1 0l-3.11-1.8-.7.4-.39-.22.46-.26c.21-.13.2-.21 0-.34l-.81-.47.41-.23 1.11.64.91-.52.39.22-.91.53 3.21 1.85.85-.49.38.23zM494.07 292.07H494c-.17-.1-.19-.22 0-.34a.55.55 0 0 1 .58 0h.08c.17.1.19.22 0 .34a.57.57 0 0 1-.59 0zm1.45.74l.45-.25 4 2.3-.44.26zM498 291.84l-.68.39-.39-.22.69-.4-1.12-.64c-.41-.24-.46-.5 0-.75l.7-.4.39.22-.88.51 1.39.8 2.17-1.25 4 2.31-.45.25-3.6-2.08-1.72 1 3.6 2.08-.44.26zm.34-2.22l-.08-.05c-.16-.09-.19-.21 0-.34a.57.57 0 0 1 .58 0h.08c.16.09.18.21 0 .33a.55.55 0 0 1-.59.06zM503.35 290.6c-1.32-.76-1.46-1.57-.37-2.2a3.12 3.12 0 0 1 2.3-.31l-.18.32a2.32 2.32 0 0 0-1.72.22c-.81.47-.68 1.05.16 1.53l.57.33a2.65 2.65 0 0 0 2.65.09c.55-.31.67-.67.46-1.06l.54-.07c.27.46.14.94-.6 1.36a3.78 3.78 0 0 1-3.81-.21zM512.27 287.75a1 1 0 0 1-1 0l-.14-.08c.26.36.14.76-.49 1.12a2.47 2.47 0 0 1-2.49.08c-.71-.41-.69-.94.47-1.61l.92-.53-.47-.27a1.91 1.91 0 0 0-2 0c-.53.31-.64.64-.45 1h-.51c-.24-.39-.14-.84.58-1.26a2.72 2.72 0 0 1 2.79-.07l2.36 1.36.54-.31.39.23zm-1.69-.36l-.74-.43-.93.54c-.8.46-.87.81-.42 1.07l.18.11a1.64 1.64 0 0 0 1.62-.12c.65-.37.83-.86.29-1.17zM514.34 286.56a1 1 0 0 1-1 0l-3.11-1.8-.7.4-.39-.22.45-.26c.22-.13.21-.21 0-.34l-.81-.47.41-.23 1.11.64.9-.52.4.22-.91.52 3.21 1.86.84-.49.39.23zM513.92 284.5c-1.31-.76-1.41-1.6-.35-2.21a3.76 3.76 0 0 1 3.65.16l.21.12-3 1.71.2.11a2.78 2.78 0 0 0 2.72.07c.57-.33.71-.74.4-1.17l.55-.06c.33.48.17 1-.59 1.46a3.86 3.86 0 0 1-3.79-.19zm.17-.44l2.47-1.43h-.06a2.69 2.69 0 0 0-2.6-.12c-.73.49-.65 1.06.19 1.55zM498.24 306.66L496 306l-2.31 1.34 1.1 1.32-.47.27-3.52-4.26.6-.34 7.38 2zm-6.74-1.88l1.88 2.27 2.07-1.2zM501.52 304c.22.3.25.69-.44 1.09a2.84 2.84 0 0 1-2.88-.09l-2.56-1.48.44-.26 2.48 1.43a2.12 2.12 0 0 0 2.24.1c.55-.32.79-.78.19-1.13l-2.8-1.62.44-.25 4 2.3-.44.26zM504.73 302.91a1 1 0 0 1-1 0l-3.12-1.8-.69.4-.39-.22.47-.29c.22-.13.21-.21 0-.34l-.81-.47.41-.23 1.11.64.9-.52.39.22-.9.53 3.21 1.85.84-.49.39.23zM500.88 298.47l.45-.26 2.41 1.39c-.23-.35-.19-.73.45-1.1a2.82 2.82 0 0 1 2.87.1l2.57 1.48-.45.25-2.48-1.43a2.1 2.1 0 0 0-2.23-.1c-.56.32-.79.79-.2 1.13l2.81 1.62-.45.26zM508.73 298.3c-1.31-.76-1.41-1.61-.36-2.21a3.86 3.86 0 0 1 3.83.2c1.31.75 1.41 1.6.35 2.21a3.87 3.87 0 0 1-3.82-.2zm3.25-1.59l-.5-.29a2.67 2.67 0 0 0-2.71-.1c-.77.44-.75 1 .18 1.56l.5.29a2.72 2.72 0 0 0 2.71.1c.77-.45.75-1.02-.16-1.56zM515.33 296.79l-4-2.31.44-.25.72.41c-.22-.3-.21-.7.47-1.1l.27-.15.44.25-.35.2c-.67.38-.83.84-.32 1.14l2.73 1.57zM512.67 292.14l-.08-.05c-.16-.09-.19-.21 0-.33a.59.59 0 0 1 .59 0l.08.05c.16.09.18.21 0 .34a.57.57 0 0 1-.59-.01zm1.45.74l.44-.26 4 2.31-.44.25zM520.69 293.69a1 1 0 0 1-1 0l-3.11-1.79-.7.4-.39-.23.46-.26c.21-.13.2-.21 0-.34l-.81-.47.41-.23 1.11.64.91-.52.38.23-.9.52 3.21 1.85.85-.48.38.22zM521 288.88l.45-.26 3.27 4c.21.27.18.4-.23.63l-.45.27-.39-.23.67-.39-.67-.83-5.59-1.51.47-.27 4.74 1.32zM333.2 298.17c-1.84-1.06-2-2.11-.59-2.91a5 5 0 0 1 5 .34c1.84 1.06 2 2.11.59 2.91a5 5 0 0 1-5-.34zm4.29-2.09l-.68-.39a3.81 3.81 0 0 0-3.78-.19c-1 .6-1 1.44.32 2.18l.69.4a3.79 3.79 0 0 0 3.78.18c1.04-.6.97-1.43-.33-2.18zM341.58 296.47l-4-2.31.44-.25.72.41c-.21-.3-.21-.7.48-1.1l.27-.15.43.25-.35.2c-.66.38-.83.84-.31 1.14l2.73 1.57zM346.28 293c.24.38.13.78-.48 1.13a3.76 3.76 0 0 1-3.74-.26c-1.31-.76-1.46-1.56-.44-2.15a2.68 2.68 0 0 1 2-.28l-2.41-1.39.44-.26 5.77 3.33-.44.26zm-.58-.33l-1.59-.92a2.22 2.22 0 0 0-2 .15c-.8.46-.72 1.05.14 1.55l.56.32a2.68 2.68 0 0 0 2.68.08c.6-.33.77-.85.21-1.16zM346.49 291.33c-1.31-.76-1.41-1.6-.35-2.21a3.78 3.78 0 0 1 3.65.16l.21.12-2.95 1.71.19.11a2.78 2.78 0 0 0 2.72.07c.57-.33.71-.74.41-1.16l.54-.07c.34.49.18 1-.58 1.47a3.88 3.88 0 0 1-3.84-.2zm.17-.44l2.48-1.43h-.07a2.67 2.67 0 0 0-2.59-.12c-.74.44-.66 1.06.18 1.55zM353 289.85l-4-2.3.44-.26.72.42c-.22-.31-.21-.71.48-1.11l.26-.15.44.25-.35.21c-.67.38-.83.83-.31 1.13l2.72 1.58zM353.48 287.29c-1.31-.75-1.41-1.6-.35-2.21a3.78 3.78 0 0 1 3.65.16l.21.13-2.95 1.7.19.11a2.75 2.75 0 0 0 2.72.07c.57-.33.71-.73.41-1.16l.54-.06c.34.48.18 1-.58 1.46a3.85 3.85 0 0 1-3.84-.2zm.18-.44l2.48-1.42h-.07a2.64 2.64 0 0 0-2.59-.11c-.74.42-.67 1.05.18 1.53zM360 285.82l-4-2.31.44-.25.72.41c-.21-.3-.21-.7.48-1.1l.26-.15.44.25-.35.2c-.66.38-.83.84-.31 1.13l2.73 1.58z"
							fill="#f1f5f8"
						/>
					</g>
					<g
						data-name="Console"
						className={`
		diagram--app-console-container
		${this.props.activeItem === 'app-console' || this.props.activeTextItem === 'app-console' ? 'diagram--active-hover-item' : ''}
		${this.props.activeItem && this.props.activeItem !== 'app-console' ? 'diagram--inactive-hover-item' : ''}
		${this.props.activeTextItem && this.props.activeTextItem !== 'app-console' ? 'diagram--inactive-hover-item' : ''}
	`}
						onMouseOver={() => this.hoverItem('app-console')}
						onMouseOut={() => this.mouseOutItem('app-console')}
					>
						<path
							d="M867.62 330.39l25-14.25a4.57 4.57 0 0 0 2.29-3.87l.16-125.19a3.41 3.41 0 0 1 5.12-3l76.11 44"
							fill="none"
							stroke="#bbbbba"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeDasharray="0.3 4"
						/>
						<path
							fill="#fff"
							d="M982.84 125.69l-.01.79-1.2-.7-.05 9.35 1.2.7v.78l-3.11-1.79.01-.79 1.2.7.05-9.35-1.2-.7v-.78l3.11 1.79zM988.73 134.3a4.47 4.47 0 0 1 1.56 3.56c0 1.79-.84 2.6-2.1 1.87l-3.51-2 .06-10.92 3.21 1.86a4.39 4.39 0 0 1 2 3.94c0 1.52-.66 1.82-1.27 1.65zm.8 3.43v-.58a3.17 3.17 0 0 0-1.51-2.79l-2.61-1.51v4.44l2.59 1.51c1 .57 1.52.08 1.52-1.07m-4.09-9.7v4l2.44 1.41c.89.52 1.38.08 1.38-.91v-.59a2.86 2.86 0 0 0-1.37-2.5l-2.44-1.44M999.38 135.24l-.06 10.92-.68-.39.05-9.72-.05-.02-2.87 5.04-2.8-8.32-.05-.02-.05 9.71-.68-.4.06-10.91.96.56 2.57 7.64.04.02 2.63-4.64.93.53zM1008.47 145.7a4.46 4.46 0 0 1 1.56 3.55c0 1.8-.84 2.61-2.1 1.88l-3.5-2 .05-10.92 3.22 1.86a4.4 4.4 0 0 1 2 3.94c0 1.51-.66 1.81-1.27 1.65zm.81 3.43v-.58a3.17 3.17 0 0 0-1.51-2.8l-2.61-1.51v4.45l2.61 1.5c1 .57 1.52.08 1.53-1.06m-4.09-9.7v4l2.44 1.41c.89.51 1.38.07 1.39-.91v-.6a2.87 2.87 0 0 0-1.37-2.5l-2.43-1.4M1012.59 142.22l-.05 10.79.93.53v.78l-.86-.49a1.54 1.54 0 0 1-.73-1.4v-10.6zM1017.15 148.24c1.59.91 2.62 3.07 2.6 5.7s-1 3.59-2.64 2.68-2.62-3.08-2.61-5.71 1.06-3.6 2.65-2.67zm0 7.58c1.17.67 1.91.08 1.92-1.79v-1a4.44 4.44 0 0 0-1.89-4c-1.17-.67-1.92-.08-1.93 1.79v1a4.42 4.42 0 0 0 1.89 4M1023.59 152a4.84 4.84 0 0 1 2.14 3h-.57a3.51 3.51 0 0 0-1.57-2.26c-1.22-.7-1.89.06-1.9 1.75v1.12a4.37 4.37 0 0 0 1.86 3.92c.83.48 1.4.3 1.75-.39l.49.72c-.4.84-1.13 1.11-2.24.47-1.65-1-2.59-3.05-2.58-5.7s1.03-3.63 2.62-2.63zM1028 151.11l-.04 7.65.03.02.95-.79 2.02-1.59.83.47-2.39 1.89 2.6 6.27-.82-.48-2.27-5.51-.96.73-.01 2.91-.67-.39.06-11.57.67.39zM1035.3 158.71a4.86 4.86 0 0 1 2.14 3l-.57.05a3.53 3.53 0 0 0-1.58-2.26c-1.22-.71-1.88.05-1.89 1.74v1.13a4.38 4.38 0 0 0 1.87 3.92c.82.47 1.39.3 1.74-.39l.49.72c-.39.84-1.12 1.11-2.24.46-1.64-1-2.59-3-2.57-5.69s.96-3.63 2.61-2.68zM1039.71 157.87v4.83c.27-.67.81-1 1.78-.43a4.62 4.62 0 0 1 2 4.23v5.14l-.67-.38v-5a3.47 3.47 0 0 0-1.53-3.3c-.85-.49-1.64-.37-1.65.82v5.63l-.67-.39.06-11.57zM1049.61 174.41l.82.47v.79l-.69-.4a1.61 1.61 0 0 1-.76-1.43v-.28h-.06c-.27.73-.89.94-1.83.4a4 4 0 0 1-2-3.51c0-1.42.72-1.91 2.46-.9l1.39.8v-.94a3.09 3.09 0 0 0-1.53-2.88c-.8-.46-1.32-.29-1.66.35l-.42-.71c.34-.73 1-1 2.1-.4a4.36 4.36 0 0 1 2.18 3.93zm-.66-1.93V171l-1.41-.81c-1.2-.7-1.72-.45-1.73.44v.37a2.57 2.57 0 0 0 1.37 2.22c1 .56 1.75.34 1.76-.74M1052.19 165.18a.94.94 0 0 1 .45.83v.16c0 .33-.14.48-.46.3a.93.93 0 0 1-.46-.83v-.16c.01-.33.15-.48.47-.3zM1051.8 176.46l.04-8.01.67.39-.04 8-.67-.38zM1057.18 171.35a4.6 4.6 0 0 1 2 4.22v5.15l-.67-.39v-5A3.48 3.48 0 0 0 1057 172c-.85-.49-1.64-.36-1.64.82v5.63l-.67-.38v-8l.67.39v1.26c.31-.62.86-.93 1.82-.37zM1067.41 174.52a4.79 4.79 0 0 1 2.19 4.32c0 1.88-.8 2.62-2.22 1.8l-2.52-1.46v4.8l-.7-.4v-10.92zm1.43 4.26V178a3.08 3.08 0 0 0-1.45-2.68l-2.51-1.45v4.45l2.52 1.46c.94.54 1.46.05 1.46-1M1071.86 176.43l-.06 10.79.93.54v.78l-.86-.5a1.56 1.56 0 0 1-.74-1.39l.06-10.61zM1078.25 191l.82.47v.78l-.68-.4a1.64 1.64 0 0 1-.77-1.43v-.28h-.06c-.28.73-.89.94-1.83.4a3.94 3.94 0 0 1-2-3.51c0-1.42.72-1.91 2.46-.9l1.39.8V186a3.05 3.05 0 0 0-1.54-2.88c-.8-.47-1.32-.29-1.65.34l-.42-.71c.33-.73 1-1 2.1-.4a4.36 4.36 0 0 1 2.18 3.94zm-.66-1.94v-1.48l-1.42-.82c-1.2-.69-1.72-.45-1.72.45v.37a2.62 2.62 0 0 0 1.37 2.22c1 .56 1.77.34 1.77-.74M1081.47 183.32v2.23l1.37.79v.78l-1.36-.78v6.44l1.28.74v.78l-1.21-.7a1.56 1.56 0 0 1-.73-1.41v-6.24l-1-.61v-.78l.68.4c.33.19.42.08.42-.37V183zM1086.61 185v.78l-1.33-.77v2.78l1.34.77v.78l-1.33-.77v7.23l-.67-.39v-7.22l-1-.6v-.78l1 .59v-2.23c0-.82.32-1.15 1-.79zM1090 190.31c1.59.92 2.62 3.08 2.61 5.71s-1.07 3.59-2.66 2.67-2.61-3.08-2.6-5.7 1.09-3.6 2.65-2.68zm0 7.59c1.17.67 1.92.08 1.93-1.79v-1a4.38 4.38 0 0 0-1.9-4c-1.16-.67-1.91-.09-1.92 1.79v1a4.41 4.41 0 0 0 1.89 4M1097.27 194.68v.88l-.53-.31c-1-.58-1.72-.36-1.73.67v5.47l-.68-.39v-8l.67.39v1.43c.24-.61.77-1 1.8-.4zM1104.76 198.82a4.54 4.54 0 0 1 2 4.2v5.15l-.67-.39v-5a3.43 3.43 0 0 0-1.51-3.28c-.83-.49-1.58-.32-1.58.87v5.61l-.68-.39v-5a3.44 3.44 0 0 0-1.5-3.27c-.82-.48-1.59-.34-1.59.85v5.63l-.68-.39v-8l.67.39v1.27c.25-.64.72-1 1.71-.47a4.05 4.05 0 0 1 1.85 2.76c.3-.76.91-1.16 1.98-.54zM982.83 144.33a6.31 6.31 0 0 1 2.71 3.9l-.58.12a5 5 0 0 0-2.13-3.18c-1.53-.88-2.46.12-2.47 2.81v1.24c0 2.67.9 4.67 2.43 5.55A1.34 1.34 0 0 0 985 154l.57.79c-.49 1.21-1.46 1.61-2.79.84-2-1.17-3.19-3.77-3.17-7.46s1.2-5.01 3.22-3.84zM989.37 151c1.59.92 2.62 3.08 2.6 5.7s-1.06 3.6-2.64 2.68-2.62-3.08-2.61-5.7 1.06-3.58 2.65-2.68zm0 7.58c1.16.68 1.91.09 1.92-1.79v-1a4.41 4.41 0 0 0-1.89-4c-1.17-.68-1.92-.09-1.93 1.79v1a4.41 4.41 0 0 0 1.89 4M996.18 155a4.62 4.62 0 0 1 2 4.23v5.14l-.67-.39v-5a3.46 3.46 0 0 0-1.53-3.3c-.85-.49-1.64-.37-1.64.82v5.63l-.67-.39v-8l.67.38v1.27c.33-.68.88-1 1.84-.39zM1002 158.31a5 5 0 0 1 2.06 2.42l-.45.29a4.31 4.31 0 0 0-1.65-2c-.85-.49-1.36-.25-1.37.65a2.68 2.68 0 0 0 1.29 2.22l.48.37a4 4 0 0 1 1.79 3.28c0 1.48-.83 1.91-2.16 1.14a5.54 5.54 0 0 1-2.3-2.87l.49-.23A4.64 4.64 0 0 0 1002 166c.91.53 1.45.29 1.45-.68a2.66 2.66 0 0 0-1.23-2.22l-.49-.39a4.07 4.07 0 0 1-1.84-3.3c.05-1.53.94-1.78 2.11-1.1zM1008.08 161.82c1.58.92 2.61 3.08 2.6 5.7s-1.06 3.6-2.65 2.68-2.61-3.08-2.6-5.7 1.06-3.6 2.65-2.68zm0 7.58c1.16.68 1.91.09 1.92-1.79v-1a4.39 4.39 0 0 0-1.89-4c-1.16-.68-1.91-.09-1.92 1.79v1a4.39 4.39 0 0 0 1.89 4M1013.09 161.33l-.05 10.79.93.53v.79l-.86-.5a1.54 1.54 0 0 1-.73-1.4v-10.6zM1020.17 173.18l-4.46-2.58v.4a4.55 4.55 0 0 0 2 4c.86.49 1.5.29 1.83-.56l.49.72c-.38 1-1.22 1.26-2.36.6-1.61-.93-2.63-3.09-2.62-5.72s1-3.6 2.65-2.67 2.54 3.06 2.52 5.41zm-4.46-3.35v.08l3.73 2.16v-.13a4.43 4.43 0 0 0-1.8-3.84c-1.17-.67-1.93.05-1.94 1.73"
						/>
						<path
							d="M1030.27 344.64l-14.61 7.36c-.73.35-1.08 2.21-.29 2.75l23.43 13.57a3 3 0 0 0 2.94 0l13.61-7.57a6 6 0 0 0 2.77-4.72l-.08-27.82-26.62-15v29.4a2.36 2.36 0 0 1-1.15 2.03z"
							fill="url(#Y)"
						/>
						<path
							d="M1029.85 343.72l-14.08 8.13a1.25 1.25 0 0 0 0 2.16l22.61 13.1a3.39 3.39 0 0 0 3.35 0l12.86-7.16a5.4 5.4 0 0 0 2.77-4.73l-.08-27.76a.41.41 0 0 0-.21-.36l-25.24-14.63a.42.42 0 0 0-.63.36v28.45a2.79 2.79 0 0 1-1.35 2.44z"
							fill="url(#i)"
						/>
						<path
							d="M1112 255.4V363c0 2.83-6 6.27-8.43 4.86L983.3 295a9.69 9.69 0 0 1-4.85-8.39L975 183.13c0-4.45 8.24-8.22 12.09-6l119.75 69.31a10.32 10.32 0 0 1 5.16 8.96z"
							fill="url(#Z)"
						/>
						<path
							d="M1108.55 256.91v107.61a3.67 3.67 0 0 1-5.5 3.18l-123.24-71.15a9.68 9.68 0 0 1-4.84-8.39v-104.5a5.78 5.78 0 0 1 8.67-5L1103.39 248a10.33 10.33 0 0 1 5.16 8.91z"
							fill="url(#aa)"
						/>
						<path
							fill="#363d41"
							d="M994.68 211.04l-.04 18.81 14.13 8.15.05-18.81-14.14-8.15zM984.21 203l-.02 5.99 4.51 2.6.01-6-4.5-2.59zM984.21 210.72l-.02 6 4.51 2.6.01-6-4.5-2.6zM984.21 218.44l-.02 6 4.51 2.6.01-6-4.5-2.6zM984.21 226.17l-.02 5.99 4.51 2.6.01-5.99-4.5-2.6zM984.21 233.89l-.02 6 4.51 2.6.01-6-4.5-2.6zM994.73 231.76l-.04 18.81 14.14 8.16.05-18.81-14.15-8.16zM1010.57 220.41l-.04 18.81 14.14 8.15.04-18.81-14.14-8.15z"
							className={`${this.props.activeItem && this.props.activeItem === 'app-console' ? 'diagram--animate-shimmer' : ''}`}
						/>
						<path
							fill="#005cff"
							d="M1010.33 240.63l-.04 18.81 14.13 8.15.05-18.81-14.14-8.15z"
							className={`${this.props.activeItem && this.props.activeItem === 'app-console' ? 'diagram--animate-shimmer' : ''}`}
						/>
						<path
							fill="#363d41"
							d="M1026.33 229.22l-.04 18.81 14.14 8.15.04-18.81-14.14-8.15zM994.68 282.05l-.04 13.04 14.13 8.16.05-13.04-14.14-8.16zM1010.57 291.42l-.04 13.04 14.14 8.16.04-13.04-14.14-8.16zM1026.33 300.23l-.04 13.04 14.14 8.15.04-13.04-14.14-8.15zM1040.72 232.84l-.01 2.48-4.42-2.56v-2.46l4.43 2.54z"
							className={`${this.props.activeItem && this.props.activeItem === 'app-console' ? 'diagram--animate-shimmer' : ''}`}
						/>
						<path
							d="M965.78 364.5l114.91 66a2.59 2.59 0 0 0 2.72-.08l14.8-9.71a2.6 2.6 0 0 0-.13-4.43l-114.7-65.85a2.6 2.6 0 0 0-2.7.06l-15 9.57a2.6 2.6 0 0 0 .1 4.44z"
							fill="#121719"
							opacity="0.15"
						/>
						<g data-name="Certificates">
							<path
								d="M808.43 259.81a6.31 6.31 0 0 1 2.71 3.9l-.58.12a5 5 0 0 0-2.13-3.18c-1.53-.88-2.46.12-2.47 2.81v1.25c0 2.67.9 4.67 2.43 5.55a1.34 1.34 0 0 0 2.21-.77l.58.79c-.49 1.2-1.46 1.6-2.8.83-2-1.17-3.19-3.77-3.17-7.47s1.2-5 3.22-3.83zM817.49 272.34l-4.49-2.57v.39a4.55 4.55 0 0 0 1.94 4c.86.49 1.51.3 1.84-.56l.49.72c-.38 1-1.22 1.26-2.36.6-1.62-.93-2.63-3.09-2.62-5.71s1-3.61 2.65-2.69 2.53 3.06 2.52 5.42zM813 269v.09l3.74 2.15v-.13a4.41 4.41 0 0 0-1.81-3.85c-1.16-.67-1.92.05-1.93 1.74M822.13 270.83v.87l-.53-.3c-1-.58-1.72-.37-1.73.66v5.48l-.67-.38v-8l.67.39V271c.24-.61.78-1 1.81-.39zM824.49 269.94v2.24l1.37.79v.78l-1.36-.79v6.45l1.28.73v.79l-1.2-.7a1.56 1.56 0 0 1-.73-1.41v-6.25l-1-.6v-.78l.68.39c.33.19.42.09.42-.37v-1.62zM827.8 270.63a.93.93 0 0 1 .45.83v.15c0 .33-.14.49-.46.3a.92.92 0 0 1-.46-.83v-.15c.01-.33.15-.48.47-.3zM827.41 281.91l.04-8.01.67.38-.04 8.02-.67-.39zM831.28 273.31v2.79l3.28 1.89v8l-.68-.39v-7.23l-2.6-1.5v7.23l-.67-.39v-7.23l-1-.6v-.78l1 .6v-2.24c0-.81.32-1.15.95-.78l1.06.61v.78zM834.22 274.34a.92.92 0 0 1 .46.83v.15c0 .33-.15.48-.47.3a.9.9 0 0 1-.45-.83v-.15c0-.33.13-.49.46-.3zM838.85 280.29a4.81 4.81 0 0 1 2.13 3h-.56a3.54 3.54 0 0 0-1.57-2.25c-1.23-.71-1.89.05-1.9 1.74V284a4.36 4.36 0 0 0 1.87 3.91c.82.48 1.39.3 1.74-.39l.49.73c-.39.84-1.13 1.1-2.23.46-1.65-.95-2.6-3.05-2.58-5.69s.96-3.68 2.61-2.73zM846.54 292.17l.82.48v.78l-.68-.4a1.61 1.61 0 0 1-.76-1.43v-.28h-.06c-.28.73-.89.94-1.83.4a3.94 3.94 0 0 1-2-3.51c0-1.42.72-1.91 2.46-.91l1.39.8v-.94a3 3 0 0 0-1.53-2.87c-.8-.46-1.32-.29-1.65.35l-.42-.72c.33-.73 1-1 2.1-.4a4.41 4.41 0 0 1 2.18 3.95zm-.66-1.93v-1.49l-1.42-.81c-1.2-.7-1.72-.45-1.72.44v.38a2.57 2.57 0 0 0 1.37 2.22c1 .56 1.75.34 1.76-.74M849.77 284.54v2.23l1.36.79v.78l-1.37-.78v6.45l1.27.73v.78l-1.2-.69a1.56 1.56 0 0 1-.73-1.41v-6.25l-1.05-.61v-.78l.68.4c.33.19.42.08.43-.37v-1.62zM857.35 295.36l-4.46-2.58v.39a4.56 4.56 0 0 0 2 4c.86.5 1.51.3 1.84-.55l.49.72c-.38.95-1.22 1.25-2.36.59-1.62-.93-2.63-3.08-2.62-5.71s1.05-3.61 2.65-2.69 2.54 3.07 2.52 5.42zm-4.46-3.36v.09l3.74 2.16v-.14a4.41 4.41 0 0 0-1.81-3.84c-1.16-.68-1.92.05-1.93 1.73M860.74 292.93a5 5 0 0 1 2.06 2.43l-.45.29a4.13 4.13 0 0 0-1.64-2c-.86-.5-1.37-.26-1.38.65a2.71 2.71 0 0 0 1.29 2.22l.48.37a4 4 0 0 1 1.8 3.28c0 1.49-.83 1.91-2.16 1.14a5.51 5.51 0 0 1-2.31-2.87l.49-.23a4.66 4.66 0 0 0 1.87 2.37c.92.53 1.45.28 1.46-.69a2.67 2.67 0 0 0-1.23-2.21l-.5-.4a4 4 0 0 1-1.83-3.31c0-1.47.89-1.71 2.05-1.04z"
								fill="#fff"
							/>
							<path fill="none"
								stroke="#bbb"
								strokeLinecap="round"
								strokeMiterlimit="10"
								d="M529.8 255.72l.13-.08"
							/>
							<path
								d="M533.41 253.63l66-38.17a9.87 9.87 0 0 1 9.89 0l188.81 109"
								fill="none"
								stroke="#bbb"
								strokeLinecap="round"
								strokeMiterlimit="10"
								strokeDasharray="0.3 4.02"
							/>
							<path fill="none"
								stroke="#bbb"
								strokeLinecap="round"
								strokeMiterlimit="10"
								d="M799.87 325.42l.13.08"
							/>
							<path fill="#242a2e"
								d="M884.18 361.76v-1.54l-52.08-30.1-43.32 25.03v1.54"
							/>
							<path fill="#242a2e"
								d="M788.78 356.69l43.32-25.03 52.08 30.1-43.23 25-52.17-30.07z"
							/>
							<path fill="url(#f)"
								d="M788.78 355.15l43.32-25.03 52.08 30.1-43.23 25-52.17-30.07z"
							/>
							<path fill="#363d41"
								d="M796.08 355.46l36.82-21.28 44.27 25.59-36.75 21.25-44.34-25.56z"
							/>
							<ellipse cx="840.4"
								cy="370.9"
								rx="7.31"
								ry="3.75"
								fill="#9ea5ad"
							/>
							<path fill="#9ea5ad"
								d="M829.44 339.4l29.35 16.94-3.77 2.17-29.36-16.96 3.78-2.15zM820.74 344.41l24.32 13.92-3.86 2.24-24.24-14 3.78-2.16z"
							/>
							<path fill="#242a2e"
								d="M884.18 352.31v-1.54l-52.08-30.11-43.32 25.04v1.54"
							/>
							<path fill="#242a2e"
								d="M788.78 347.24l43.32-25.04 52.08 30.11-43.23 25-52.17-30.07z"
							/>
							<path fill="url(#W)"
								d="M788.78 345.7l43.32-25.04 52.08 30.11-43.23 25-52.17-30.07z"
							/>
							<path fill="#363d41"
								d="M796.08 346l36.82-21.28 44.27 25.59-36.75 21.25L796.08 346z"
							/>
							<ellipse cx="840.4"
								cy="361.44"
								rx="7.31"
								ry="3.75"
								fill="#9ea5ad"
							/>
							<path fill="#9ea5ad"
								d="M829.44 329.94l29.35 16.94-3.77 2.17-29.36-16.95 3.78-2.16zM820.74 334.96l24.32 13.91-3.86 2.24-24.24-13.99 3.78-2.16z"
							/>
							<path fill="#242a2e"
								d="M884.18 342.68v-1.54l-52.08-30.1-43.32 25.03v1.54"
							/>
							<path fill="#242a2e"
								d="M788.78 337.61l43.32-25.03 52.08 30.1-43.23 25-52.17-30.07z"
							/>
							<path fill="url(#X)"
								d="M788.78 336.07l43.32-25.03 52.08 30.1-43.23 25-52.17-30.07z"
							/>
							<path fill="#363d41"
								d="M796.08 336.38l36.82-21.28 44.27 25.59-36.75 21.25-44.34-25.56z"
							/>
							<ellipse cx="840.4"
								cy="351.82"
								rx="7.31"
								ry="3.75"
								fill="#242a2e"
							/>
							<path fill="#242a2e"
								d="M829.44 320.31l29.35 16.94-3.77 2.17-29.36-16.95 3.78-2.16zM820.74 325.33l24.32 13.92-3.86 2.23-24.24-13.99 3.78-2.16z"
							/>
						</g>
					</g>
					<g
						data-name="Client application"
						className={`
		diagram--client-app-container
		${this.props.activeItem === 'client-app' || this.props.activeTextItem === 'client-app' ? 'diagram--active-hover-item' : ''}
		${this.props.activeItem && this.props.activeItem !== 'client-app' ? 'diagram--inactive-hover-item' : ''}
		${this.props.activeTextItem && this.props.activeTextItem !== 'client-app' ? 'diagram--inactive-hover-item' : ''}
	`}
						onMouseOver={() => this.hoverItem('client-app')}
						onMouseOut={() => this.mouseOutItem('client-app')}
					>
						<path
							d="M748.33 8.7a6.3 6.3 0 0 1 2.7 3.9l-.58.12a5 5 0 0 0-2.13-3.18c-1.53-.88-2.45.13-2.47 2.82v1.24c0 2.67.89 4.67 2.42 5.55 1.1.63 1.85.27 2.21-.78l.58.79c-.49 1.21-1.46 1.6-2.79.84-2-1.17-3.19-3.77-3.17-7.46s1.2-5.01 3.23-3.84zM753.41 11.16v10.8l.93.54v.78l-.86-.5a1.53 1.53 0 0 1-.73-1.39V10.78zM756.18 12.87a.93.93 0 0 1 .45.83v.15c0 .33-.14.49-.46.3a.92.92 0 0 1-.46-.83v-.15c.01-.33.15-.48.47-.3zM755.79 24.15l.04-8.01.67.39-.04 8.01-.67-.39zM763.35 24.67l-4.46-2.57v.39a4.52 4.52 0 0 0 2 4c.86.5 1.49.3 1.83-.56l.49.72c-.38 1-1.22 1.26-2.36.6-1.61-.93-2.63-3.08-2.62-5.71s1.05-3.61 2.65-2.69 2.53 3.07 2.52 5.42zm-4.46-3.34v.08l3.73 2.15v-.12a4.45 4.45 0 0 0-1.79-3.86c-1.17-.67-1.93.06-1.94 1.75M767.56 22.72a4.63 4.63 0 0 1 2 4.23v5.15l-.67-.39v-5a3.47 3.47 0 0 0-1.53-3.3c-.85-.49-1.64-.36-1.65.83v5.63l-.67-.39.05-8 .67.39v1.27c.29-.66.83-.98 1.8-.42zM772.68 23.62v2.24l1.37.79v.78l-1.37-.78v6.44l1.27.73v.78l-1.2-.69a1.56 1.56 0 0 1-.75-1.41v-6.24l-1-.61v-.78l.68.4c.33.19.42.08.43-.37v-1.63zM782.39 38.73l.81.46V40l-.68-.4a1.6 1.6 0 0 1-.76-1.42v-.29h-.06c-.28.74-.89.95-1.83.4a3.94 3.94 0 0 1-2-3.51c0-1.42.72-1.9 2.46-.9l1.39.8v-.94a3.05 3.05 0 0 0-1.53-2.88c-.8-.46-1.32-.29-1.65.35l-.42-.71c.33-.73 1-1 2.1-.41a4.4 4.4 0 0 1 2.18 4zm-.66-1.94V35.3l-1.42-.81c-1.2-.69-1.72-.44-1.72.45v.37a2.57 2.57 0 0 0 1.41 2.22c1 .56 1.75.34 1.76-.74M787.16 34c1.54.89 2.47 3 2.46 5.63s-1 3.65-2.5 2.76a4.17 4.17 0 0 1-1.83-2.53v4.41l-.67-.39.06-11.14.67.39v1.28c.27-.68.89-.9 1.81-.41zm-.19 7.5c1.2.69 1.92 0 1.93-1.72v-1.09a4.46 4.46 0 0 0-1.9-3.94c-.93-.53-1.72-.25-1.72.79v3.18a3.49 3.49 0 0 0 1.72 2.82M793.91 37.93c1.54.89 2.48 3 2.46 5.64s-1 3.64-2.5 2.75a4.18 4.18 0 0 1-1.87-2.53v4.41l-.67-.38.06-11.14.67.39v1.28c.31-.72.94-.95 1.85-.42zm-.19 7.51c1.2.69 1.92 0 1.93-1.72v-1.13a4.42 4.42 0 0 0-1.9-3.94c-.93-.54-1.73-.25-1.73.79v3.18a3.51 3.51 0 0 0 1.71 2.82M798.81 37.38v10.79l.93.54v.78l-.86-.49a1.56 1.56 0 0 1-.73-1.4V36.99zM801.58 39.08a.93.93 0 0 1 .45.83v.16c0 .32-.14.48-.46.29a.91.91 0 0 1-.46-.82v-.16c.01-.33.15-.48.47-.3zM801.19 50.36l.04-8.01.67.39-.04 8.01-.67-.39zM806.21 45a4.88 4.88 0 0 1 2.13 3l-.57.05a3.5 3.5 0 0 0-1.57-2.25c-1.22-.71-1.89 0-1.89 1.74v1.13a4.36 4.36 0 0 0 1.87 3.92c.82.47 1.39.3 1.73-.4l.5.72c-.4.84-1.13 1.11-2.24.47-1.64-1-2.59-3.05-2.58-5.69s.97-3.61 2.62-2.69zM813.9 56.92l.81.46v.79l-.68-.4a1.6 1.6 0 0 1-.76-1.42v-.29c-.28.74-.89.95-1.84.4a4 4 0 0 1-2-3.51c0-1.42.72-1.9 2.46-.9l1.39.8v-.94a3.07 3.07 0 0 0-1.56-2.91c-.8-.46-1.32-.29-1.65.35l-.42-.71c.33-.73 1-1 2.1-.41a4.39 4.39 0 0 1 2.17 4zm-.67-1.92v-1.51l-1.41-.81c-1.2-.69-1.72-.44-1.72.45v.37a2.62 2.62 0 0 0 1.37 2.22c1 .56 1.76.34 1.76-.74M817.12 49.28v2.24l1.37.79v.78l-1.36-.78v6.44l1.27.73v.79l-1.2-.7a1.59 1.59 0 0 1-.74-1.41v-6.24l-1.05-.61v-.78l.69.4c.33.19.42.08.42-.37v-1.63zM820.44 50a.93.93 0 0 1 .45.83V51c0 .33-.14.49-.46.3a.92.92 0 0 1-.46-.83v-.15c.03-.38.15-.53.47-.32zM820.05 61.25l.04-8.01.67.39-.04 8.01-.67-.39zM825.09 55.93c1.59.92 2.61 3.09 2.6 5.72s-1.06 3.59-2.65 2.67-2.61-3.07-2.6-5.7 1.06-3.62 2.65-2.69zm0 7.6c1.16.67 1.91.08 1.92-1.8v-1a4.41 4.41 0 0 0-1.89-4c-1.17-.67-1.92-.08-1.93 1.79v1a4.41 4.41 0 0 0 1.89 4M831.9 59.87a4.62 4.62 0 0 1 2 4.23v5.14l-.67-.38v-5a3.47 3.47 0 0 0-1.53-3.3c-.85-.49-1.64-.36-1.64.82v5.63l-.67-.38v-8l.67.39v1.26c.33-.65.88-.97 1.84-.41z"
							fill="#fff"
						/>
						<path
							d="M855.79 322.59l25-14.25a4.59 4.59 0 0 0 2.29-3.87V181.09a9.35 9.35 0 0 0-4.64-8.07L792 122.77"
							fill="none"
							stroke="#bbbbba"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeDasharray="0.3 4"
						/>
						<path
							d="M768.34 85.7L789.52 98a4.32 4.32 0 0 1 2.14 3.71l.1 45.74c0 .81-1.22 1.79-2.36 2.22a3.56 3.56 0 0 1-.47.19 1.51 1.51 0 0 1-.36.06 1.81 1.81 0 0 1-.76-.16l-22-12.78c-1.15-.67-.55-2.94-.55-4.27l-1.68-44.45c.22-1.98 3.35-3.38 4.76-2.56z"
							fill="url(#ab)"
						/>
						<path
							d="M766.74 86.68L787.88 99a4.29 4.29 0 0 1 2.13 3.7l.1 45.66a1.6 1.6 0 0 1-2.4 1.38l-22.18-12.88a3.75 3.75 0 0 1-1.86-3.22l-.09-45.09a2.1 2.1 0 0 1 3.16-1.87z"
							fill="url(#ac)"
						/>
						<path fill="#242a2e"
							d="M765.64 89.79l22.39 12.89-.05 40.48-22.34-12.89V89.79z"
						/>
						<path
							d="M770.38 99.23c.93.54 1.38 1.76 1.37 3.62s-.47 2.57-1.4 2-1.39-1.76-1.38-3.63.47-2.53 1.41-1.99zm0 5.24c.69.4 1-.19 1-1.46v-.74c0-1.27-.31-2.23-1-2.63s-1 .18-1 1.46v.73c0 1.28.32 2.24 1 2.64M775 102v.42l-1.84-1.06-.14 2.2c.2-.26.46-.31.89-.06a2.65 2.65 0 0 1 1.2 2.36c0 1.06-.51 1.47-1.33 1a3 3 0 0 1-1.26-1.62l.26-.12a2.31 2.31 0 0 0 1 1.32c.6.35.95.07.95-.69v-.13a2 2 0 0 0-.92-1.78c-.43-.24-.64-.17-.84 0l-.31-.24.17-2.88zM776.49 104.31a.57.57 0 0 1 .28.52v.08c0 .21-.1.3-.29.19a.57.57 0 0 1-.28-.51v-.09c0-.21.09-.3.29-.19zM776.47 107.6a.56.56 0 0 1 .28.51v.09c0 .21-.1.29-.28.18a.53.53 0 0 1-.28-.51v-.09c0-.21.09-.3.28-.18zM779.4 104.53l-.03 5.05 1.13.65v.41l-2.68-1.55v-.41l1.2.69.03-4.7-.03-.01-1.14.68-.2-.41 1.18-.71.54.31zM782.61 106.29c.94.54 1.39 1.76 1.38 3.63s-.47 2.56-1.41 2-1.38-1.76-1.37-3.62.47-2.55 1.4-2.01zm0 5.24c.69.4 1-.18 1-1.46v-.73c0-1.28-.32-2.24-1-2.64s-1 .19-1 1.46v.74c0 1.27.31 2.23 1 2.63"
							fill="#d4d9e1"
						/>
						<path
							d="M734.89 236.21L771 257a2.61 2.61 0 0 0 2.72-.08l14.81-9.71a2.6 2.6 0 0 0-.14-4.43l-35.94-20.68a2.6 2.6 0 0 0-2.69.06l-15 9.58a2.6 2.6 0 0 0 .13 4.47z"
							fill="#121719"
							opacity="0.15"
						/>
					</g>
					<g
						data-name="Vscode"
						className={`
			diagram--vscode-container
			${this.props.activeItem === 'vscode' || this.props.activeTextItem === 'vscode' ? 'diagram--active-hover-item' : ''}
			${this.props.activeItem && this.props.activeItem !== 'vscode' ? 'diagram--inactive-hover-item' : ''}
			${this.props.activeTextItem && this.props.activeTextItem !== 'vscode' ? 'diagram--inactive-hover-item' : ''}
		`}
						onMouseOver={() => this.hoverItem('vscode')}
						onMouseOut={() => this.mouseOutItem('vscode')}
					>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M48.79 354.67l-.13-.08"
						/>
						<path
							d="M45.22 352.6l-33.36-19.3a4.57 4.57 0 0 1-2.28-3.95l.16-121.15"
							fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeDasharray="0.3 3.97"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M9.74 206.22v-.15.15M9.74 206.64v.15a.76.76 0 0 1 0-.15"
						/>
						<path
							d="M11.59 203.21a4.17 4.17 0 0 1 .44-.29l91.29-53.12"
							fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeDasharray="0.3 4.02"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M105.06 148.79l.13-.08M281.9 399.25l-.13.08"
						/>
						<path
							d="M278.33 401.31L206.05 443a4.53 4.53 0 0 1-4.56 0L83.64 374.84"
							fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeDasharray="0.3 3.97"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M81.92 373.84l-.13-.07M607.46 55.52l.13-.07"
						/>
						<path
							d="M611 53.45l27.71-16a5.51 5.51 0 0 1 5.5 0L758 103.26"
							fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeDasharray="0.3 3.98"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M759.76 104.26l.13.07M460.93 69.91l.13.07"
						/>
						<path
							d="M464.49 72l52.33 30.28a9.87 9.87 0 0 0 9.89 0l51.51-29.81"
							fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeDasharray="0.3 3.97"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M579.94 71.45l.13-.08M242.19 69.38l.13-.07"
						/>
						<path
							d="M245.76 67.32L348.35 8a5.48 5.48 0 0 1 5.51 0l71.6 41.43"
							fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							strokeDasharray="0.3 3.97"
						/>
						<path fill="none"
							stroke="#bbb"
							strokeLinecap="round"
							strokeMiterlimit="10"
							d="M427.18 50.38l.13.08"
						/>
						<path
							d="M105.57 51.15c2.14-1.23 3.39-.12 3.44 3.49s-1.15 6.14-3.29 7.37l-2.65 1.53-.15-10.86zm.15 10c1.64-.94 2.57-3 2.54-5.39v-1.43c0-2.41-1-3.34-2.65-2.39l-2 1.12.13 9.21 2-1.12M115.65 52.44l-4.53 2.61v.39c0 1.66.78 2.4 2 1.68a4.14 4.14 0 0 0 1.88-2.67l.51.14a5.43 5.43 0 0 1-2.36 3.33c-1.64.94-2.7 0-2.73-2.63s1-4.77 2.6-5.71 2.6.1 2.63 2.44zm-4.54 1.85v.07l3.79-2.18v-.13c0-1.68-.78-2.35-1.88-1.72a4.52 4.52 0 0 0-1.91 4M121.6 44.81l-2.1 9.25-.78.44-2.32-6.69.72-.41 1.97 5.93.05-.02 1.77-8.1.69-.4zM127.67 45.49l-4.52 2.62v.39c0 1.66.78 2.4 2 1.68A4.2 4.2 0 0 0 127 47.5l.5.15a5.34 5.34 0 0 1-2.34 3.35c-1.63 1-2.69 0-2.73-2.62s1-4.77 2.6-5.71 2.61.1 2.64 2.43zm-4.53 1.85v.08l3.78-2.18v-.13c0-1.68-.78-2.36-1.88-1.72a4.47 4.47 0 0 0-1.9 4M130 36.4l.15 10.74.94-.55v.78l-.87.5c-.49.28-.76.05-.76-.53l-.15-10.55zM134.67 37.08c1.61-.93 2.69 0 2.72 2.63s-1 4.78-2.6 5.71-2.69 0-2.72-2.63.99-4.79 2.6-5.71zm.11 7.54a4.32 4.32 0 0 0 1.89-4v-1c0-1.85-.8-2.44-2-1.76a4.34 4.34 0 0 0-1.89 4v1c0 1.85.79 2.45 2 1.76M141.64 33.05c1.57-.9 2.55.09 2.58 2.72s-.89 4.72-2.46 5.62c-.93.54-1.53.31-1.88-.39l.06 4.39-.68.39-.15-11.08.68-.4v1.28a4.14 4.14 0 0 1 1.85-2.53zm0 7.64a4.39 4.39 0 0 0 1.9-3.94v-1.12c0-1.71-.77-2.4-2-1.7a3.54 3.54 0 0 0-1.72 2.78l.05 3.16c0 1.12.82 1.36 1.77.82M150.73 32.18l-4.52 2.61v.39c0 1.67.78 2.41 2 1.68a4.15 4.15 0 0 0 1.83-2.67l.5.15a5.37 5.37 0 0 1-2.36 3.32c-1.63 1-2.69 0-2.73-2.62s1-4.77 2.6-5.71 2.6.1 2.64 2.43zM146.2 34v.08l3.8-2.16v-.12c0-1.68-.78-2.36-1.88-1.72a4.47 4.47 0 0 0-1.9 4M155.37 25.32v.87l-.54.31a3.24 3.24 0 0 0-1.72 2.65l.08 5.45-.68.39-.11-8 .68-.4v1.43a3.9 3.9 0 0 1 1.8-2.49zM160.44 20.15v2.22l1.38-.8v.78l-1.38.8.09 6.41 1.29-.74v.77l-1.22.71c-.49.28-.76 0-.77-.55l-.08-6.21-1.07.62v-.78l.7-.4c.33-.19.42-.4.42-.86v-1.61zM165.61 19.21c1.61-.93 2.69 0 2.72 2.64s-1 4.77-2.6 5.7-2.69 0-2.72-2.63.99-4.77 2.6-5.71zm.11 7.55a4.33 4.33 0 0 0 1.89-4v-1c0-1.85-.8-2.44-2-1.76a4.33 4.33 0 0 0-1.89 4v1c0 1.85.8 2.44 2 1.76M172.18 15.42c1.61-.93 2.68 0 2.72 2.64s-1 4.77-2.6 5.7-2.69 0-2.73-2.63 1-4.78 2.61-5.71zm.11 7.55a4.34 4.34 0 0 0 1.89-4V18c0-1.85-.8-2.45-2-1.76a4.32 4.32 0 0 0-1.89 4v1c0 1.85.79 2.44 2 1.76M177.21 9.13l.15 10.74.94-.55v.78l-.87.5c-.49.29-.76 0-.77-.53l-.14-10.55zM181.42 10.09c1-.59 1.64-.43 2.11 0l-.45.81c-.33-.32-.84-.54-1.68-.05a2.54 2.54 0 0 0-1.4 2.25c0 .92.46 1 1.34.7l.49-.18c1.24-.47 1.84-.11 1.86 1.17a4.16 4.16 0 0 1-2.14 3.62c-1.07.61-1.82.49-2.38-.17l.5-.8a1.37 1.37 0 0 0 1.91.18 2.69 2.69 0 0 0 1.45-2.36c0-.84-.39-1.11-1.28-.77l-.5.18c-1.11.42-1.88.29-1.9-1.14a3.93 3.93 0 0 1 2.07-3.44zM60.27 299.28c1.24-.71 2.1-.58 2.66.14l-.53.83c-.47-.59-1.15-.7-2.15-.12a3.52 3.52 0 0 0-1.91 3.15c0 1.29.7 1.4 1.74 1.08l.74-.23c1.67-.49 2.27.19 2.29 1.68a5.32 5.32 0 0 1-2.69 4.72c-1.36.79-2.26.57-2.92-.18l.53-.89a1.67 1.67 0 0 0 2.4.23 3.77 3.77 0 0 0 2-3.43c0-1.33-.64-1.49-1.71-1.17l-.74.22c-1.58.49-2.29-.09-2.31-1.6a5 5 0 0 1 2.6-4.43zM71.1 296c1.3-.75 2-.08 2.07 1.86l.07 5.12-.68.39-.07-5c0-1.6-.55-2.1-1.57-1.51a3.17 3.17 0 0 0-1.58 2.7l.08 5.59-.68.39-.07-5c0-1.62-.56-2.1-1.56-1.52a3.17 3.17 0 0 0-1.59 2.69l.08 5.6-.68.4-.11-8 .68-.39v1.27a3.76 3.76 0 0 1 1.71-2.45c.87-.5 1.6-.39 1.91.59A4.1 4.1 0 0 1 71.1 296zM79.44 298.58l.82-.48v.78l-.69.4c-.52.3-.74 0-.79-.53v-.28h-.06A4 4 0 0 1 76.9 301c-1.28.74-2 .29-2.05-1.19a4.16 4.16 0 0 1 2.45-3.73l1.41-.82v-.93c0-1.31-.55-1.67-1.59-1.07a3.73 3.73 0 0 0-1.65 2.25l-.44-.22a4.72 4.72 0 0 1 2.1-2.83c1.43-.82 2.24-.3 2.26 1.38zm-.7-1.15v-1.48l-1.44.83a2.85 2.85 0 0 0-1.72 2.44v.37c0 .92.58 1.09 1.41.61a3.43 3.43 0 0 0 1.76-2.77M84.52 288.39v.88l-.53.31a3.19 3.19 0 0 0-1.72 2.65l.07 5.45-.68.39-.11-8 .68-.39v1.43a4 4 0 0 1 1.81-2.49zM86.87 284.79v2.23l1.38-.8v.78l-1.38.8.09 6.41 1.29-.74v.78l-1.22.7c-.49.28-.76.05-.77-.55l-.08-6.2-1.07.61V288l.7-.4a.8.8 0 0 0 .42-.84v-1.63zM94.88 282.23c1.13-.65 1.83-.34 2.2.49l-.57.71c-.29-.69-.81-.87-1.61-.41a4.32 4.32 0 0 0-1.9 3.92v1.12c0 1.68.71 2.43 1.95 1.71a4 4 0 0 0 1.74-2.4l.5.15a5.06 5.06 0 0 1-2.19 3.05c-1.67 1-2.66 0-2.7-2.65s.91-4.73 2.58-5.69zM100.74 278.85c1.61-.93 2.68 0 2.72 2.63s-1 4.78-2.61 5.71-2.68 0-2.72-2.64.99-4.77 2.61-5.7zm.1 7.54a4.35 4.35 0 0 0 1.9-4v-1c0-1.85-.79-2.44-2-1.76a4.35 4.35 0 0 0-1.9 4v1c0 1.85.79 2.45 2 1.76M107.65 274.86c1.3-.76 2.08-.11 2.11 1.84l.07 5.12-.68.39-.07-5c0-1.62-.58-2.08-1.6-1.5a3.24 3.24 0 0 0-1.63 2.72l.07 5.6-.68.39-.11-8 .68-.39v1.26a3.87 3.87 0 0 1 1.84-2.43zM112.8 269.82v2.22l1.39-.8v.76l-1.38.8.09 6.41 1.29-.75v.78L113 280c-.49.28-.76 0-.77-.55l-.09-6.21-1.06.61v-.78l.69-.4a.78.78 0 0 0 .42-.85v-1.62zM118.82 268.59v.88l-.54.31a3.24 3.24 0 0 0-1.72 2.65l.08 5.45-.68.39-.11-8 .68-.4v1.44a4 4 0 0 1 1.81-2.49zM124.27 272.7l.82-.48v.78l-.69.4c-.53.3-.75 0-.79-.53v-.28h-.06a4 4 0 0 1-1.83 2.52c-1.28.73-2 .29-2.06-1.19a4.2 4.2 0 0 1 2.46-3.74l1.41-.81v-.93c0-1.31-.55-1.68-1.59-1.08a3.75 3.75 0 0 0-1.65 2.26l-.44-.22a4.67 4.67 0 0 1 2.1-2.83c1.42-.82 2.24-.3 2.26 1.38zm-.7-1.15v-1.48l-1.43.83a2.83 2.83 0 0 0-1.72 2.44v.37c0 .92.58 1.09 1.42.61a3.43 3.43 0 0 0 1.76-2.77M128.53 262.8c1.13-.65 1.83-.34 2.2.49l-.57.72c-.29-.7-.81-.88-1.61-.42a4.32 4.32 0 0 0-1.88 3.92v1.12c0 1.68.71 2.43 1.95 1.71a4 4 0 0 0 1.74-2.39l.5.14a5 5 0 0 1-2.23 3.05c-1.67 1-2.66 0-2.7-2.65s.93-4.73 2.6-5.69zM133.26 258v2.22l1.39-.8v.79l-1.39.8.09 6.41 1.29-.75v.78l-1.22.71c-.49.28-.75 0-.76-.55l-.09-6.21-1.07.62v-.79l.7-.4a.79.79 0 0 0 .42-.85v-1.62z"
							fill="#fff"
						/>
						<path fill="url(#k)"
							d="M89.32 312.04l-36.48 20.95-.07 50.57 36.41-20.89.14-50.63z"
						/>
						<path fill="url(#ad)"
							d="M53.89 384.21l-1.12-.65.07-50.57 36.48-20.95 1.12.65"
						/>
						<path fill="url(#j)"
							d="M90.44 312.69l-36.48 20.95-.07 50.57 36.41-20.89.14-50.63z"
						/>
						<path
							fill="#697077"
							d="M81.16 340.15l.03 1.86-5.72 3.31-.03-1.87 2.14-1.24-.06-4.66-2.15 1.24-.02-1.87 2.14-1.24-.02-1.86 1.43-.82.12 8.38 2.14-1.23zM78 346.66c2.17-1.25 4 0 4 2.86s-1.69 6.14-3.86 7.4-4 0-4-2.86 1.69-6.14 3.86-7.4zm.11 8.39a5.79 5.79 0 0 0 2.46-4.7c0-1.81-1.17-2.61-2.55-1.82a5.79 5.79 0 0 0-2.45 4.71c0 1.8 1.16 2.61 2.54 1.81M67.28 352.86c2.17-1.26 4 0 4 2.85s-1.69 6.15-3.86 7.4-4 0-4-2.85 1.68-6.15 3.86-7.4zm.11 8.39a5.8 5.8 0 0 0 2.46-4.71c0-1.8-1.17-2.61-2.55-1.81a5.82 5.82 0 0 0-2.46 4.7c0 1.81 1.17 2.62 2.55 1.82M67.09 339.81c2.18-1.25 4 0 4 2.86s-1.69 6.14-3.86 7.4-4 0-4-2.86 1.69-6.14 3.86-7.4zm.12 8.39a5.84 5.84 0 0 0 2.46-4.71c0-1.8-1.17-2.62-2.55-1.82a5.79 5.79 0 0 0-2.46 4.72c0 1.79 1.17 2.61 2.55 1.81"
						/>
						<path
							d="M192.53 173.09l14.61 7.31c.73.35 1.08 2.21.29 2.75L184 196.72a3 3 0 0 1-2.94 0l-13.6-7.58a6 6 0 0 1-2.77-4.72l.08-27.81 26.62-15V171a2.35 2.35 0 0 0 1.14 2.09z"
							fill="url(#ae)"
						/>
						<path
							d="M193 172.17l14 8.13a1.25 1.25 0 0 1 0 2.16l-22.62 13.1a3.39 3.39 0 0 1-3.35 0l-12.85-7.16a5.38 5.38 0 0 1-2.77-4.73l.08-27.76a.42.42 0 0 1 .2-.36L191 141a.41.41 0 0 1 .62.36v28.45a2.79 2.79 0 0 0 1.38 2.36z"
							fill="url(#af)"
						/>
						<path
							d="M257 193l-114.91 66a2.59 2.59 0 0 1-2.72-.08l-14.8-9.71a2.6 2.6 0 0 1 .13-4.43l114.7-65.85a2.58 2.58 0 0 1 2.69.06l15 9.57A2.6 2.6 0 0 1 257 193z"
							fill="#121719"
							opacity="0.15"
						/>
						<path
							d="M105.19 89v107.59c0 2.83 6 6.27 8.43 4.86l120.31-72.83a9.69 9.69 0 0 0 4.85-8.39l3.41-103.51c0-4.46-8.24-8.23-12.09-6L110.35 80a10.35 10.35 0 0 0-5.16 9z"
							fill="url(#ag)"
						/>
						<path
							d="M108.68 90.49V198.1a3.67 3.67 0 0 0 5.5 3.18l123.24-71.15a9.69 9.69 0 0 0 4.85-8.39V17.24a5.78 5.78 0 0 0-8.68-5l-119.75 69.3a10.33 10.33 0 0 0-5.16 8.95z"
							fill="url(#ah)"
						/>
						<path
							fill="#363d41"
							d="M158.38 156.04l66.33-38.74-.02-74.76-53.6 31.31-.01-3.22-12.7 7.42v77.99zM133.29 92.63v77.99l23.36-13.64V79.06l-23.36 13.57zM127.86 173.76l-.01-77.99 3.69-2.13.01 77.99-3.69 2.13z"
						/>
						<path fill="#005cff"
							d="M224.7 117.52l-.01-2.02-96.84 56.24v2.02l96.85-56.24z"
						/>
						<path fill="#868c95"
							d="M173.89 94.61l12.51-7.17v-2.12l-12.51 7.16v2.13z"
						/>
						<path fill="#005cff"
							d="M172.34 93.38l-7.83 4.53v2.11l7.83-4.52v-2.12z"
						/>
						<path fill="#868c95"
							d="M181.72 103.14l28.63-16.59-.01-2.13-28.62 16.6v2.12z"
						/>
						<path fill="#005cff"
							d="M180.17 104.03v-2.12l-10.16 5.89.01 2.12 10.15-5.89z"
						/>
						<path fill="#868c95"
							d="M181.72 107.64l28.63-16.59-.01-2.13-28.62 16.6v2.12z"
						/>
						<path fill="#005cff"
							d="M180.17 108.54v-2.12l-10.16 5.88.01 2.12 10.15-5.88z"
						/>
						<path fill="#868c95"
							d="M173.89 88.34l6.28-3.63-.01-2.13-6.27 3.63v2.13z"
						/>
						<path fill="#005cff"
							d="M172.34 87.11l-7.83 4.53v2.12l7.83-4.53v-2.12z"
						/>
						<path fill="#868c95"
							d="M173.89 83.84l6.28-3.63-.01-2.13-6.27 3.63v2.13z"
						/>
						<path fill="#005cff"
							d="M172.34 82.61l-7.83 4.53v2.11l7.83-4.52v-2.12z"
						/>
						<path fill="url(#ai)"
							d="M454.79 11.34l-36.48 20.95-.08 50.57 36.42-20.89.14-50.63z"
						/>
						<path fill="url(#aj)"
							d="M419.35 83.51l-1.12-.65.08-50.57 36.48-20.95 1.12.65"
						/>
						<path fill="url(#ak)"
							d="M455.91 11.99l-36.48 20.95-.08 50.57 36.42-20.89.14-50.63z"
						/>
						<path
							d="M429.88 57.29c.43-.24.64 0 .65.42v.19a1.24 1.24 0 0 1-.62 1.14c-.44.26-.65.06-.65-.41v-.19a1.24 1.24 0 0 1 .62-1.15zM436.81 42.73l.12 8.93a5.36 5.36 0 0 1-2.46 4.8c-1.3.75-2.22.25-2.48-1.11l.7-.64c.23.93.81 1.38 1.79.82a3.75 3.75 0 0 0 1.65-3.53l-.13-7.89-3.19 1.89v-.91zM441.83 39.63c1.38-.8 2.33-.66 3 .15l-.59.92c-.53-.66-1.28-.78-2.4-.14a4 4 0 0 0-2.12 3.49c0 1.44.78 1.56 1.93 1.21l.83-.25c1.85-.55 2.52.2 2.54 1.86a5.89 5.89 0 0 1-3 5.24c-1.51.88-2.5.64-3.24-.2l.59-1c.67.75 1.46 1 2.66.25a4.23 4.23 0 0 0 2.2-3.81c0-1.48-.72-1.65-1.9-1.31l-.83.25c-1.76.55-2.54-.1-2.57-1.77a5.55 5.55 0 0 1 2.9-4.89z"
							fill="#868c95"
						/>
						<path fill="url(#al)"
							d="M579.64 11.34l36.48 20.95.08 50.57-36.42-20.89-.14-50.63z"
						/>
						<path fill="url(#am)"
							d="M615.08 83.51l1.12-.65-.08-50.57-36.48-20.95-1.12.65"
						/>
						<path fill="url(#an)"
							d="M578.52 11.99L615 32.94l.08 50.57-36.42-20.89-.14-50.63z"
						/>
						<path
							d="M587.38 47.56a1.26 1.26 0 0 1 .62 1.14v.19c0 .47-.21.67-.63.43a1.27 1.27 0 0 1-.63-1.15V48c.01-.49.2-.69.64-.44zM594.4 41.05v9c0 2.15-1 2.81-2.49 2a5.4 5.4 0 0 1-2.44-4.05l.69.17a4 4 0 0 0 1.74 2.85c1.08.62 1.66 0 1.67-1.65v-7.89l-3.16-1.83v-.92zM599.36 43.7a6.78 6.78 0 0 1 2.88 3.53l-.59.23a5.56 5.56 0 0 0-2.34-2.86c-1.3-.76-2.12-.46-2.13 1A4.27 4.27 0 0 0 599 49l.81.69a6 6 0 0 1 2.44 4.73c0 2.22-1.16 2.86-3 1.79a7.77 7.77 0 0 1-3.15-3.89l.59-.31a6.46 6.46 0 0 0 2.6 3.3c1.41.81 2.2.33 2.21-1.28a4.32 4.32 0 0 0-1.83-3.46l-.81-.69a6 6 0 0 1-2.47-4.68c.03-2.09 1.21-2.51 2.97-1.5z"
							fill="#868c95"
						/>
					</g>
					<circle
						aria-label={translate('ibp_vscode_extension')}
						fill="#0062ff"
						cx="79"
						cy="59"
						r="8"
						className={`${
							this.props.activeItem === 'vscode' || this.props.activeTextItem === 'vscode' ? 'diagram--active-hotspot' : ''
						} diagram--hotspot-circle`}
						tabIndex="0"
						onFocus={() => this.hoverItem('vscode')}
						onBlur={() => this.mouseOutItem('vscode')}
						onMouseOver={() => this.hoverItem('vscode')}
						onMouseOut={() => this.mouseOutItem('vscode')}
						strokeDashoffset="800"
						strokeDasharray="800"
					/>
					<circle
						aria-label={translate('ibp_client_app')}
						fill="#0062ff"
						cx="730"
						cy="16"
						r="8"
						className={`${
							this.props.activeItem === 'client-app' || this.props.activeTextItem === 'client-app' ? 'diagram--active-hotspot' : ''
						} diagram--hotspot-circle`}
						tabIndex="0"
						onFocus={() => this.hoverItem('client-app')}
						onBlur={() => this.mouseOutItem('client-app')}
						onMouseOver={() => this.hoverItem('client-app')}
						onMouseOut={() => this.mouseOutItem('client-app')}
						strokeDashoffset="800"
						strokeDasharray="800"
					/>
					<circle
						aria-label={translate('diagram_op_tools')}
						fill="#0062ff"
						cx="960"
						cy="130"
						r="8"
						className={`${
							this.props.activeItem === 'app-console' || this.props.activeTextItem === 'app-console' ? 'diagram--active-hotspot' : ''
						} diagram--hotspot-circle`}
						tabIndex="0"
						onFocus={() => this.hoverItem('app-console')}
						onBlur={() => this.mouseOutItem('app-console')}
						onMouseOver={() => this.hoverItem('app-console')}
						onMouseOut={() => this.mouseOutItem('app-console')}
						strokeDashoffset="800"
						strokeDasharray="800"
					/>
					<circle
						aria-label={translate('diagram_fabric_layer')}
						fill="#0062ff"
						cx="410"
						cy="170"
						r="8"
						className={`${
							this.props.activeItem === 'infraLid' || this.props.activeTextItem === 'infraLid' ? 'diagram--active-hotspot' : ''
						} diagram--hotspot-circle`}
						tabIndex="0"
						onFocus={() => this.hoverItem('infraLid')}
						onBlur={() => this.mouseOutItem('infraLid')}
						onMouseOver={() => this.hoverItem('infraLid')}
						onMouseOut={() => this.mouseOutItem('infraLid')}
						strokeDashoffset="800"
						strokeDasharray="800"
					/>
					<circle
						aria-label={translate('diagram_multicloud')}
						fill="#0062ff"
						cx="290"
						cy="510"
						r="8"
						className={`${
							this.props.activeItem === 'multiCloud' || this.props.activeTextItem === 'multiCloud' ? 'diagram--active-hotspot' : ''
						} diagram--hotspot-circle`}
						tabIndex="0"
						onFocus={() => this.hoverItem('multiCloud')}
						onBlur={() => this.mouseOutItem('multiCloud')}
						onMouseOver={() => this.hoverItem('multiCloud')}
						onMouseOut={() => this.mouseOutItem('multiCloud')}
						strokeDashoffset="800"
						strokeDasharray="800"
					/>
					<circle
						aria-label={translate('diagram_infra_layer')}
						fill="#0062ff"
						cx="752"
						cy="400"
						r="8"
						className={`${this.props.activeItem === 'infra' || this.props.activeTextItem === 'infra' ? 'diagram--active-hotspot' : ''} diagram--hotspot-circle`}
						tabIndex="0"
						onFocus={() => this.hoverItem('infra')}
						onBlur={() => this.mouseOutItem('infra')}
						onMouseOver={() => this.hoverItem('infra')}
						onMouseOut={() => this.mouseOutItem('infra')}
						strokeDashoffset="800"
						strokeDasharray="800"
					/>
					{this.props.activeItem === 'infra' && (
						<foreignObject x="600"
							y="200"
							className="diagram--text-container diagram--text-box"
							width="500"
							height="200"
						>
							<div className="diagram--text-container-inner">
								<p className="diagram--text-header">{translate('diagram_infra_layer')}</p>
								<p className="diagram--text">{translate('diagram_infra_layer_desc')}</p>
							</div>
						</foreignObject>
					)}
					{this.props.activeItem === 'infraLid' && (
						<foreignObject x="430"
							y="0"
							className="diagram--text-container diagram--text-box diagram--text-box-long"
							width="500"
							height="162"
						>
							<div className="diagram--text-container-inner">
								<p className="diagram--text-header">{translate('diagram_fabric_layer')}</p>
								<p className="diagram--text">{translate('diagram_fabric_layer_desc')}</p>
							</div>
						</foreignObject>
					)}
					{this.props.activeItem === 'app-console' && (
						<foreignObject x="420"
							y="100"
							width="500"
							height="162"
							className="diagram--text-container diagram--text-box diagram--text-box-long"
						>
							<div className="diagram--text-container-inner">
								<p className="diagram--text-header">{translate('diagram_op_tools')}</p>
								<p className="diagram--text">{translate('diagram_op_tools_desc')}</p>
							</div>
						</foreignObject>
					)}
					{this.props.activeItem === 'client-app' && (
						<foreignObject
							x="200"
							y="0"
							width="500"
							height="200"
							className="diagram--text-container diagram--text-box diagram--text-box-long diagram--text-box-taller"
						>
							<div className="diagram--text-container-inner">
								<p className="diagram--text-header">{translate('diagram_client_app')}</p>
								<p className="diagram--text">{translate('diagram_client_app_desc')}</p>
							</div>
						</foreignObject>
					)}
					{this.props.activeItem === 'vscode' && (
						<foreignObject x="260"
							y="0"
							width="500"
							height="162"
							className="diagram--text-container diagram--text-box diagram--text-box-long"
						>
							<div className="diagram--text-container-inner">
								<p className="diagram--text-header">{translate('diagram_vscode')}</p>
								<p className="diagram--text">{translate('diagram_vscode_desc')}</p>
							</div>
						</foreignObject>
					)}
					{this.props.activeItem === 'multiCloud' && (
						<foreignObject width="500"
							height="200"
							x="310"
							y="320"
							className="diagram--text-container diagram--text-box diagram--text-box-multi-cloud"
						>
							<div className="diagram--text-container-inner">
								<p className="diagram--text-header">{translate('diagram_multicloud')}</p>
								<p className="diagram--text">{translate('diagram_multicloud_desc')}</p>
							</div>
						</foreignObject>
					)}
				</svg>
			</div>
		);
	}
}

const dataProps = {
	activeItem: PropTypes.string,
	activeTextItem: PropTypes.string,
};

EcosystemDiagram.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(EcosystemDiagram));
