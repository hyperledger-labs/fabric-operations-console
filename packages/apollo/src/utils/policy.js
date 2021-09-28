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

import _ from 'lodash';

const PolicyHelper = {
	getTextForPolicy(policy, translate) {
		let text = 'policy_custom';
		let options = {};
		if (policy) {
			if (_.get(policy, 'type') === 1) {
				// explicit policy
				const n = _.get(policy, 'value.rule.n_out_of.n');
				if (n) {
					text = 'policy_n';
					options = { n };
				}
			}
			if (_.get(policy, 'type') === 3) {
				// implicit policy
				if (_.get(policy, 'value.rule') === 'MAJORITY') {
					text = 'policy_majority';
				}
				if (_.get(policy, 'value.rule') === 'ALL') {
					text = 'policy_all';
				}
				if (_.get(policy, 'value.rule') === 'ANY') {
					text = 'policy_any';
				}
			}
		}
		return translate ? translate(text, options) : text;
	},

	getApprovalCountForPolicy(policy, total) {
		let count = 1;
		if (policy) {
			if (_.get(policy, 'type') === 1) {
				// explicit policy
				const n = _.get(policy, 'value.rule.n_out_of.n');
				if (n) {
					count = n;
				}
			}
			if (_.get(policy, 'type') === 3) {
				// implicit policy
				if (_.get(policy, 'value.rule') === 'MAJORITY') {
					count = Math.floor(total / 2) + 1;
				}
				if (_.get(policy, 'value.rule') === 'ALL') {
					count = total;
				}
				if (_.get(policy, 'value.rule') === 'ANY') {
					count = 1;
				}
			}
		}
		return count;
	},
};

export default PolicyHelper;
