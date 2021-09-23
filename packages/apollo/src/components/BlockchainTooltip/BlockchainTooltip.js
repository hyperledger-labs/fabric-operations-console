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
import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, TooltipDefinition } from 'carbon-components-react';
import Information from '@carbon/icons-react/es/information/16';

const BlockchainTooltip = ({
	customIcon,
	className,
	type,
	direction,
	children,
	triggerText,
	tooltipClass,
	tooltipText,
	tabIndex,
	menuOffset,
	icon,
	noIcon,
	withCheckbox,
}) => {
	const customIconProp = {
		customIconOnly: () => ({
			showIcon: true,
			tabIndex: 0,
			renderIcon: customIcon,
		}),
	};

	return (
		<div className={`${className ? className + ' ' : ''} ibp-tooltip-container ${withCheckbox ? 'ibp-tooltip-container-with-checkbox' : ''}`}>
			{type === 'definition' ? (
				/**
				 * The 'children' of TooltipDefinition will
				 * be the label that shows for the tooltip
				 */
				<>
					<TooltipDefinition tabIndex="-1"
						className="ibp-hide-tooltip"
					></TooltipDefinition>
					<TooltipDefinition tooltipText={tooltipText}
						direction={direction ? direction : 'top'}
					>
						{_.isArray(children) ? children[0] : children}
					</TooltipDefinition>
				</>
			) : (
				/**
				 * The 'children' of Tooltip will be the
				 * content that shows inside of the tooltip
				 */
				<Tooltip
					{...customIconProp.customIconOnly(customIcon)}
					triggerText={triggerText ? triggerText : ''}
					iconDescription="Information tooltip"
					direction={direction ? direction : 'bottom'}
					className={tooltipClass ? tooltipClass : ''}
					tabIndex={tabIndex ? tabIndex : 0}
					menuOffset={
						menuOffset
							? menuOffset
							: direction === 'right'
								? {
									left: 12,
							  }
								: {
									right: 'auto',
									left: -80,
									top: 16,
							  }
					}
					showIcon={!noIcon}
					renderIcon={icon ? icon : Information}
				>
					<p>{children}</p>
				</Tooltip>
			)}
		</div>
	);
};

BlockchainTooltip.propTypes = {
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
	direction: PropTypes.string,
	icon: PropTypes.object,
	menuOffset: PropTypes.object,
	className: PropTypes.string,
	tooltipClass: PropTypes.string,
	text: PropTypes.string,
	customIcon: PropTypes.string,
	tabIndex: PropTypes.number,
	triggerText: PropTypes.any,
	noIcon: PropTypes.bool,
	type: PropTypes.oneOf(['definition', 'standard']),
	tooltipText: PropTypes.string,
	withCheckbox: PropTypes.bool,
};

export default BlockchainTooltip;
