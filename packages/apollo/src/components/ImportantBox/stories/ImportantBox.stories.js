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
