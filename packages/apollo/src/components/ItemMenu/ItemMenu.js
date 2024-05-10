/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
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
import { Loading, OverflowMenu, OverflowMenuItem } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';

class ItemMenu extends Component {
	render() {
		if (this.props.loading) {
			return <Loading withOverlay={false}
				small={true}
				className="ibp-item-menu-loading"
			/>;
		}
		const translate = this.props.t;
		return (
			<div
				onKeyDown={event => {
					event.stopPropagation();
				}}
			>
				<OverflowMenu
					flipped={true}
					iconDescription={translate('actions')}
					onClick={event => {
						event.stopPropagation();
					}}
					ariaLabel={translate('actions')}
				>
					{this.props.menuItems.map((option, index) => {
						return (
							<OverflowMenuItem
								id={`${option.text}--menu--item`}
								key={option.text}
								itemText={translate(option.text)}
								onClick={event => {
									event.stopPropagation();
									option.fn();
								}}
								primaryFocus={index === 0}
								requireTitle={option.requireTitle ? true : false}
								disabled={option.disabled === true}
							/>
						);
					})}
				</OverflowMenu>
			</div>
		);
	}
}

ItemMenu.propTypes = {
	menuItems: PropTypes.array,
	loading: PropTypes.bool,
	t: PropTypes.func, // Provided by withTranslation()
};

export default withTranslation()(ItemMenu);
