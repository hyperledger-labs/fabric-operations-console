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

	buildComponentListBody = () => {
		const translate = this.props.translate;

		const componentListRows = this.props.componentList.map((component) => (
			<StructuredListRow key={component.id}>
				<StructuredListCell noWrap>{component.id}</StructuredListCell>
				<StructuredListCell>
					<div className='progressInfoContent'>
						{!component.migration_status &&
							<>
								<CircleDash16 className='progressIcon iconNotStarted' />
								<p>{translate('migration_not-started')}</p>
							</>
						}
						{component.migration_status && component.migration_status === 'in-progress' &&
							<>
								<Incomplete16 className='progressIcon iconInProgress'
									style={{ fill: 'orange' }}
								/>
								<p>{translate('migration_in-progress')}</p>
							</>
						}
						{component.migration_status && component.migration_status === 'done' &&
							<>
								<CheckmarkFilled16 className='progressIcon iconSuccess'
									style={{ fill: 'green' }}
								/>
								<p>{translate('migration_done')}</p>
							</>
						}
					</div>
				</StructuredListCell>
			</StructuredListRow>
		));


		return componentListRows;
	}

	buildOverallStatus = () => {
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
					<p>{this.buildOverallStatusText()}</p>
				</div>
			);
		}

		return overallStatusComponent;
	}

	buildOverallStatusText = () => {
		const translate = this.props.translate;
		return this.props.overallMigrationStatus ? translate('migration_' + this.props.overallMigrationStatus) : translate('migration_not-started');
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
							<AccordionItem title={translate('migration_info')}
								open={true}
								className='toggleHeader'
							>
								<div className="twistyContent">
									<p className="infoTitle">
										{translate('why_migrate_title')}
									</p>
									<p>{translate('migration_why1')}</p>

									<p className="infoTitle">
										{translate('what_changes_title')}
									</p>
									<p>{translate('migration_what1')}</p>
									<br />
									<br />
									<p>
										<p><strong>Details:</strong></p>
										<p>- {translate('migration_details1')}</p>
										<p>- {translate('migration_details2')}</p>
										<p>- {translate('migration_details3')}</p>
									</p>

									<p className="diagramWrap">
										<img src="/migration_picture.png"
											className="diagram"
										/>
									</p>

									<p className="infoTitle">
										{translate('what_prereq_title')}
									</p>
									<p className="centerText">
										{translate('migration_resources')}
										<br />
										<br />
									</p>
									<p>
										{translate('migration_resources1')}
										<br />
										<br />
										<strong>
											{translate('migration_resources2')}
										</strong>
									</p>

									<p className="infoTitle">
										{translate('how_migrate_title')}
									</p>
									<p>
										{translate('migration_start1')}

										<br />
										<br />
										<p>
											{translate('migration_start2')}
											<p>{translate('migration_start_details1')}</p>
											<p>{translate('migration_start_details2')}</p>
											<p>{translate('migration_start_details3')}</p>
											<p>{translate('migration_start_details4')}</p>
											<p>{translate('migration_start_details5')}</p>
										</p>
									</p>
								</div>
							</AccordionItem>
							<AccordionItem title={'Progress - ' + this.buildOverallStatusText()}
								open={false}
								className='toggleHeader'
							>
								<div className="twistyContent">
									<h2>{translate('overall_status_title')}</h2>
									{this.buildOverallStatus()}
									{this.props.overallMigrationStatus === 'done' &&
										<div style={{ display: 'flex', justifyContent: 'flex-start' }}>
											<p className="infoTitle">
												{translate('new_console_url')}
											</p>
											<a href={this.props.newConsoleURL}
												className='newUrl'
											>
												{this.props.newConsoleURL}
											</a>
										</div>
									}

									<hr />

									<h2>{translate('component_status_title')}</h2>
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
