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
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { NodeRestApi } from '../../rest/NodeRestApi';
import Helper from '../../utils/helper';
import ImportantBox from '../ImportantBox/ImportantBox';
import Logger from '../Log/Logger';
import UsageForm from '../UsageForm/UsageForm';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'reallocateModal';
const Log = new Logger(SCOPE);

class ReallocateModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, { usageValid: true });
		const usage = {
			ca: this.getUsage('ca'),
			orderer: this.getUsage('orderer'),
			peer: this.getUsage('peer'),
			couchdb: this.getUsage('couchdb'),
			leveldb: this.getUsage('leveldb'),
			dind: this.getUsage('dind'),
			chaincodelauncher: this.getUsage('chaincodelauncher'),
			proxy: this.getUsage('proxy'),
			fluentd: this.getUsage('fluentd'),
		};
		this.props.updateState(SCOPE, { usage });
		this.calculateUsageTotals(usage);
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, { usage: null });
	}

	getUsage(category) {
		if (this.props.ignore && this.props.ignore.indexOf(category) > -1) {
			return undefined;
		}
		const usage = { valid: true };
		if (this.props.usageInfo.resources[category]) {
			usage.cpu = this.normalizeCpu(this.props.usageInfo.resources[category].requests.cpu);
			usage.memory = this.normalizeMemory(this.props.usageInfo.resources[category].requests.memory);
		}
		let type = category === 'leveldb' || category === 'couchdb' ? 'statedb' : category; // LevelDB storage is also stored under couchdb
		if (!this.props.usageInfo.storage[type] && category === 'leveldb') {
			type = 'leveldb';
		}
		if (!this.props.usageInfo.storage[type] && (category === 'leveldb' || category === 'couchdb')) {
			type = 'couchdb';
		}
		if (this.props.usageInfo.storage[type]) {
			usage.storage = this.normalizeStorage(this.props.usageInfo.storage[type].size);
		}
		return usage;
	}

	normalizeCpu(cpu) {
		if (cpu) {
			const text = Helper.normalizeCpu(cpu);
			return text;
		}
		return '0';
	}

	normalizeMemory(memory) {
		if (memory) {
			const text = Helper.normalizeMemory(memory, 'M');
			return text.substring(0, text.length - 2);
		}
		return '0';
	}

	normalizeStorage(storage) {
		if (storage) {
			const text = Helper.normalizeMemory(storage, 'Gi');
			return text.substring(0, text.length - 3);
		}
		return '0';
	}

	onSubmit = () => {
		Log.trace('onSubmit');
		return new Promise((resolve, reject) => {
			const all = [];
			if (this.props.details.raft) {
				this.props.details.raft.forEach(raft_node => {
					all.push(NodeRestApi.updateNodeResources(raft_node, this.props.usage));
				});
			} else {
				all.push(NodeRestApi.updateNodeResources(this.props.details, this.props.usage));
			}
			Promise.all(all)
				.then(resp => {
					this.props.onComplete(resp[0].resources);
					resolve();
				})
				.catch(error => {
					Log.error(error);
					reject({
						title: 'error_update_node',
						details: error,
					});
				});
		});
	};

	calculateUsageTotal(usage, category) {
		let total = 0;
		let peerdb = this.props.details.state_db ? this.props.details.state_db : 'couchdb';
		let types = ['ca', 'orderer', 'peer', peerdb, 'dind', 'chaincodelauncher', 'proxy', 'fluentd'];
		try {
			while (types.length) {
				let type = types.pop();
				if (usage[type] && !isNaN(usage[type][category])) {
					total = total + Number(usage[type][category]);
				}
			}
		} catch (error) {
			total = 0;
		}
		if (category === 'cpu') {
			total = Math.floor(total * 1000) / 1000;
		}
		return total;
	}

	calculateUsageTotals(usage) {
		let count = 1;
		if (this.props.details.raft) {
			count = this.props.details.raft.length;
		}
		if (this.props.details.replicas) {
			count = this.props.details.replicas;
		}

		this.props.updateState(SCOPE, {
			usage_total_cpu: count * this.calculateUsageTotal(usage, 'cpu'),
			usage_total_memory: count * this.calculateUsageTotal(usage, 'memory'),
			usage_total_storage: count * this.calculateUsageTotal(usage, 'storage'),
		});
	}

	renderUsageFooter(translate) {
		const ca_database = _.get(this.props.details, 'config_override.ca.db.type');
		const usage_total_cpu = Helper.formatNumber(this.props.usage_total_cpu);
		const usage_total_memory = Helper.formatNumber(this.props.usage_total_memory);
		const usage_total_storage = Helper.formatNumber(this.props.usage_total_storage);
		return (
			<div className="ibp-usage-footer">
				<div className="ibp-usage-footer-column">
					<div className="ibp-usage-footer-heading">{translate('cpu_usage_total')}</div>
					<div className="ibp-usage-footer-value">{usage_total_cpu}</div>
				</div>
				<div className="ibp-usage-footer-column">
					<div className="ibp-usage-footer-heading">{translate('memory_usage_total')}</div>
					<div className="ibp-usage-footer-value">{usage_total_memory} M</div>
				</div>
				{ca_database !== 'postgres' && (
					<div className="ibp-usage-footer-column">
						<div className="ibp-usage-footer-heading">{translate('storage_usage_total')}</div>
						<div className="ibp-usage-footer-value">{usage_total_storage} Gi</div>
					</div>
				)}
			</div>
		);
	}

	isUsageValid(usage) {
		let valid = true;
		const keys = Object.keys(usage);
		keys.forEach(key => {
			if (usage[key] && !usage[key].valid) {
				valid = false;
			}
		});
		return valid;
	}

	renderUsageForm(type) {
		if (!this.props.usage) {
			return;
		}
		if (this.props.ignore && this.props.ignore.indexOf(type) > -1) {
			return;
		}
		const database = _.get(this.props.details, 'config_override.ca.db.type');
		let reallocate;
		if (type === 'leveldb') {
			reallocate = {
				storage: this.props.usage[type].storage || '0',
			};
		} else {
			reallocate = {
				cpu: this.props.usage[type].cpu || '0',
				memory: this.props.usage[type].memory || '0',
				storage: this.props.usage[type].storage || '0',
			};
		}
		return (
			<UsageForm
				title={type + '_container'}
				titleTooltip={type + '_container_tooltip'}
				type={type}
				onChange={(data, valid) => {
					const usage = {
						...this.props.usage,
					};
					usage[type] = {
						...data,
						valid,
					};
					this.props.updateState(SCOPE, {
						usage,
						usageValid: this.isUsageValid(usage),
					});
					this.calculateUsageTotals(usage);
				}}
				reallocate={reallocate}
				nostorage={database === 'postgres'}
			/>
		);
	}

	render() {
		let isCouchStateDb = !this.props.details.state_db || this.props.details.state_db === 'couchdb';
		const translate = this.props.translate;
		return (
			<Wizard
				title="resource_allocation"
				onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				submitButtonLabel={translate('reallocate')}
				submitButtonId="reallocate"
			>
				<p className="ibp-modal-desc">{translate('resource_allocation_desc')}</p>
				<ImportantBox text="vpc_warning_message" />
				<WizardStep type="WizardStep"
					disableSubmit={!this.props.usageValid}
					footer={this.renderUsageFooter(translate)}
				>
					{this.props.details.type === 'fabric-ca' && <div>{this.renderUsageForm('ca')}</div>}
					{this.props.details.type === 'fabric-orderer' && (
						<div>
							{this.renderUsageForm('orderer')}
							{this.renderUsageForm('proxy')}
						</div>
					)}
					{this.props.details.type === 'fabric-peer' && (
						<div>
							{this.renderUsageForm('peer')}
							{isCouchStateDb ? this.renderUsageForm('couchdb') : this.renderUsageForm('leveldb')}
							{this.renderUsageForm('dind')}
							{this.renderUsageForm('chaincodelauncher')}
							{this.renderUsageForm('proxy')}
							{this.renderUsageForm('fluentd')}
						</div>
					)}
				</WizardStep>
			</Wizard>
		);
	}
}

const dataProps = {
	usage: PropTypes.object,
	usageValid: PropTypes.bool,
	usage_total_cpu: PropTypes.string,
	usage_total_memory: PropTypes.string,
	usage_total_storage: PropTypes.string,
};

ReallocateModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	ignore: PropTypes.array,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(ReallocateModal));
