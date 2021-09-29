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
import { Button, Loading } from 'carbon-components-react';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withLocalize } from 'react-localize-redux';
import { Backoff, ExponentialStrategy } from 'backoff';
import MustgatherApi from '../../rest/MustgatherApi';
import SVGs from '../Svgs/Svgs';

export const statuses = {
	NO_LOGS: 'no logs',
	LOGS: 'logs',
	ERROR: 'error',
};

export class Mustgather extends Component {
	constructor() {
		super();
		this.state = {
			mustgather: {},
			status: undefined,
			deleting: false,
			running: false,
			pendingRequest: false,
			backOff: false,
		};

		this.startGather = this.startGather.bind(this);
		this.stopGather = this.stopGather.bind(this);
		this.getDownloadUrl = this.getDownloadUrl.bind(this);
	}

	componentDidMount() {
		this.checkGatherStatus();
		this.setupBackoff();
	}

	setupBackoff() {
		const myBackoffStrategy = new ExponentialStrategy({
			initialDelay: 3000,
			maxDelay: 20000,
			factor: 1.1,
		});
		const myBackoff = new Backoff(myBackoffStrategy);

		myBackoff.failAfter(40);

		myBackoff.on('ready', () => {
			this.checkGatherStatus();
			myBackoff.backoff();
		});

		myBackoff.on('fail', () => {
			this.setState({
				backOff: true,
			});
		});

		myBackoff.backoff();
	}

	checkStatus(res) {
		if (res.mustgather.error) {
			return statuses.ERROR;
		}

		if (res.kube.podRunning && res.mustgather.completed && res.mustgather.fileExists) {
			return statuses.LOGS;
		}

		return statuses.NO_LOGS;
	}

	checkIfRunning(res, status) {
		const finishedWithFile = res.mustgather.completed && res.mustgather.fileExists;
		if (res.kube.podStatus.phase === 'Pending' || (res.kube.podRunning && !finishedWithFile)) {
			return true;
		}

		// need this check in case we've clicked restart and are deleting/recreating the pod
		if (this.state.running) {
			if (status === statuses.NO_LOGS) {
				return true;
			}
		}

		return false;
	}

	checkIfDeleting(status) {
		if (this.state.deleting) {
			if (status !== statuses.NO_LOGS) {
				return true;
			}
		}

		return false;
	}

	startGather() {
		this.setState({
			running: true,
			pendingRequest: true,
		});
		MustgatherApi.startGather().then(() => {
			// give the pod a chance to start
			setTimeout(() => {
				this.setState({ pendingRequest: false });
			}, 3000);
		});
	}

	stopGather() {
		this.setState({
			running: false,
			deleting: true,
			pendingRequest: true,
		});
		MustgatherApi.stopGather().then(() => this.setState({ pendingRequest: false }));
	}

	getDownloadUrl() {
		return '/deployer/api/v3/instance/:siid/mustgather/download';
	}

	checkGatherStatus() {
		if (!this.state.backOff && !this.state.pendingRequest) {
			this.setState({
				pendingRequest: true,
			});

			MustgatherApi.getStatus()
				.then(res => {
					if (res?.kube) {
						const status = this.checkStatus(res);
						if (status !== this.state.status) {
							this.setState({
								podRunning: res.kube.podRunning,
								mustgather: res.mustgather,
								status,
								running: this.checkIfRunning(res, status),
								deleting: this.checkIfDeleting(status),
								pendingRequest: false,
							});
						} else {
							this.setState({
								pendingRequest: false,
							});
						}
					}
				})
				.catch(() => {
					this.setState({
						pendingRequest: false,
					});
				});
		}
	}

	renderLastRunTime(translate) {
		const lastRunTime = new Date(this.state.mustgather.startedAt);
		return (
			<p className="mustgather-text">
				<span>{`${translate('mustgather_last_run')} ${lastRunTime.toLocaleDateString()} ${lastRunTime.toLocaleTimeString()}`}</span>
			</p>
		);
	}

	// return type: JSX Element
	getActionButtons(translate) {
		// if there's an error we should just return that first
		if (this.state.status === statuses.ERROR) {
			return (
				<Button
					className="ibp__add--item--button-with-text"
					kind="secondary"
					role="button"
					onClick={this.startGather}
					disabled={this.state.deleting || this.state.running}
				>
					<div className="gather-logs-button-label">{translate('mustgather_button_retry')}</div>
					{this.state.running && <Loading withOverlay={false}
						small
						className="mustgather-button-loading-spinner"
					/>}
				</Button>
			);
		}

		// if it's finished gathering we should show a download button and the option to run again
		if (this.state.status === statuses.LOGS) {
			return (
				<>
					<Button
						className="ibp__add--item--button-with-text"
						href={this.getDownloadUrl()}
						rel="noopener noreferrer"
						target="_blank"
						kind="secondary"
						role="link"
						disabled={this.state.running || this.state.deleting}
					>
						<div className="gather-logs-button-label">{translate('mustgather_button_download')}</div>
						<SVGs extendClass={{ 'ibp-container-list-add-button-img': true }}
							type={'launch'}
						/>
					</Button>
					<Button
						className="ibp__add--item--button-with-text"
						kind="tertiary"
						role="button"
						onClick={this.startGather}
						disabled={this.state.running || this.state.deleting}
					>
						<div className="gather-logs-button-label">{translate('mustgather_button_restart')}</div>
						{this.state.running && <Loading withOverlay={false}
							small
							className="mustgather-button-loading-spinner"
						/>}
					</Button>
				</>
			);
		}

		// otherwise just return the start button
		return (
			<Button
				className="ibp__add--item--button-with-text"
				kind="secondary"
				role="button"
				onClick={this.startGather}
				disabled={this.state.running || this.state.deleting}
			>
				<div className="gather-logs-button-label">{translate('mustgather_button_start')}</div>
				{this.state.running && <Loading withOverlay={false}
					small
					className="mustgather-button-loading-spinner"
				/>}
			</Button>
		);
	}

	renderButtonSection(translate) {
		if (this.state.status) {
			return (
				<div className="mustgather-buttons">
					{this.getActionButtons(translate)}
					{(this.state.status !== statuses.NO_LOGS || this.state.running || this.state.deleting) && (
						<Button
							className="ibp__add--item--button-with-text mustgather-stop-button"
							kind="danger"
							role="button"
							onClick={this.stopGather}
							disabled={this.state.deleting}
						>
							<div className="gather-logs-button-label">{translate('mustgather_button_delete')}</div>
							{this.state.deleting && <Loading withOverlay={false}
								small
								className="mustgather-button-loading-spinner"
							/>}
						</Button>
					)}
				</div>
			);
		}

		return <></>;
	}

	renderTimeoutMessage(translate) {
		return <p className="mustgather-timeout">{translate('mustgather_timeout')}</p>;
	}

	render() {
		return (
			<div className="mustgather-container">
				<p className="mustgather-text">{this.props.translate('mustgather_heading')}</p>
				<p className="mustgather-text">{this.props.translate('mustgather_description')}</p>
				<p className="mustgather-text">{this.props.translate('mustgather_description_2')}</p>
				<p className="mustgather-text">{this.props.translate('mustgather_description_3')}</p>
				{this.state.mustgather.startedAt && this.renderLastRunTime(this.props.translate)}
				{this.state.mustgather.error && (
					<p className="mustgather-error">{`${this.props.translate('mustgather_error')} ${this.state.mustgather.error.toString()}`}</p>
				)}
				{!this.state.backOff ? this.renderButtonSection(this.props.translate) : this.renderTimeoutMessage(this.props.translate)}
			</div>
		);
	}
}

export default connect()(withLocalize(Mustgather));

Mustgather.propTypes = {
	translate: PropTypes.func, // Provided by withLocalize
};
