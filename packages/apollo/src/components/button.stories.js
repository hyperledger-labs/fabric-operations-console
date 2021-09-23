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
import { action } from '@storybook/addon-actions';
import { Button } from '@storybook/react/demo';

storiesOf('Button', module)
	.add('with text', () => <Button onClick={action('clicked')}>Hello Button</Button>)
	.add('with some emoji', () => (
		<Button onClick={action('clicked')}>
			<span role="img"
				aria-label="so cool"
			>
				😀 😎 👍 💯
			</span>
		</Button>
	))
	.add('another button version', () => <Button>Another button</Button>);
