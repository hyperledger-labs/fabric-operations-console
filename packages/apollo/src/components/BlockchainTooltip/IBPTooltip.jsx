import React from 'react';
import { Button } from "@carbon/react";
import { Information } from '@carbon/icons-react';

const IBPTooltip = ({
	noIcon,
	icon,
	prefixText,
	tooltipText,
	direction,
	tabIndex,
	tooltipClass
}) => {
	return (<div className='ibp-tooltip-container'>
		<span className='ibp--tooltip__label'>{prefixText} </span>{' '}
		{noIcon ? null : <Button size='sm'
			kind='ghost'
			hasIconOnly
			iconDescription={(<p>{tooltipText}</p>)}
			renderIcon={() => icon ? icon : <Information size={16} />}
			tooltipPosition={direction}
			tabIndex={tabIndex ? tabIndex : 0}
			className={tooltipClass ? tooltipClass : ''}
		/>}
	</div>);
};

export default IBPTooltip;
