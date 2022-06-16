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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import SettingsApi from '../../rest/SettingsApi';
import Helper from '../../utils/helper';
import LeftNavItem from '../LeftNavItem/LeftNavItem';
import SubNavItem from '../SubNavItem/SubNavItem';

const mainNav = [
	{
		icon: 'grid',
		path: '/nodes',
		id: 'nodes',
		globalNavSubmenu: [],
	},
	{
		icon: 'api',
		path: '/channels',
		id: 'channels',
		globalNavSubmenu: [],
	},
	{
		icon: 'dataset',
		path: '/smart-contracts',
		id: 'smart_contracts',
		globalNavSubmenu: [],
	},
	{
		icon: 'wallet',
		path: '/wallet',
		id: 'wallet',
		globalNavSubmenu: [],
	},
	{
		icon: 'msp',
		path: '/organizations',
		id: 'organizations',
		globalNavSubmenu: [],
	},
	{
		icon: 'member',
		path: '/users',
		id: 'users',
		globalNavSubmenu: [],
		newGroup: true,
	},
	{
		icon: 'settings',
		path: '/settings',
		id: 'settings',
		globalNavSubmenu: [],
	},
];

class LeftNav extends Component {
	componentDidMount() {
		this.pageEvent(this.props.location.pathname, this.props.location.title);
	}

	componentDidUpdate(prevProps) {
		if (prevProps !== this.props && prevProps.location.pathname !== this.props.location.pathname) {
			this.pageEvent(this.props.location.pathname, this.props.location.title);
		}
	}

	async pageEvent(path, title) {
		document.title = await this.getPageTitle(path);
		if (window.pageEvent) {
			const pageTitle = title ? title : '';
			window.pageEvent('Offering Interface', pageTitle, { path: path });
		}
	}

	// change <title> of the browser tab
	async getPageTitle(path) {
		const translate = this.props.translate;
		let title = translate('product_label');
		let pathArray = path.split('/');
		let suffix = pathArray[1];
		let idx = pathArray.indexOf('channel');
		if (idx !== -1) {
			suffix = pathArray[idx + 1];
		}
		title = `${title} - ${suffix}`;
		let namespace = this.props.namespace;
		if (!namespace) {
			try {
				let settings = await SettingsApi.getSettings();
				namespace = _.get(settings, 'CLUSTER_DATA.namespace');
			} catch (e) {
				// ignore
			}
		}
		if (namespace) {
			title = `${title} (${namespace})`;
		}
		return title;
	}

	buildNavItems() {
		if (this.props.submenu) {
			return this.props.submenu;
		}
		return mainNav;
	}

	buildBackNavItem() {
		if (this.props.submenu) {
			return <SubNavItem icon={'arrowLeft'}
				path="/nodes"
				itemId="nodes"
			/>;
		}
	}

	render() {
		const items = this.buildNavItems();
		const translate = this.props.translate;
		return (
			<div role="navigation"
				className="ibp-left-nav"
				aria-label="app-navigation"
				tabIndex="1"
			>
				{this.buildBackNavItem(translate)}
				{items.map(item => {
					if (item.globalNavSubmenu) {
						return (
							<LeftNavItem
								key={`${item.id}-${this.props.location.pathname}`}
								icon={item.icon}
								path={item.path}
								itemId={item.id}
								id={`test__navigation--item--${item.id}`}
								globalNavSubmenu={item.globalNavSubmenu}
								newGroup={item.newGroup}
								bottomGroup={item.bottomGroup}
							/>
						);
					} else {
						return <SubNavItem key={`${item.id}-${this.props.location.pathname}`}
							icon={item.icon}
							path={item.path}
							itemId={item.id}
							submenu={item.submenu}
						/>;
					}
				})}
			</div>
		);
	}
}

const dataProps = {
	submenu: PropTypes.array,
	location: PropTypes.shape({
		pathname: PropTypes.string,
	}),
};

LeftNav.propTypes = {
	...dataProps,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withRouter(
	connect((state, props) => {
		let newProps = Helper.mapStateToProps(state.leftNav, dataProps);
		newProps['namespace'] = _.get(state, 'settings.cluster_data.namespace');
		return newProps;
	})(withLocalize(LeftNav))
);
