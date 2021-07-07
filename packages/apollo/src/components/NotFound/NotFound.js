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
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import notFound from '../../assets/images/404_illustration.svg';
import Helper from '../../utils/helper';

const SCOPE = 'notFound';

export class NotFound extends Component {
	openDocs = translate => {
		window.open(translate('_404DOCLINK', { DOC_PREFIX: this.props.docPrefix }));
	};

	getSupportURL() {
		let supportURL = 'https://cloud.ibm.com/unifiedsupport/supportcenter';
		if (this.props.platform && this.props.platform !== 'ibmcloud') {
			supportURL = 'https://www.ibm.com/mysupport';
		}
		return supportURL;
	}

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
							{translate('nodes')}
						</Link>
						<button onClick={() => this.openDocs(translate)}
							className="ibp-link ibp-button-link ibp-404-link"
						>
							<span>{translate('documentation')}</span>
						</button>
						<a className="ibp-link ibp-404-link"
							href={this.getSupportURL()}
							rel="noopener noreferrer"
							target="_blank"
						>
							<span>{translate('contact_support')}</span>
						</a>
					</div>
				</div>
				<div className="ibp-404-illustration-container">
					<img src={notFound}
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
