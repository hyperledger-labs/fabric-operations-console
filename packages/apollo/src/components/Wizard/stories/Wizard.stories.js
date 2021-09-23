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
import { withKnobs, text } from '@storybook/addon-knobs/react';
import { action } from '@storybook/addon-actions';
import Wizard from '../Wizard';
import WizardStep from '../../WizardStep/WizardStep';
import '../../../index.scss';
import '../../../app.scss';

const StoryWizard = () => (
	<Wizard
		title={text('Wizard title', 'Wizard title')}
		onClose={action('close wizard')}
		onSubmit={action('submitting wizard step')}
		submitButtonLabel={text('Submit button text', 'Join channel')}
	>
		<WizardStep
			type="WizardStep"
			headerDesc={text('Wizard desc', 'Wizard description goes here.')}
			headerLink="https://cloud.ibm.com/docs/services/blockchain/howto/ibp-console-build-network.html#ibp-console-build-network-join-peer"
			headerLinkText={text('Wizard link text', 'Find out more here')}
			title={text('Wizard page title', 'Wizard page title')}
			desc={text('Wizard page description', 'Wizard page description goes here')}
			tooltip={text('Tooltip', 'Optional tooltip')}
			disableSubmit={false}
		>
			<p>Content goes here</p>
		</WizardStep>
	</Wizard>
);

const StoryWizardNoSubmit = () => (
	<Wizard title={text('Wizard title', 'Wizard title')}
		onClose={action('close wizard')}
	>
		<WizardStep
			type="WizardStep"
			headerDesc={text('Wizard desc', 'Wizard description goes here.')}
			headerLink="https://cloud.ibm.com/docs/services/blockchain/howto/ibp-console-build-network.html#ibp-console-build-network-join-peer"
			headerLinkText={text('Wizard link text', 'Find out more here')}
			title={text('Wizard page title', 'Wizard page title')}
			desc={text('Wizard page description', 'Wizard page description goes here')}
			tooltip={text('Tooltip', 'Optional tooltip')}
			disableSubmit={false}
		>
			<p>Content goes here</p>
		</WizardStep>
	</Wizard>
);

const TwoPagerWizard = () => (
	<Wizard
		title={text('Wizard title', 'Wizard title')}
		onClose={action('close wizard')}
		onSubmit={action('submitting wizard step')}
		submitButtonLabel={text('Submit button text', 'Join channel')}
	>
		<WizardStep
			type="WizardStep"
			headerDesc={text('Wizard desc', 'This description can change based on what step you are currently on.')}
			headerLink="https://cloud.ibm.com/docs/services/blockchain/howto/ibp-console-build-network.html#ibp-console-build-network-join-peer"
			headerLinkText={text('Wizard link text', 'Find out more here')}
			title={text('Wizard page title', 'Page 1 title')}
			desc={text('Wizard page description', 'Page one description.')}
			tooltip={text('Tooltip', 'Optional tooltip')}
			disableSubmit={false}
		>
			<p>Content goes here</p>
		</WizardStep>
		<WizardStep
			type="WizardStep"
			headerDesc={text('Wizard desc, page 2', 'Page 2 header description goes here.')}
			headerLink="https://cloud.ibm.com/docs/services/blockchain/howto/ibp-console-build-network.html#ibp-console-build-network-join-peer"
			headerLinkText={text('Wizard link text', 'Find out more here')}
			title={text('Wizard page 2 title', 'Page 2 title')}
			desc={text('Wizard page 2 description', 'Page two description.')}
			tooltip={text('Tooltip', 'Optional tooltip')}
			disableSubmit={false}
		>
			<p>Content goes here</p>
		</WizardStep>
	</Wizard>
);
const ThreePagerWizard = () => (
	<Wizard
		title={text('Wizard title', 'Wizard title')}
		onClose={action('close wizard')}
		onSubmit={action('submitting wizard step')}
		submitButtonLabel={text('Submit button text', 'Join channel')}
	>
		<WizardStep
			type="WizardStep"
			headerDesc={text('Wizard desc', 'This description can change based on what step you are currently on.')}
			headerLink="https://cloud.ibm.com/docs/services/blockchain/howto/ibp-console-build-network.html#ibp-console-build-network-join-peer"
			headerLinkText={text('Wizard link text', 'Find out more here')}
			title={text('Wizard page title', 'Page 1 title')}
			desc={text('Wizard page description', 'Page one description.')}
			tooltip={text('Tooltip', 'Optional tooltip')}
			disableSubmit={false}
		>
			<p>Content goes here</p>
		</WizardStep>
		<WizardStep
			type="WizardStep"
			headerDesc={text('Wizard desc, page 2', 'Page 2 header description goes here.')}
			headerLink="https://cloud.ibm.com/docs/services/blockchain/howto/ibp-console-build-network.html#ibp-console-build-network-join-peer"
			headerLinkText={text('Wizard link text', 'Find out more here')}
			title={text('Wizard page 2 title', 'Page 2 title')}
			desc={text('Wizard page 2 description', 'Page two description.')}
			tooltip={text('Tooltip', 'Optional tooltip')}
			disableSubmit={false}
		>
			<p>Content goes here</p>
		</WizardStep>
		<WizardStep
			type="WizardStep"
			headerDesc={text('Wizard desc, page 3', 'Page 3 header description goes here.')}
			headerLink="https://cloud.ibm.com/docs/services/blockchain/howto/ibp-console-build-network.html#ibp-console-build-network-join-peer"
			headerLinkText={text('Wizard link text', 'Find out more here')}
			title={text('Wizard page 3 title', 'Page 3 title')}
			desc={text('Wizard page 3 description', 'Page three description.')}
			tooltip={text('Tooltip', 'Optional tooltip')}
			disableSubmit={false}
		>
			<p>Content goes here</p>
		</WizardStep>
	</Wizard>
);

storiesOf('Wizard', module)
	.addDecorator(withKnobs)
	.add('default', () => <StoryWizard />)
	.add('two page wizard', () => <TwoPagerWizard />)
	.add('three page wizard', () => <ThreePagerWizard />)
	.add('no submit', () => <StoryWizardNoSubmit />);
