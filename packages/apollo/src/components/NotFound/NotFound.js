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
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import NotFoundImg from '../../assets/images/404_illustration.svg';
import Helper from '../../utils/helper';

const SCOPE = 'notFound';

export class NotFound extends Component {
	openDocs = translate => {
		window.open(translate('_404DOCLINK', { DOC_PREFIX: this.props.docPrefix }));
	};

	render() {
		const translate = this.props.translate;
		return (
			<section className="not-found-container">
				<div className="ibp-404-content-container">
					<h2 className="ibp-404-header">{translate('404')}</h2>
					<h2 className="ibp-404-header">{translate('404_desc_1')}</h2>
					<p className="ibp-404-desc">{translate('404_desc_2')}</p>
					<div className="ibp-404-help-links">
						<Link to="/nodes"
							className="ibp-link ibp-404-link"
						>
							{translate('view_nodes')}
						</Link>

						<Link to="/channels"
							className="ibp-link ibp-404-link"
						>
							{translate('view_channels')}
						</Link>

						<Link to="/smart-contracts"
							className="ibp-link ibp-404-link"
						>
							{translate('view_chaincode')}
						</Link>
					</div>
				</div>
				<div className="ibp-404-illustration-container">
					<NotFoundImg
						alt="Not found illustration"
						className="ibp-not-found-illustration-img"
					/>
				</div>
			</section>
		);
	}
}

const dataProps = {
	docPrefix: PropTypes.string,
};

NotFound.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(state => {
	let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
	newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
	newProps['platform'] = state['settings'].platform;
	return newProps;
}, null)(withLocalize(NotFound));
