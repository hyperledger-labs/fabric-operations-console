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
import { showBreadcrumb, updateState } from '../../redux/commonActions';
import { SkeletonText } from 'carbon-components-react';
import Helper from '../../utils/helper';
import PageContainer from '../PageContainer/PageContainer';
//import Logger from '../Log/Logger';
import PageHeader from '../PageHeader/PageHeader';
const SCOPE = 'AuditLogs';
//const Log = new Logger(SCOPE);

class AuditLogs extends Component {
	debounce = null;
	monitorInterval = null;

	async componentDidMount() {
		this.props.showBreadcrumb('settings', {}, this.props.history.location.pathname, true);
		this.props.updateState(SCOPE, {
			loading: true,
		});

		setTimeout(() => {
			this.props.updateState(SCOPE, {
				loading: false,
			});
		}, 500);
	}

	// --------------------------------------------------------------------------
	// Main Migration Content
	// --------------------------------------------------------------------------
	render() {
		//const translate = this.props.translate;

		return (
			<PageContainer>
				<div className="bx--row migrationPanel">
					<div className="bx--col-lg-13">
						<PageHeader
							history={this.props.history}
							headerName="audit_logs"
							staticHeader
						/>

						{this.props.loading &&
							<div>
								<SkeletonText
									style={{
										paddingTop: '.5rem',
										width: '8rem',
										height: '1rem',
									}}
								/>
								<SkeletonText />
							</div>
						}

						{!this.props.loading &&
							<div>
								<h3>Coming soon</h3>
							</div>
						}
					</div>
				</div >
			</PageContainer >
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	settings: PropTypes.object,
	errorMsg: PropTypes.string,
};

AuditLogs.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func,
	history: PropTypes.object,
};

export default connect(state => {
	return Helper.mapStateToProps(state[SCOPE], dataProps);
}, {
	updateState,
	showBreadcrumb
})(withLocalize(AuditLogs));
