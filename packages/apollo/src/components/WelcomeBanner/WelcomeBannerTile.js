/*
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
import launch from '../../assets/images/launch.svg';

const WelcomeBannerTile = props => {
	return (
		<button
			onClick={props.tileClick}
			className="ibp-welcome-tile-item"
			aria-label={`${props.header} ${props.description} ${props.videoTile ? props.linkText : ''}`}
		>
			<img src={props.mainTileIcon}
				alt="Architechture icon"
			/>
			<h4 className="ibp-welcome-tile-header">{props.header}</h4>
			<p>{props.description}</p>
			{props.videoTile && (
				<button className="ibp-welcome-banner-video-link"
					onClick={props.videoLinkClick}
					aria-label={props.linkText}
				>
					{props.linkText}
				</button>
			)}
			{!props.internalLink && <img src={launch}
				alt="Launch icon"
				className="ibp-welcome-tile-launch-icon"
			/>}
		</button>
	);
};

WelcomeBannerTile.propTypes = {
	description: PropTypes.string,
	header: PropTypes.string,
	internalLink: PropTypes.bool,
	linkText: PropTypes.string,
	mainTileIcon: PropTypes.string,
	tileClick: PropTypes.func,
	tileKeyPress: PropTypes.func,
	videoLinkClick: PropTypes.func,
	videoTile: PropTypes.bool,
};

export default WelcomeBannerTile;
