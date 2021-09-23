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
import React from 'react';
import { storiesOf } from '@storybook/react';
import { withKnobs, object } from '@storybook/addon-knobs/react';
import SignatureNotification from '../SignatureNotification';
import request from './openChannelUpdateRequest.json';
import closedWithApprovals from './closedWithApprovals.json';
import failedToSend from './failedToSend.json';
import ordererConfigUpdate from './ordererConfigUpdate.json';
import closedOrdererConfigUpdate from './closedOrdererConfigUpdate.json';
import resendSignature from './resendSignature.json';
import '../../../index.scss';
import '../../../app.scss';

function buildParameters(notification) {
	const last = notification.distribution_responses.length - 1;
	const hasErrors = notification.distribution_responses[0].errors.length > 0;
	let sign = null;
	notification.orgs2sign.forEach(entry => {
		if (entry.msp_id === notification.originator_msp) {
			sign = entry;
		}
	});
	let received = null;
	notification.orgs2sign.forEach(entry => {
		if (entry.optools_url === 'http://localhost:3000/api/v1') {
			if (!received || (received.signature && !entry.signature)) {
				received = entry;
			}
		} else {
			received = 'Org1'; // setting received value because of host_url prop issue
		}
	});
	const originator = sign;
	const received_by = received.msp_id;
	const submitter = originator ? originator.optools_url === 'optools.cloud.ibm.com/api/v1' : false;
	const required = notification.current_policy.number_of_signatures || notification.orgs2sign.length;
	const approved =
		notification.signature_count >= required && (notification.orderers2sign ? notification.orderer_signature_count >= notification.orderers2sign.length : true);
	const data = {
		received_by: object('Received by', received_by),
		submitter: object('Submitter', submitter),
		required: object('Required signatures', required),
		approved: object('Approved', approved),
		type: object('Notification type', notification.status === 'open' ? 'open' : hasErrors ? 'failedToSend' : 'closed'),
		last: hasErrors ? last : null,
		resending: object('Resending', notification.resending),
		originator: originator,
		request: object('Entire notification', notification),
		resendRequest: () => {},
	};
	return data;
}

storiesOf('Signature notification', module)
	.addDecorator(withKnobs)
	.add('open with all approvals', () => <SignatureNotification {...buildParameters(request)} />)
	.add('open with all approvals, orderer/channel config update', () => <SignatureNotification {...buildParameters(ordererConfigUpdate)} />)
	.add('closed', () => <SignatureNotification {...buildParameters(closedWithApprovals)} />)
	.add('closed, orderer/channel config update', () => <SignatureNotification {...buildParameters(closedOrdererConfigUpdate)} />)
	.add('failed to send', () => <SignatureNotification {...buildParameters(failedToSend)} />)
	.add('resend signature request', () => <SignatureNotification {...buildParameters(resendSignature)} />);
