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
import SidePanelWarning from '../SidePanelWarning';
import '../../../index.scss';
import '../../../app.scss';

storiesOf('Side panel warning', module)
	.addDecorator(withKnobs)
	.add('default', () => <SidePanelWarning title={text('Title', 'error_orderer_needed')} />)
	.add('with subtitle', () => <SidePanelWarning title={text('Title', 'error_orderer_needed')}
		subtitle={text('Subtitle', 'error_add_orderer_first')}
	/>);
