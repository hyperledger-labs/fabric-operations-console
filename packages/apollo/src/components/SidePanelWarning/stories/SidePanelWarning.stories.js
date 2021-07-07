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
