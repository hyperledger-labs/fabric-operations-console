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
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import SidePanel from '../SidePanel/SidePanel';

const SCOPE = 'userDetails';
const ignoreList = ['hf.EnrollmentID', 'hf.Type', 'hf.Affiliation'];

class UserDetailsModal extends Component {
	render() {
		const fields = [
			{
				name: 'type',
				default: this.props.user.type,
				readonly: true,
				tooltip: 'register_user_type_tooltip',
				tooltipDirection: 'bottom',
			},
			{
				name: 'affiliation',
				default: this.props.user.affiliation,
				readonly: true,
				tooltip: 'register_user_affiliation_tooltip',
			},
			{
				name: 'max_enrollments',
				default: this.props.user.max_enrollments,
				readonly: true,
				tooltip: 'add_user_max_enrollment_tooltip',
			},
		];
		const attrs = [];
		this.props.user.attrs.forEach(a => {
			if (ignoreList.indexOf(a.name) === -1) {
				attrs.push(a);
			}
		});
		if (attrs.length) {
			fields.push({
				name: 'attributes',
				type: 'namevaluepairs',
				tooltip: 'attributes_tooltip',
				default: attrs,
				readonly: true,
			});
		}
		const translate = this.props.translate;
		return (
			<SidePanel
				id={SCOPE}
				buttons={[
					{
						id: 'close',
						text: translate('close'),
					},
				]}
				closed={this.props.onClose}
			>
				<div className="ibp-modal-title">
					<h1 className="ibm-light">{this.props.user.id}</h1>
				</div>
				<div>
					<Form scope={SCOPE}
						id={SCOPE}
						fields={fields}
					/>
				</div>
			</SidePanel>
		);
	}
}

const dataProps = {
	user: PropTypes.object,
};

UserDetailsModal.propTypes = {
	...dataProps,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(state => {
	return Helper.mapStateToProps(state[SCOPE], dataProps);
})(withLocalize(UserDetailsModal));
