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
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
//import SkeletonPlaceholder from 'carbon-components-react/lib/components/SkeletonPlaceholder';
//import { Tab, Tabs } from 'carbon-components-react';
const SCOPE = 'MigrationPage';
//const Log = new Logger(SCOPE);

class MigrationPage extends Component {
	componentDidMount() {
		/*this.props.updateState(SCOPE, {
			showCertNotice: false,
			createdArr: null,
		});*/
	}

	// open/close the info section of a twisty, also update twisty icon
	toggleInfo = () => {
		// todo
	}

	render() {
		const translate = this.props.translate;
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-13 migrationPanel">
						<PageHeader
							history={this.props.history}
							headerName={translate('migration_header')}
						/>
						<div className="twistyWrapper"
							onClick={this.toggleInfo()}
						>
							<div className="twistyTitle">
								&gt; Info
							</div>

							<div className="twistyContent">
								<p>
									<strong>Why migrate:</strong>
								</p>
								<p>
									The IBM Blockchain Platform as a service is being sunset on yyyy/mm/dd.
									All users of this service must migrate or data loss may occur.
								</p>


								<p className="infoTitle">
									What does migration mean:
								</p>
								<p>
									The migration process will create a nearly identical console on your kubernetes cluster and then copy all the data about your components.
									You will retain the same Fabric management abilities you have now. The old console will eventually be destroyed.
									<br />
									<br />
									<p>
										The migration process involves:
										<p>1. Creating a new console</p>
										<p>2. Copying database records to the new console</p>
										<p>3. Redeploying Fabric components (CAs, orderers, and peers)</p>
										<p>4. Creating a local user to login on the new console</p>
										<p>5. Exporting your wallet and importing it on the new console</p>
									</p>
								</p>

								<p className="infoTitle">
									How to migrate:
								</p>
								<p>
									You can begin migrating by clicking the start button at the bottom.
								</p>

								<p className="infoTitle">
									What changes:
								</p>
								<p>
									- The console you are using right now is hosted by the IBM Blockchain Platform service.
									Your new console will be hosted on your kubernetes cluster.
								</p>
								<p>
									- The login credentials you used to get here are from an IBM-ID which uses IBM Cloud's IAM service.
									The new credentials will be local users to the console, using an email/password you define during migration.
								</p>
								<p>
									- Your Fabric components will be restarted and their base images changed from x to y.
								</p>
								<p>
									- After migration the existing console will be put into a read-only state and we will prompt you to delete the service instance.
									Once in the read only state you will be unable to create/manage components on this console.
								</p>

								<p className="diagramWrap">a-what-changes-diagram-goes-here</p>

								<p className="infoTitle">
									<strong>Costs:</strong>
								</p>
								<p className="centerText">
									x CPU - x MB memory - x GB storage
									<br />
								</p>
								<p>
									It's estimated that a migrated console will require x CPU, x MB of memory, and x GB of storage.
									However consoles with many components will require more resources.
									We suggest to start off with these minimum requirements and increases them if you notice slow UI performance.

									<p><strong>
										We strongly recommend to check if your cluster has enough cpu, memory and storage capacity before starting migration.
									</strong></p>
								</p>
							</div>
						</div>

						<div className="twistyWrapper">
							<div className="twistyTitle">
								&gt; Progress
							</div>
							<div className="twistyContent">

								<p className="centerText">
									Overall Status
									<p>
										In Progress
									</p>
								</p>

								<p className="infoTitle">
									New console URL:
								</p>
								<a href="#">
									https://your-new-console-url-goes-here.com
								</a>

								<p className="infoTitle">
									Components status:
								</p>
								<p>
									components listed here
								</p>

							</div>
						</div>

						<div>
							Migration-Wizard-Modal-Goes-Here
						</div>
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	showInfo: PropTypes.bool,
	showProgress: PropTypes.bool,
};

MigrationPage.propTypes = {
	...dataProps,
	translate: PropTypes.func,
	history: PropTypes.object,
};

export default withLocalize(MigrationPage);
