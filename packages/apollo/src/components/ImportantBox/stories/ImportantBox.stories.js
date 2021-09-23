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
import ImportantBox from '../ImportantBox';
import '../../../index.scss';
import '../../../app.scss';

const label = 'Important box text';
const defaultProps = {
	text: 'create_channel_org_message',
};

storiesOf('Important box', module)
	.addDecorator(withKnobs)
	.add('default', () => <ImportantBox text={object(label, defaultProps.text)} />)
	.add('informational', () => <ImportantBox text={object(label, defaultProps.text)}
		kind="informational"
	/>)
	.add('strict', () => <ImportantBox text={object(label, defaultProps.text)}
		kind="strict"
	/>)
	.add('with link', () => <ImportantBox text={object(label, defaultProps.text)}
		link="create_channel_org_link"
	/>)
	.add('informational with link', () => <ImportantBox text={object(label, defaultProps.text)}
		kind="informational"
		link="create_channel_org_link"
	/>)
	.add('strict with link', () => <ImportantBox text={object(label, defaultProps.text)}
		kind="strict"
		link="create_channel_org_link"
	/>);
