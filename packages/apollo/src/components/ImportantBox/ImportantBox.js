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
import { connect } from 'react-redux';
import { withTranslation, Trans } from 'react-i18next';

class ImportantBox extends Component {
	render() {
		const translate = this.props.t;
		return (
			<div
				className={`ibp-important-box-container
						${this.props.kind === 'informational' ? 'ibp-important-box-container-informational' : ''}
						${this.props.kind === 'strict' ? 'ibp-important-box-container-strict' : ''}
					`}
			>
				<p className="ibp-important-label">{translate('important')}</p>
				<div className="ibp-important-box">
					<p className="ibp-important-text">
						<Trans>{this.props.text && translate(this.props.text, this.props.opts)}</Trans>
						{this.props.link && (
							<a
								href={translate(this.props.link, { DOC_PREFIX: this.props.docPrefix })}
								target="_blank"
								rel="noopener noreferrer"
								className="tl-link ibp-important-link"
							>
								{translate('find_out_more')}
							</a>
						)}
						{this.props.data}
					</p>
				</div>
			</div>
		);
	}
}

ImportantBox.propTypes = {
	text: PropTypes.string,
	opts: PropTypes.object,
	link: PropTypes.string,
	data: PropTypes.any,
	docPrefix: PropTypes.string,
	kind: PropTypes.oneOf(['informational', 'strict']),
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(state => {
	return {
		docPrefix: state['settings'] ? state['settings']['docPrefix'] : null,
	};
})(withTranslation()(ImportantBox));
