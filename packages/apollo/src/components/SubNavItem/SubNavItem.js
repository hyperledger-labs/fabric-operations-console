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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import SVGs from '../Svgs/Svgs';

class SubNavItem extends Component {
	render() {
		const translate = this.props.t;
		return (
			<div className="ibp-left-nav-item">
				<NavLink tabIndex="0"
					to={this.props.path}
					exact
					activeClassName="ibp-active-left-nav-item"
					className="ibp-left-nav-link"
				>
					<SVGs type={this.props.icon}
						extendClass={{ 'ibp-left-nav-icon': true }}
						width="16px"
						height="16px"
					/>
				</NavLink>
				<div className="left-nav-shortened left-nav-item-content">
					<span className="ibp-left-nav-border" />
					<h4 className="ibp-left-nav-text bx--type-zeta">{translate(this.props.itemId)}</h4>
				</div>
			</div>
		);
	}
}

SubNavItem.propTypes = {
	itemId: PropTypes.string,
	path: PropTypes.string,
	icon: PropTypes.string,
	t: PropTypes.func, // Provided by withTranslation()
};

export default withTranslation()(SubNavItem);
