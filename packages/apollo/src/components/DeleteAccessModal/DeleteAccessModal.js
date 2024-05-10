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
import { clearNotifications, showError, updateState } from '../../redux/commonActions';
import ConfigureAuthApi from '../../rest/ConfigureAuthApi';
import Helper from '../../utils/helper';
import SidePanel from '../SidePanel/SidePanel';

const SCOPE = 'addUsers';

export class DeleteAccessModal extends Component {
	cName = 'DeleteAccessModal';

	componentDidMount() {
		this.props.updateState(SCOPE, {
			submitting: false,
			error: null
		});
	}


	// the delete confirmation button was clicked
	onDelete = async () => {

		// deleting an api key
		if (this.props.modalType === 'apikey') {
			this.props.updateState(SCOPE, {
				submitting: true,
			});
			const apikeys = this.props.deleteArr;
			const errors = [];
			const del_keys = [];

			for (let i in apikeys) {				// iter on each key
				try {
					await ConfigureAuthApi.deleteApiKey(apikeys[i].api_key);
					del_keys.push(apikeys[i].api_key);
				} catch (e) {
					console.error('unable to remove apikey, error:', e);
					errors.push(JSON.stringify(e));
				}
			}
			this.props.updateState(SCOPE, {
				submitting: false,
			});

			if (errors.length === 0) {
				this.sidePanel.closeSidePanel();
				this.props.onComplete(del_keys);
			} else {
				this.props.updateState(SCOPE, {
					submitting: false,
					error: { title: 'Unable to remove  ' + errors.length + ' API key(s)', details: errors.join('\n') },
				});
			}
		}

		// deleting a user
		else {
			const users = this.props.deleteArr;
			let body = { uuids: users.map(user => `"${user.uuid}"`) };
			const emails = users.map(x => {
				if (x.email) { return x.email; }
			});


			try {
				this.props.updateState(SCOPE, {
					submitting: true,
				});
				const resp = await ConfigureAuthApi.deleteUsers(body);
				if (resp && resp.message === 'ok') {
					this.props.updateState(SCOPE, {
						submitting: false,
					});
					this.sidePanel.closeSidePanel();
					this.props.onComplete(emails);
				} else {
					console.error('unable to remove user, error response:', resp);
					throw resp ? resp.message : 'failed';
				}
			} catch (e) {
				console.error('unable to remove user, error:', e);
				this.props.updateState(SCOPE, {
					submitting: false,
					error: { title: 'Unable to remove user(s)', details: e },
				});
			}
		}
	};

	render = () => {
		const translate = this.props.t;
		return (
			<div>
				<SidePanel
					id="delete-access"
					closed={this.props.onClose}
					ref={sidePanel => (this.sidePanel = sidePanel)}
					buttons={[
						{
							id: 'cancel',
							text: translate('cancel'),
						},
						{
							id: 'delete',
							text: translate('delete_confirmation'),
							onClick: this.onDelete,
							type: 'submit',
							disabled: this.props.error ? true : false,
						},
					]}
					error={this.props.error}
					submitting={this.props.submitting}
				>
					<div>
						<h1 className="ibp-auth-settings-modal-title">{
							translate('delete_access')}
						</h1>
						<br />
						<br />
						<p>{translate(this.props.modalType === 'apikey' ? 'delete_key_desc' : 'delete_user_desc')}</p>
						<br />
						<br />
						<p>{translate(this.props.modalType === 'apikey' ? 'delete_key_summary_desc' : 'delete_user_summary_desc', { count: this.props.deleteArr.length })}</p>

						<hr />

						{/* render the users/keys we are deleting*/}
						{this.props.deleteArr.map((element, i) => (
							<div key={element.id}>
								{this.props.modalType === 'apikey' &&
									Helper.renderFieldSummary(translate, element, 'name', 'description')}
								{this.props.modalType === 'apikey' &&
									Helper.renderFieldSummary(translate, element, 'apikey_label', 'api_key')}
								{this.props.modalType !== 'apikey' &&
									Helper.renderFieldSummary(translate, element, 'userEmail', 'id')}
								<hr />
							</div>
						))}
					</div>
				</SidePanel>
			</div>
		);
	};
}

const dataProps = {
	submitting: PropTypes.bool,
	error: PropTypes.object,
	deleteArr: PropTypes.array,
	modalType: PropTypes.string,
};

DeleteAccessModal.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	showError: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		clearNotifications,
		showError,
		updateState,
	}
)(withTranslation()(DeleteAccessModal));
