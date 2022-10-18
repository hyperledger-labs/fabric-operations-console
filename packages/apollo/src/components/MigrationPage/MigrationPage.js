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
import { MigrationApi } from '../../rest/MigrationApi';
import {
	Accordion,
	AccordionItem,
	StructuredListWrapper,
	StructuredListHead,
	StructuredListRow,
	StructuredListCell,
	StructuredListBody,
	SkeletonIcon,
	SkeletonText,
	StructuredListSkeleton
} from 'carbon-components-react';
import { CheckmarkFilled16, Incomplete16, CircleDash16 } from '@carbon/icons-react';
import Helper from '../../utils/helper';
import PageContainer from '../PageContainer/PageContainer';
import Logger from '../Log/Logger';
import PageHeader from '../PageHeader/PageHeader';
const SCOPE = 'MigrationPage';
const Log = new Logger(SCOPE);

class MigrationPage extends Component {
	componentDidMount() {
		this.props.showBreadcrumb('settings', {}, this.props.history.location.pathname, true);
		this.getComponentsStatus();
	}

	getComponentsStatus = () => {
		this.props.updateState(SCOPE, { loading: true });

		MigrationApi.getStatus()
			.then(res => {
				setTimeout(() => {
					const componentList = res.components;
					const overallMigrationStatus = res.migration_status;
					this.props.updateState(SCOPE, {
						componentList,
						overallMigrationStatus,
						loading: false,
					});
				}, 1000);
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					componentList: [],
					loading: false,
				});
			});
	}

	buildComponentListBody = (translate) => {
		const componentListRows = this.props.componentList.map((component) => (
			<StructuredListRow key={component.id}>
				<StructuredListCell noWrap>{component.id}</StructuredListCell>
				<StructuredListCell>
					<div className='progressInfoContent'>
						{!component.migration_status &&
							<>
								<CircleDash16 className='progressIcon iconNotStarted' />
								<p>Not Started</p>
							</>
						}
						{component.migration_status && component.migration_status === 'in-progress' &&
							<>
								<Incomplete16 className='progressIcon iconInProgress'
									style={{ fill: 'orange' }}
								/>
								<p>In Progress</p>
							</>
						}
						{component.migration_status && component.migration_status === 'done' &&
							<>
								<CheckmarkFilled16 className='progressIcon iconSuccess'
									style={{ fill: 'green' }}
								/>
								<p>Done</p>
							</>
						}
					</div>
				</StructuredListCell>
			</StructuredListRow>
		));


		return componentListRows;
	}

	buildOverallStatus = (translate) => {
		let overallStatusComponent;
		if (this.props.loading) {
			overallStatusComponent = (
				<div className='progressInfoContent'>
					<div className='progressIcon'>
						<SkeletonIcon />
					</div>
					<div className='skeletonText'>
						<SkeletonText />
					</div>
				</div>
			);
		} else {
			overallStatusComponent = (
				<div className='progressInfoContent'>
					<div className='progressIcon'>
						{!this.props.overallMigrationStatus &&
							<CircleDash16 className="iconNotStarted" />
						}
						{this.props.overallMigrationStatus &&
							this.props.overallMigrationStatus === 'in-progress'
							&& <Incomplete16 className="iconInProgress" />
						}
						{this.props.overallMigrationStatus &&
							this.props.overallMigrationStatus === 'done'
							&& <CheckmarkFilled16 className="iconSuccess" />
						}
					</div>
					{/* The translate function doesn't work yet */}
					{this.props.overallMigrationStatus && <p>{translate(this.props.overallMigrationStatus)}</p>}
					{!this.props.overallMigrationStatus && <p>Not Started</p>}
				</div>
			);
		}

		return overallStatusComponent;
	}

	render() {
		const translate = this.props.translate;
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-13 migrationPanel">
						{/* <h1 className='pageTitle'>{translate('migration')}</h1> */}
						<PageHeader
							history={this.props.history}
							headerName="migration"
							staticHeader
						/>
						<Accordion align='start'>
							<AccordionItem title="Info"
								className='toggleHeader'
							>
								<div className="twistyContent">
									<p>
										<strong>Why migrate?</strong>
									</p>
									<p>
										The IBM Blockchain Platform as a service is being sunset on yyyy/mm/dd.
										All users of this service must migrate or data loss may occur.
									</p>


									<p className="infoTitle">
										What does migration mean?
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
										How do I migrate?
									</p>
									<p>
										You can begin migrating by clicking the start button at the bottom.
									</p>

									<p className="infoTitle">
										What changes?
									</p>
									<p>
										- The console you are using right now is hosted by the IBM Blockchain Platform service.
										Your new console will be hosted on your kubernetes cluster.
									</p>
									<p>
										- The login credentials you used to get here are from an IBM-ID which uses IBM Cloud&apos;s IAM service.
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
										<strong>What are the costs?
										</strong>
									</p>
									<p className="centerText">
										x CPU - x MB memory - x GB storage
										<br />
									</p>
									<p>
										It&apos;s estimated that a migrated console will require x CPU, x MB of memory, and x GB of storage.
										However consoles with many components will require more resources.
										We suggest to start off with these minimum requirements and increases them if you notice slow UI performance.

									</p>

									<p><strong>
										We strongly recommend to check if your cluster has enough cpu, memory and storage capacity before starting migration.
									</strong></p>
								</div>
							</AccordionItem>
							<AccordionItem title="Progress"
								open
								className='toggleHeader'
							>
								<div className="twistyContent">
									<h2>Overall Status:</h2>
									{this.buildOverallStatus()}
									{this.props.overallMigrationStatus === 'done' &&
										<div style={{ display: 'flex', justifyContent: 'flex-start' }}>
											<p className="infoTitle">
												New console URL:
											</p>
											<a href={this.props.newConsoleURL}
												className='newUrl'
											>
												{this.props.newConsoleURL}
											</a>
										</div>
									}

									<hr />

									<h2>Components Status:</h2>
									{this.props.loading &&
										<div className='componentListSkeleton'>
											<StructuredListSkeleton />
										</div>
									}
									{!this.props.loading && this.props.componentList && this.props.componentList.length === 0 && <p>There are no components to migrate</p>}
									{!this.props.loading && this.props.componentList && this.props.componentList.length > 0 &&
										<StructuredListWrapper isCondensed
											className='componentListWrapper'
										>
											<StructuredListHead>
												<StructuredListRow head>
													<StructuredListCell head>Component Name</StructuredListCell>
													<StructuredListCell head>Migration Status</StructuredListCell>
												</StructuredListRow>
											</StructuredListHead>
											<StructuredListBody>
												{this.buildComponentListBody()}
											</StructuredListBody>
										</StructuredListWrapper>}
								</div>
							</AccordionItem>
						</Accordion>
						<div className='migrationWizardModal'>
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
	componentList: PropTypes.array,
	overallMigrationStatus: PropTypes.string,
	newConsoleURL: PropTypes.string,
	loading: PropTypes.bool,
};

MigrationPage.propTypes = {
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
})(withLocalize(MigrationPage));
