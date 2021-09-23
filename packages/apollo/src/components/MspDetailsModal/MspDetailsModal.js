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
import { Button, Loading, TextInput } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';

const SCOPE = 'mspDetails';
const Log = new Logger(SCOPE);

class MspDetailsModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			display_name: this.props.msp.display_name,
			admins: this.props.msp.admins,
			rootCerts: this.props.msp.root_certs,
			msp_id: this.props.msp.msp_id,
			error: null,
			update: true,
			loading: false,
			remove: false,
		});
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			display_name: null,
			admins: [],
			rootCerts: [],
			msp_id: null,
		});
	}

	exportMsp = () => {
		Log.debug('Exporting MSP :', this.props.msp);
		Helper.exportNode(this.props.msp);
	};

	updateMsp = () => {};

	getButtons(translate) {
		return [
			{
				id: 'close',
				text: translate('close'),
			},
			{
				id: 'update',
				text: translate('update'),
				onClick: this.updateMsp,
				disabled: !this.props.update,
			},
		];
	}

	renderRootCerts = translate => {
		return (
			<div>
				<p className="ibp-msp-labels">{translate('root_certs')}</p>
				{this.props.rootCerts && (
					<div>
						{this.props.rootCerts.map((rootCert, i) => {
							return (
								<div key={'rootCert_' + i}
									className="ibp-msp-row"
								>
									<div className="ibp-msp-input">
										<TextInput id={'ibp-root-cert-' + i}
											className="ibp__text-input"
											value={rootCert}
											disabled
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	renderAdminCerts = translate => {
		return (
			<div>
				<p className="ibp-msp-labels">{translate('admins')}</p>
				{this.props.admins && (
					<div>
						{this.props.admins.map((admin, i) => {
							return (
								<div key={'rootCert_' + i}
									className="ibp-msp-row"
								>
									<div className="ibp-msp-input">
										<TextInput id={'ibp-admin-cert-' + i}
											className="ibp__text-input"
											value={admin}
											disabled
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	renderDetails(translate) {
		return (
			<div className={this.props.remove ? 'ibp-hidden' : ''}>
				<div className="ibp-modal-title">
					<h1 className="ibm-light">{translate('msp_details')}</h1>
				</div>
				<Form
					scope={SCOPE}
					id={SCOPE}
					fields={[
						{
							name: 'display_name',
							label: 'name',
							placeholder: 'name_placeholder',
							required: true,
							default: this.props.display_name,
							disabled: true,
							specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
						},
						{
							name: 'msp_id',
							required: true,
							default: this.props.msp_id,
							disabled: true,
							specialRules: Helper.SPECIAL_RULES_MSP_ID,
						},
					]}
					onChange={(data, valid) => {
						this.props.updateState(SCOPE, {
							update: valid,
						});
					}}
				/>
				{this.renderRootCerts(translate)}
				{this.renderAdminCerts(translate)}
				<p className="ibp-actions-title">{translate('actions')}</p>
				<div>
					<Button id="export"
						kind="secondary"
						className="ibp-msp-action"
						onClick={this.exportMsp}
					>
						{translate('export_msp')}
					</Button>
				</div>
			</div>
		);
	}

	render() {
		const translate = this.props.translate;
		return (
			<SidePanel
				id="mspModal"
				closed={this.props.onClose}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={this.getButtons(translate)}
				error={this.props.error}
			>
				{this.props.loading && (
					<div style={{ position: 'relative' }}>
						<Loading withOverlay={false} />
					</div>
				)}
				{this.renderDetails(translate)}
			</SidePanel>
		);
	}
}

const dataProps = {
	display_name: PropTypes.string,
	msp_id: PropTypes.string,
	admins: PropTypes.array,
	rootCerts: PropTypes.array,
	error: PropTypes.string,
	loading: PropTypes.bool,
	remove: PropTypes.bool,
	disableRemove: PropTypes.bool,
	confirm_msp_name: PropTypes.string,
	update: PropTypes.bool,
};

MspDetailsModal.propTypes = {
	...dataProps,
	msp: PropTypes.object,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
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
)(withLocalize(MspDetailsModal));
