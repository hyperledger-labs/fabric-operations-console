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
import { withLocalize } from 'react-localize-redux';
import { Link, NavLink } from 'react-router-dom';
import SVGs from '../Svgs/Svgs';

class LeftNavItem extends Component {
	render() {
		const translate = this.props.translate;
		if (this.props.globalNavSubmenu) {
			return (
				<div
					className={'ibp-left-nav-item  ' + (this.props.newGroup ? 'new-nav-group' : '') + (this.props.bottomGroup ? 'bottom-nav-group' : '')}
					id={this.props.id}
				>
					<NavLink
						to={{
							pathname: this.props.path,
							title: this.props.itemId,
						}}
						exact
						activeClassName="ibp-active-left-nav-item"
						className="ibp-left-nav-link"
					>
						<SVGs type={this.props.icon}
							extendClass={{ 'ibp-left-nav-icon': true }}
							width="16px"
							height="16px"
							title={translate(this.props.itemId)}
						/>
					</NavLink>
					<div className={`${this.props.globalNavSubmenu.length ? 'left-nav-extended' : 'left-nav-shortened'} left-nav-item-content`}>
						<Link className="ibp-left-nav-header-link"
							to={this.props.path}
							tabIndex="-1"
						>
							<h4 className="ibp-left-nav-text">{translate(this.props.itemId)}</h4>
						</Link>
						{this.props.globalNavSubmenu.map((item, i) => (
							<h4 key={i}
								className="ibp-sub-menu-title"
							>
								{item}
							</h4>
						))}
					</div>
				</div>
			);
		} else {
			return <div />;
		}
	}
}

LeftNavItem.propTypes = {
	itemId: PropTypes.string,
	id: PropTypes.string,
	path: PropTypes.string,
	icon: PropTypes.string,
	globalNavSubmenu: PropTypes.array,
	newGroup: PropTypes.bool,
	bottomGroup: PropTypes.bool,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(LeftNavItem);
