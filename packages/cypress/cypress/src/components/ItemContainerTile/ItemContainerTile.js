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
import React from 'react';
import Hover from '../../utils/hover';
import ItemMenu from '../ItemMenu/ItemMenu';

const ItemContainerTile = ({ data, mapping, largeTiles, select, menuItems, className, isLink, activeItem, id, placeholderTile }) => {
	const buildTitle = () => {
		if (data.skeleton) {
			return (
				<div className="ibp-container-tile-title">
					<div className="ibp-container-tile-skeleton-title" />
				</div>
			);
		}
		if (data && mapping && mapping.title) {
			const title = data[mapping.title];
			if (title) {
				return (
					<div className="ibp-container-tile-title"
						onMouseEnter={Hover.onMouseEnter}
						onMouseLeave={Hover.onMouseLeave}
						id={`ibp-tile-${title}`}
					>
						{largeTiles ? <p className="ibp-tile-content-title">{title}</p> : <h4 className="ibp-tile-content-title">{title}</h4>}
					</div>
				);
			}
		}
	};

	const buildSubtitle = () => {
		if (data.skeleton) {
			return (
				<div className="ibm-label">
					<div className="ibp-container-tile-skeleton-subtitle" />
				</div>
			);
		}
		if (data && mapping && mapping.subtitle) {
			const subtitle = data[mapping.subtitle];
			if (subtitle) {
				return <div className="ibm-label">{subtitle}</div>;
			}
		}
	};

	const buildCustom = () => {
		if (data && mapping && mapping.custom && !data.skeleton) {
			return mapping.custom(data);
		}
	};

	const selectTile = () => {
		if (select) {
			select(data);
		}
	};

	const handleKeyPress = event => {
		if (event.key === 'Enter') {
			selectTile();
		}
	};

	const buildMenu = () => {
		if (menuItems && menuItems.length) {
			return <ItemMenu menuItems={menuItems}
				loading={data.loading}
			/>;
		}
	};

	let defaultClassName = 'ibp-container-tile';
	if (data.skeleton) {
		defaultClassName = defaultClassName + ' ibp-container-tile-skeleton';
	}
	if (className) {
		defaultClassName = defaultClassName + ' ' + className;
	}
	if (isLink) {
		defaultClassName = `${defaultClassName} ibp-container-tile-link`;
	}
	if (data.pending === true) {
		defaultClassName = `${defaultClassName} ibp-container-tile-pending`;
	}
	if (data.visibility === 'archive') {
		defaultClassName = `${defaultClassName} ibp-container-tile-archived`;
	}
	if (activeItem) {
		defaultClassName = `${defaultClassName} ibp-container-tile-selected`;
	}
	if (placeholderTile) {
		defaultClassName = `${defaultClassName} ibp-container-tile-placeholder`;
	}
	return (
		<div
			className={defaultClassName}
			tabIndex={placeholderTile || data.skeleton ? '-1' : '0'}
			onClick={() => selectTile()}
			onKeyPress={event => handleKeyPress(event)}
			id={id}
			role="gridcell"
		>
			{buildTitle()}
			{buildSubtitle()}
			{buildMenu()}
			{buildCustom()}
			{data.new && <div className="ibp-new-item" />}
		</div>
	);
};

ItemContainerTile.propTypes = {
	className: PropTypes.string,
	data: PropTypes.object,
	id: PropTypes.string,
	isLink: PropTypes.bool,
	largeTiles: PropTypes.bool,
	mapping: PropTypes.object,
	menuItems: PropTypes.array,
	select: PropTypes.func,
	activeItem: PropTypes.bool,
	placeholderTile: PropTypes.bool,
};

export default ItemContainerTile;
