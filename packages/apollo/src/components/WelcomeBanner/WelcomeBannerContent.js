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
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import apiIcon from '../../assets/images/api_fill.svg';
import archDiagram from '../../assets/images/arch_diagram_icon.svg';
import buildIcon from '../../assets/images/buildIcon.svg';
import deploySMIcon from '../../assets/images/deploySMIcon.svg';
import developSCIcon from '../../assets/images/developSCIcon.svg';
import governanceIcon from '../../assets/images/getting_started_governance.svg';
import growNetworkIcon from '../../assets/images/getting_started_grownetwork.svg';
import growResourcesIcon from '../../assets/images/getting_started_growresources.svg';
import joinIcon from '../../assets/images/joinIcon.svg';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import { setInStorage } from '../../utils/localStorage';
import SVGs from '../Svgs/Svgs';
import WelcomeBanner from './WelcomeBanner';
import WelcomeBannerGroup from './WelcomeBannerGroup';
import WelcomeBannerTile from './WelcomeBannerTile';

const SCOPE = 'welcomeBannerContent';

class WelcomeBannerContent extends Component {
	componentDidUpdate(prevProps) {
		if (prevProps.closeWelcome !== this.props.closeWelcome) {
			this.welcomeBanner.closeWelcome();
			this.props.onClose();
		}
	}

	openDocLink = (event, type, translate) => {
		if (type === 'build') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('build_network_hlfoc', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('_LINK2', { DOC_PREFIX: this.props.docPrefix }));
			}
		} else if (type === 'arch_hlfoc') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('hlfoc_arch', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				this.showDiagram();
			}
		} else if (type === 'join') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('join_network_hlfoc', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('1joinDocs', { DOC_PREFIX: this.props.docPrefix }));
			}
		} else if (type === 'developSm') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('develop_vs_code_link2', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('develop_vs_code_link', { DOC_PREFIX: this.props.docPrefix }));
			}
		} else if (type === 'deploySm') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('deploy_sm_hlfoc', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('2deployDocs', { DOC_PREFIX: this.props.docPrefix }));
			}
		} else if (type === 'goFurther') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('api_doc_hlfoc', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('api_docs_link'));
			}
		} else if (type === 'channelDocs') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('channel_doc_hlfoc', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('channelDocs', { DOC_PREFIX: this.props.docPrefix }));
			}
		} else if (type === 'growDocs') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('build_network_hlfoc', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('growDocs', { DOC_PREFIX: this.props.docPrefix }));
			}
		} else if (type === 'growResourcesDocs') {
			if (this.props.console_type === 'hlfoc') {
				window.open(translate('build_network_hlfoc', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('growResourcesDocs', { DOC_PREFIX: this.props.docPrefix }));
			}
		} else if (type === 'video') {
			event.stopPropagation();
			window.open('http://ibm.biz/BlockchainPlatformSeries2');
		}
	};

	onKeyPressDocLink = (event, type, translate) => {
		if (event.key === 'Enter') {
			return this.openDocLink(event, type, translate);
		}
		return;
	};

	showDiagram = (page) => {
		setInStorage('showDiagram', true);
		this.welcomeBanner.closeWelcome();
		this.props.onClose();
	};

	render() {
		let overlayClassName = '';
		if (this.props.isOpening) {
			overlayClassName = 'welcome--banner-transitioning--out';
		}
		const translate = this.props.t;
		return (
			<WelcomeBanner closed={this.props.onClose} ref={(welcomeBanner) => (this.welcomeBanner = welcomeBanner)}>
				<>
					<div className="ibp-welcome-banner-content">
						<div className="ibp-welcome-banner-row">
							<WelcomeBannerGroup header={translate('understand')} className="ibp-welcome-group-understand">
								<WelcomeBannerTile
									description={translate('arch_desc')}
									header={translate('typical_arch')}
									internalLink
									mainTileIcon={archDiagram}
									tileClick={(event) => this.openDocLink(event, 'arch_hlfoc', translate)}
								/>
							</WelcomeBannerGroup>
							<WelcomeBannerGroup header={translate('build')}>
								<WelcomeBannerTile
									description={translate('develop_sm_desc')}
									header={translate('develop_sm')}
									mainTileIcon={developSCIcon}
									tileClick={(event) => this.openDocLink(event, 'developSm', translate)}
								/>
								<WelcomeBannerTile
									description={translate('build_network_desc')}
									header={translate('build_network')}
									linkText={translate('watch_video_en')}
									mainTileIcon={buildIcon}
									tileClick={(event) => this.openDocLink(event, 'build', translate)}
									tileKeyPress={(event) => this.onKeyPressDocLink(event, 'build', translate)}
									videoLinkClick={(event) => this.openDocLink(event, 'video')}
									videoTile
								/>
								<WelcomeBannerTile
									description={translate('join_network_desc')}
									header={translate('join_network')}
									mainTileIcon={joinIcon}
									tileClick={(event) => this.openDocLink(event, 'join', translate)}
								/>
								<WelcomeBannerTile
									description={translate('deploy_sm_desc')}
									header={translate('deploy_sm')}
									mainTileIcon={deploySMIcon}
									tileClick={(event) => this.openDocLink(event, 'deploySm', translate)}
								/>
							</WelcomeBannerGroup>
						</div>
						<div className="ibp-welcome-banner-row">
							<WelcomeBannerGroup header={translate('operate_and_govern')}>
								<WelcomeBannerTile
									description={translate('getting_started_channel_docs_desc')}
									header={translate('getting_started_channel_docs_title')}
									mainTileIcon={governanceIcon}
									tileClick={(event) => this.openDocLink(event, 'channelDocs', translate)}
								/>
								<WelcomeBannerTile
									description={translate('api_doc_desc')}
									header={translate('api_doc_header')}
									mainTileIcon={apiIcon}
									tileClick={(event) => this.openDocLink(event, 'goFurther', translate)}
								/>
							</WelcomeBannerGroup>
						</div>
						<div className="ibp-welcome-banner-row">
							<WelcomeBannerGroup header={translate('grow')}>
								<WelcomeBannerTile
									description={translate('getting_started_grow_desc')}
									header={translate('getting_started_grow_title')}
									mainTileIcon={growNetworkIcon}
									tileClick={(event) => this.openDocLink(event, 'growDocs', translate)}
								/>
								<WelcomeBannerTile
									description={translate('getting_started_grow_resources_desc')}
									header={translate('getting_started_grow_resources_title')}
									mainTileIcon={growResourcesIcon}
									tileClick={(event) => this.openDocLink(event, 'growResourcesDocs', translate)}
								/>
							</WelcomeBannerGroup>
						</div>
					</div>
					<div className="ibp-welcome-button-container">
						<button
							className="ibp-welcome-banner-close-button"
							onClick={this.props.onClose}
							aria-label="Close welcome banner"
							aria-labelledby="ibp-getting-started-button-label"
						>
							<span id="ibp-getting-started-button-label" hidden>
								{translate('close_get_started_menu')}
							</span>
							<SVGs type="arrowUp" extendClass={{ 'ibp-arrow-up': true }} />
						</button>
					</div>
					{!this.props.isClosing && !this.props.isClosed && <div onClick={this.props.onClose} className={`welcome-banner-overlay ${overlayClassName}`} />}
				</>
			</WelcomeBanner>
		);
	}
}

const dataProps = {
	docsUrl: PropTypes.string,
	closeWelcome: PropTypes.bool,
	isClosing: PropTypes.bool,
	isClosed: PropTypes.bool,
	isOpening: PropTypes.bool,
	console_type: PropTypes.string,
};

WelcomeBannerContent.propTypes = {
	...dataProps,
	onClose: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	(state) => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		newProps['bmixUrl'] = state['settings'] ? state['settings']['bmixUrl'] : null;
		newProps['showDiagram'] = state['main'] ? state['main']['showDiagram'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['console_type'] = state['settings'] ? state['settings']['console_type'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(WelcomeBannerContent));
