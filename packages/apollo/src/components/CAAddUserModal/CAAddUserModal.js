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
import { Checkbox } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import { EventsRestApi } from '../../rest/EventsRestApi';

const SCOPE = 'addUser';
const Log = new Logger(SCOPE);

export class CAAddUserModal extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			enrollValid: false,
			attributesValid: true,
			rootAffil: true,
		});
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			disableSubmit: true,
			affiliation: this.props.affiliations.length ? this.props.affiliations[0] : null,
		});
	}

	onSubmit = () => {
		return new Promise((resolve, reject) => {
			let affiliation = this.props.affiliation;
			if (this.props.affiliations.length && !affiliation) {
				affiliation = this.props.affiliations[0];
			}
			if (this.props.rootAffil) {
				affiliation = '';
			}
			const attrs = [];
			if (this.props.attributes) {
				this.props.attributes.forEach(attr => {
					if (attr.name) {
						attrs.push({
							name: attr.name,
							value: attr.value,
							ecert: true,
						});
					}
				});
			}
			const data = {
				new_enroll_id: this.props.enroll_id,
				new_enroll_secret: this.props.enroll_secret,
				type: this.props.type,
				affiliation: affiliation.name !== undefined ? affiliation.name : affiliation,
				max_enrollments: this.props.max_enrollments ? this.props.max_enrollments : -1,
				attrs,
			};
			CertificateAuthorityRestApi.addUser(this.props.ca, data)
				.then(() => {
					EventsRestApi.sendRegisterUserEvent(this.props.enroll_id, this.props.ca);
					CertificateAuthorityRestApi.getUsers(this.props.ca)
						.then(users => {
							this.props.onComplete(users);
							resolve();
						})
						.catch(error => {
							Log.error(error);
							reject({
								title: 'error_ca_add_user',
								details: error && error.msg ? error.msg : error,
							});
						});
				})
				.catch(error => {
					Log.error(error);
					EventsRestApi.sendRegisterUserEvent(this.props.enroll_id, this.props.ca, 'error');
					let message = _.get(error, 'msg.msg');
					let message_key = 'error_ca_add_user';
					if (message && message.indexOf('already registered') !== -1) {
						message_key = 'duplicate_user_not_allowed';
					}
					reject({
						title: message_key,
						details: error && error.msg ? error.msg : error,
					});
				});
		});
	};

	renderEnrollIdAndSecret(translate) {
		return (
			<WizardStep type="WizardStep"
				disableSubmit={!this.props.enrollValid}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-enrollUser'}
					fields={[
						{
							name: 'enroll_id',
							tooltip: 'add_user_enroll_id_tooltip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
						},
						{
							name: 'enroll_secret',
							type: 'password',
							tooltip: 'add_user_enroll_secret_tooltip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
						},
					]}
					onChange={(data, valid) => {
						this.props.updateState(SCOPE, { enrollValid: valid });
					}}
				/>
				<hr />
				<Form
					scope={SCOPE}
					id={SCOPE}
					fields={[
						{
							name: 'type',
							tooltip: 'register_user_type_tooltip',
							type: 'dropdown',
							options: ['client', 'admin', 'peer', 'orderer'],
						},
					]}
				/>
				{this.props.affiliations.length !== 0 && (
					<div className="ibp-affiliation-form">
						<div className="ibp-add-users-root-check">
							<Checkbox
								className="ibp-root-check-label"
								id="root-affiliation"
								labelText={translate('use_root_affil')}
								onChange={() => {
									this.props.updateState(SCOPE, {
										rootAffil: !this.props.rootAffil,
									});
								}}
								checked={this.props.rootAffil}
							/>
							<BlockchainTooltip withCheckbox>{translate('root_check_tooltip')}</BlockchainTooltip>
						</div>
						{!this.props.rootAffil && (
							<Form
								scope={SCOPE}
								id={SCOPE + '-affiliation'}
								fields={[
									{
										name: 'affiliation',
										tooltip: 'register_user_affiliation_tooltip',
										type: this.props.affiliations.length ? 'dropdown' : undefined,
										options: this.props.affiliations.length ? this.props.affiliations : undefined,
										required: this.props.affiliations.length ? undefined : true,
										disabled: this.props.rootAffil,
									},
								]}
							/>
						)}
					</div>
				)}
				<hr />
				<Form
					scope={SCOPE}
					id={SCOPE + '-max_enrollments'}
					fields={[
						{
							name: 'max_enrollments',
							tooltip: 'add_user_max_enrollment_tooltip',
							type: 'number',
							min: 1,
							step: 1,
							specialRules: Helper.SPECIAL_RULES_POSITIVE_INT,
						},
					]}
				/>
			</WizardStep>
		);
	}

	renderAttributes(translate) {
		return (
			<WizardStep type="WizardStep"
				disableSubmit={!this.props.attributesValid}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-attrs'}
					fields={[
						{
							name: 'attributes',
							tooltip: 'attributes_tooltip',
							tooltipDirection: 'bottom',
							type: 'namevaluepairs',
							default: [],
							addText: 'add_attribute',
						},
					]}
					onChange={(data, valid) => {
						this.props.updateState(SCOPE, { attributesValid: valid });
					}}
				/>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard title="register_user"
				onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				submitButtonLabel={translate('register_user')}
			>
				{this.renderEnrollIdAndSecret(translate)}
				{this.renderAttributes(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	ca: PropTypes.object,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	type: PropTypes.string,
	affiliation: PropTypes.any,
	max_enrollments: PropTypes.string,
	error: PropTypes.string,
	affiliations: PropTypes.array,
	attributes: PropTypes.array,
	attributesValid: PropTypes.bool,
	enrollValid: PropTypes.bool,
	rootAffil: PropTypes.bool,
};

CAAddUserModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(CAAddUserModal));
