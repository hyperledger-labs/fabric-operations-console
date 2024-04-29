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
import _ from 'lodash';
import { InlineNotification } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';
import Helper from '../../utils/helper';
import { withTranslation } from 'react-i18next';

export class SidePanelError extends React.Component {
	componentDidMount() {
		this.showDetails = false;
	}

	getErrorTitle() {
		const error = this.props.error;
		const translate = this.props.t;
		// Support translated errors
		if (error instanceof Error && error.translation) {
			const translation = error.translation;
			if (!translation.title) return translate('error_unexpected');
			return translate(translation.title, translation.params);
		}

		// fallback to the old style of error processing
		if (_.isString(error)) {
			return error;
		}
		if (error.title) {
			return translate(error.title, error.translateOptions);
		}
		return JSON.stringify(error);
	}

	getSubtitle() {
		const error = this.props.error;
		const translate = this.props.t;
		if (error instanceof Error && error.translation && error.translation.message && error.translation.params) {
			return translate(error.translation.message, error.translation.params);
		}
		if (error.subtitle) {
			return translate(error.subtitle, error.translateOptions);
		}
	}

	render() {
		if (!this.props.error) {
			return <div />;
		}

		const translate = this.props.t;
		const title = this.getErrorTitle();
		const subtitle = this.getSubtitle();
		let details;
		// If we're using the old, {title, details} error object, just pass the details through
		if (this.props.error && this.props.error.details) details = Helper.formatErrorDetails(this.props.error.details, translate);
		else details = Helper.formatErrorDetails(this.props.error, translate);

		return (
			<div className="ibp-side-panel-error">
				<InlineNotification
					kind="error"
					title={title}
					hideCloseButton={true}
					subtitle={
						<div>
							{subtitle}
							{this.props.error && this.props.error.link && this.props.error.link.href && this.props.error.link.name && (
								<a
									href={translate(this.props.error.link.href)}
									target="_blank"
									rel="noopener noreferrer"
									className="ibp-break-error-link"
								>
									{translate(this.props.error.link.name)}
								</a>
							)}
							{details ? (
								<div>
									<div>
										<button
											id="toggleErrorDetails"
											className="ibp-link"
											onClick={() => {
												this.showDetails = !this.showDetails;
												this.forceUpdate();
											}}
										>
											{translate(this.showDetails ? 'hide_details' : 'show_details')}
										</button>
									</div>
									{this.showDetails && <div className="ibp-side-panel-error-details">{details}</div>}
								</div>
							) : (
								''
							)}
						</div>
					}
				/>
			</div>
		);
	}
}

SidePanelError.propTypes = {
	error: PropTypes.any,
	t: PropTypes.func, // Provided by withTranslation()
};

export default withTranslation()(SidePanelError);
