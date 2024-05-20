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
import { Table16 } from '@carbon/icons-react/es';
import { Checkbox, Button, DataTable } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import plusIcon from '../../assets/images/plus.svg';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import Hover from '../../utils/hover';
import BlockchainPagination from '../BlockchainPagination/BlockchainPagination';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import ItemContainerTile from '../ItemContainerTile/ItemContainerTile';
import ItemMenu from '../ItemMenu/ItemMenu';
import SVGs from '../Svgs/Svgs';

const {
	TableContainer,
	Table,
	TableHead,
	TableRow,
	TableBody,
	TableCell,
	TableHeader,
	TableToolbar,
	TableToolbarSearch,
	TableToolbarContent,
	TableSelectAll,
	TableSelectRow,
} = DataTable;

const SCOPE = 'itemContainer';

class ItemContainer extends Component {
	componentWillUnmount() {
		const data = {
			page: 0,
		};
		this.updateState(data);
	}

	componentDidUpdate(prevProps) {
		if (prevProps !== this.props && prevProps.items !== this.props.items && this.props.searchEnabled) {
			if (this.props.items && this.props.items.length > 0) {
				this.initializeSearch();
			}
		}
		if (prevProps !== this.props && prevProps.items !== this.props.items) {
			if (prevProps.items && this.props.items) {
				if (prevProps.items.length > this.props.items.length) {
					const { page, items } = this.props;
					const pageSize = this.getPageSize();
					// If you delete an item that is the first item on any page except the first,
					// we should go back to the previous paginated page
					if (page > 0 && items.length % pageSize === 0) {
						this.updateState({
							page: page - 1,
						});
					}
				}
			}
		}
	}

	buildSkeletonItem = id => {
		return {
			id,
			skeleton: true,
		};
	};

	buildSkeleton = presentationType => {
		const skeletons = presentationType === 'list' ? 5 : 6;
		const items = [];
		for (let i = 0; i < skeletons; i++) {
			items.push(this.buildSkeletonItem(i + 1));
		}
		return items;
	};

	getViews() {
		const views = [];
		if (this.props.tileMapping) {
			views.push('variableGrid');
		}
		if (this.props.listMapping) {
			views.push('list');
		}
		return views;
	}

	buildHeader(translate) {
		const views = this.getViews();
		const titleBarStyle = {
			justifyContent: this.props.containerTitle ? 'space-between' : 'flex-end',
		};

		if (views.length < 2 || !this.props.items || !this.props.items.length) {
			return (
				<div>
					<div className="ibp-title-bar-container">
						{this.props.containerTitle && this.props.tileMapping && (
							<h3 className="ibp-title-bar-container-header">
								{!this.props.containerTooltip ? (
									translate(this.props.containerTitle)
								) : (
									<BlockchainTooltip triggerText={translate(this.props.containerTitle)}
										direction={this.props.tooltipDirection}
									>
										{translate(this.props.containerTooltip)}
									</BlockchainTooltip>
								)}
							</h3>
						)}
					</div>
					{this.props.tileMapping && this.props.containerDesc && !this.props.containerDescLink && (
						<div className="ibp-title-desc-container">
							<p>{translate(this.props.containerDesc)}</p>
						</div>
					)}
					{this.props.tileMapping && this.props.containerDesc && this.props.containerDescLink && (
						<div className="ibp-title-desc-container">
							<a
								className="ibp-learn-more"
								href={translate(this.props.containerDescLink, { DOC_PREFIX: this.props.docPrefix })}
								target="_blank"
								rel="noopener noreferrer"
							>
								{translate(this.props.containerDesc)}
							</a>
						</div>
					)}
				</div>
			);
		}
		let current = this.props.view;
		if (views.indexOf(current) < 0) {
			// view not supported, use first available view
			current = views[0];
		}
		if (views.length > 1 && !this.props.loading && this.props.items && this.props.items.length) {
			return (
				<div>
					<div className="ibp-title-bar-container"
						style={titleBarStyle}
					>
						{this.props.containerTitle && (
							<h3 className="ibp-title-bar-container-header">
								{!this.props.containerTooltip ? (
									translate(this.props.containerTitle)
								) : (
									<BlockchainTooltip triggerText={translate(this.props.containerTitle)}
										direction={this.props.tooltipDirection}
									>
										{translate(this.props.containerTooltip)}
									</BlockchainTooltip>
								)}
							</h3>
						)}
						<div className="ibp-container-buttons">
							{views.map(view => (
								<button
									key={view}
									id={`${this.props.id}-${view}-button`}
									className={
										`ibp-container-button ${current === view ? 'ibp-active-view-mode' : 'ibp-inactive-view-mode'}
										${view === 'variableGrid' ? 'variableGridButton' : 'listViewButton'}`
									}
									onClick={view === 'variableGrid' ? this.showGrid : this.showList}
									aria-label={view === 'variableGrid' ? 'Toggle grid view' : 'Toggle list view'}
								>
									{view === 'variableGrid' ? (
										<SVGs type={'variableGrid'}
											width="16px"
											height="16px"
											title={'Toggle grid view'}
										/>
									) : (
										<Table16 aria-label={'Toggle list view'}
											className="ibp--svg-white-fill"
										/>
									)}
								</button>
							))}
						</div>
					</div>
					<div className="ibp-title-desc-container">{this.props.containerDesc && <p>{translate(this.props.containerDesc)}</p>}</div>
				</div >
			);
		}
	}

	setContainerView(view) {
		let page = this.props.page || 0;
		const pageSize = this.getPageSize(view);
		while (page * pageSize > this.props.items.length) {
			page--;
		}
		const data = {
			page,
			view,
			searchQuery: '',
			searchResults: [],
		};
		this.updateState(data);
	}

	setContainerPage(page) {
		const data = {
			page: page,
		};
		if (this.props.onPage) {
			this.props.onPage(page, this.getPageSize());
		}
		this.updateState(data);
	}

	showGrid = () => {
		this.setContainerView('grid');
	};

	showList = () => {
		this.setContainerView('list');
	};

	selectItem = item => {
		if (item.loading) {
			return;
		}
		if (this.props.select && !item.loading && !item.skeleton) {
			this.props.select(item);
		}
	};

	buildAddGrid(translate) {
		if (this.props.addItems && this.props.splitTiles) {
			return (
				<div>
					{this.props.addItems.map(addItem => (
						<ItemContainerTile
							key={addItem.id}
							data={{}}
							mapping={{
								custom: () => {
									return (
										<div>
											<p>{translate(addItem.text)}</p>
											<img className="ibp-container-add-plus"
												src={plusIcon}
												alt={translate(addItem.text)}
											/>
										</div>
									);
								},
							}}
							select={this.props.disableAddItem || this.props.loading ? null : addItem.fn}
							className={
								'ibp-container-grid-add ibp-container-grid-add-split-button' +
								(this.props.disableAddItem || this.props.loading ? ' ibp-disable-add-button' : '')
							}
							largeTiles={this.props.largeTiles}
							widerTiles={this.props.widerTiles}
							id={addItem.id}
						/>
					))}
				</div>
			);
		} else if (this.props.addItems && this.props.multiAction) {
			return this.props.addItems.map(addItem => (
				<ItemContainerTile
					key={addItem.id}
					data={{}}
					mapping={{
						custom: () => {
							return (
								<div>
									<p>{translate(addItem.text)}</p>
									<SVGs extendClass={{ 'ibp-container-add-plus': true }}
										type={addItem.icon}
									/>
								</div>
							);
						},
					}}
					select={this.props.disableAddItem || this.props.loading ? null : addItem.fn}
					className={'ibp-container-grid-add' + (this.props.disableAddItem || this.props.loading ? ' ibp-disable-add-button' : '')}
					largeTiles={this.props.largeTiles}
					widerTiles={this.props.widerTiles}
					id={addItem.id}
				/>
			));
		} else if (this.props.addItems) {
			return this.props.addItems.map(item => {
				if (item) {
					return (
						<ItemContainerTile
							data={{}}
							mapping={{
								custom: () => {
									return (
										<div>
											<p>{!this.props.largeTiles && translate(item.text)}</p>
											<img className="ibp-container-add-plus"
												src={plusIcon}
												alt={translate(item.text)}
											/>
										</div>
									);
								},
							}}
							select={this.props.disableAddItem || this.props.loading ? null : item.fn}
							className={
								'ibp-container-grid-add' +
								(this.props.largeTiles ? 'ibp-container-grid-add-small-button' : '') +
								(this.props.disableAddItem || this.props.loading ? ' ibp-disable-add-button' : '')
							}
							key={this.props.id}
							id={this.props.id}
							largeTiles={this.props.largeTiles}
						/>
					);
				}
				return true;
			});
		}
	}

	buildEmptyState(translate, table) {
		const EmptyImage = this.props.emptyImage;

		if (this.props.emptyImage && this.props.emptyTitle && this.props.emptyMessage) {
			return (
				<div className={`ibp-container-empty ${this.props.view === 'variableGrid' ? 'ibp-container-empty-grid' : ''}`}>
					<EmptyImage className="ibp-container-empty-image" />
					<div className="ibp-container-empty-text">
						<div className="ibp-container-empty-title">
							<h4>{translate(this.props.emptyTitle, this.props.emptyTranslationOpts)}</h4>
						</div>
						<div className="ibp-container-empty-message">
							<p>{translate(this.props.emptyMessage, this.props.emptyTranslationOpts)}</p>
						</div>
						{this.props.emptyCustom && this.props.emptyCustom()}
					</div>
				</div>
			);
		}
		if (table && this.props.emptyMessage) {
			return (
				<div className="ibp-empty-table-container">
					{translate(this.props.emptyMessage, this.props.emptyTranslationOpts)}
				</div>
			);
		}
		return false;
	}

	buildGrid(translate) {
		const ariaTitle = this.props.containerTitle ? translate(this.props.containerTitle) : this.props.itemId ? this.props.itemId : '';
		const page = this.props.page ? this.props.page : 0;
		const pageSize = this.getPageSize();
		const start = page * pageSize;
		let items = this.props.items ? this.props.items.slice(start, start + pageSize) : [];
		if (this.props.loading) items = this.buildSkeleton('grid');
		// add another item to listMapping if this.props.seletItem.multiSelect exists
		// to account for the checkbox, this allows the empty row to have the correct width
		return (
			<>
				<div className="ibp__button--container">{this.buildButtons(translate)}</div>
				<div className="ibp-container-grid-box"
					role="grid"
					aria-label={translate(this.props.containerTitle || 'grid_view')}
				>
					{items.length === 0 && this.props.items && this.props.items.length === 0 && this.buildEmptyState(translate)}
					{items.length > 0 && (
						<div
							className={`
							${this.props.largeTiles ? 'ibp-container-grid-large' : ''}
							${this.props.widerTiles ? 'ibp-container-grid-wider-tiles' : ''}
							${items.length === 0 ? 'ibp-container-grid-empty' : ''}
							ibp-container-grid`}
							role="row"
							tabIndex="0"
						>
							{items.map(item => {
								const menuItems = this.props.menuItems ? this.props.menuItems(item) : null;
								return (
									<ItemContainerTile
										key={item.id || item.name || item.msp}
										data={item}
										mapping={this.props.tileMapping}
										select={item.skeleton ? null : this.selectItem}
										largeTiles={this.props.largeTiles}
										menuItems={item.skeleton ? null : menuItems}
										isLink={this.props.isLink}
										activeItem={this.props.selectedItem && !item.skeleton && this.props.selectedItem.id === item.id}
									/>
								);
							})}
						</div>
					)}
					{items.length > 0 && (
						<TableToolbar className="ibp__table--toolbar"
							aria-label={`${ariaTitle} ${translate('data_table_toolbar')}`}
						>
							<TableToolbarContent className="ibp__tile--toolbar--content">{this.buildPagination(translate)}</TableToolbarContent>
						</TableToolbar>
					)}
				</div>
			</>
		);
	}

	buildListDataCell(item, column, translate) {
		if (item.skeleton) {
			return <div className="ibp-container-table-skeleton" />;
		}
		if (column.attr) {
			let text = item[column.attr];
			if (column.translate) {
				text = translate(text);
			}
			return (
				<div style={{ position: 'relative' }}>
					<div onMouseEnter={Hover.onMouseEnter}
						onMouseLeave={Hover.onMouseLeave}
						className="ibp-table-list-cell-container"
					>
						{item.new && <div className="ibp-new-item-row" />}
						{text}
					</div>
				</div>
			);
		}
		if (item.emptyItem) {
			return <span>{item.new && <div className="ibp-new-item-row" />}</span>;
		}
		if (column.custom) {
			return column.custom(item);
		}
	}

	buildButtons(translate) {
		if (this.props.addItems) {
			return this.props.addItems.map((button, i) => {
				if (button) {
					return (
						<Button
							id={`btn-${this.props.itemId}-${button.text}`}
							key={button.text}
							className="ibp__item--button ibp__add--item--button-with-text"
							onClick={button.fn}
							kind={button.kind || (i !== this.props.addItems.length - 1 ? 'secondary' : 'primary')}
							title={!button.tooltip ? (button.title ? translate(button.title) : translate(button.text)) : ''}
							disabled={button.decoupleFromLoading ? (this.props.disableAddItem || button.disabled) :
								(this.props.disableAddItem || this.props.loading || button.disabled)}
						>
							{!button.tooltip && <span className="ibp__button-text bx--type-zeta">{translate(button.text)}</span>}
							{button.tooltip && (
								<BlockchainTooltip noIcon
									triggerText={<span className="ibp__button-text bx--type-zeta">{translate(button.text)}</span>}
								>
									{translate(button.tooltip)}
								</BlockchainTooltip>
							)}
							<SVGs extendClass={{ 'ibp-container-list-add-button-img': true }}
								type={button.icon || 'plus'}
							/>
						</Button>
					);
				}
				return true;
			});
		}
	}

	buildSelectButton(translate, selectedRows, items) {
		if (this.props.selectItem) {
			let selectedRowsWithDetails = []; // As selectedRows provides only id's of selected rows
			items.forEach(row => {
				if (
					selectedRows.find(selectedRow => {
						return selectedRow.id === row.id && !row.disabled;	// do not mass select disabled rows
					})
				) {
					selectedRowsWithDetails.push(row);
				}
			});
			return (
				<div>
					<Button
						id={`btn-${this.props.selectItem.id}`}
						className={`${this.props.selectItem.label ? 'ibp__add--item--button-with-text' : 'ibp__icon--button'}`}
						kind="secondary"
						onClick={() => {
							this.props.selectItem.fn(selectedRowsWithDetails);
						}}
						title={translate(this.props.selectItem.text)}
						disabled={selectedRows.length === 0}
						aria-label={this.props.selectItem.text}
					>
						{this.props.selectItem.label && <span>{translate(this.props.selectItem.label)}</span>}
						{!this.props.selectItem.label && this.props.selectItem.image}
						{this.props.selectItem.label && this.props.selectItem.image && (
							<SVGs type={this.props.selectItem.image}
								extendClass={{ 'ibp-container-list-add-button-img': true }}
							/>
						)}
					</Button>
				</div>
			);
		}
	}

	getCurrentView() {
		const views = this.getViews();
		let view = this.props.view;
		if (!view || views.indexOf(this.props.view) < 0) {
			// view not supported, use first available view
			view = views[0];
		}
		return view;
	}

	getPageSize(view) {
		if (!view) {
			view = this.getCurrentView();
		}
		if (this.props.pageSize) {
			return this.props.pageSize;
		}
		if (view === 'list') {
			return 10;
		}
		if (this.props.maxTilesPerPagination) {
			return this.props.maxTilesPerPagination;
		}
		return 15;
	}

	buildPagination(translate) {
		const { searchQuery, searchResults } = this.props;
		const page = this.props.page ? this.props.page : 0;
		const pageSize = this.getPageSize();
		const len = searchQuery && searchQuery.length ? searchResults.length : this.props.itemCount || (this.props.items ? this.props.items.length : 0);
		if (this.props.loading) {
			return (
				<div className="ibp-container-list-page">
					<div className="ibp-container-table-skeleton ibp-container-pagination-skeleton" />
				</div>
			);
		} else {
			return (
				<div className="ibp-container-list-page">
					<BlockchainPagination
						id={'pagination_' + this.props.id}
						backwardText={translate('prev_pg')}
						forwardText={translate('next_pg')}
						itemRangeText={(min, max, total) => {
							return min + ' - ' + max + ' ' + translate(total > 1 ? 'of_n_items' : 'of_1_item', { n: total });
						}}
						pageRangeText={(current, total) => {
							return '/ ' + total;
						}}
						itemsPerPageText=""
						pageNumberText=""
						totalItems={len}
						pageSize={pageSize}
						pageSizes={[pageSize]}
						page={page + 1}
						onChange={e => {
							this.setContainerPage(e.page - 1);
						}}
						translate={translate}
					/>
				</div>
			);
		}
	}

	buildListMenu(row) {
		if (this.props.menuItems) {
			if (row.skeleton || !this.props.menuItems(row)) {
				return <TableCell />;
			}
			return (
				<TableCell>
					<ItemMenu menuItems={this.props.menuItems(row)}
						loading={row.loading}
					/>
				</TableCell>
			);
		}
	}

	getCellClassName(column) {
		let cName = 'ibp-container-cell-item';
		if (column.header === 'upgradable') {
			cName = 'ibp-upgrade-available';
		}
		if (this.props.isLink) {
			if (cName) {
				cName = cName + ' ';
			}
			cName = cName + 'ibp-container-link';
		}
		return cName;
	}

	getTextContent(custom) {
		let txt = null;
		if (_.isString(custom)) {
			txt = custom;
		} else {
			if (custom.props && custom.props.children) {
				custom.props.children.forEach(child => {
					let child_txt = this.getTextContent(child);
					if (child_txt) {
						if (txt) {
							txt = txt + ' ' + child_txt;
						} else {
							txt = child_txt;
						}
					}
				});
			}
		}
		return txt;
	}

	initializeSearch() {
		const { items, listMapping, t:translate } = this.props;
		const searchSettings = [];
		if (listMapping) {
			const lang = document.documentElement.getAttribute('lang');
			if (items) {
				items.forEach(item => {
					let searchItem = { originalItem: item };
					let custom_count = 0;
					listMapping.forEach(column => {
						if (column.attr) {
							if (item[column.attr] !== undefined && item[column.attr] !== null) {
								let test = String(item[column.attr]);
								if (column.translate) {
									test = translate(test);
								}
								searchItem[column.attr] = test.toLocaleLowerCase(lang);
							}
						}
						if (column.custom) {
							let custom = this.getTextContent(column.custom(item));
							if (custom) {
								searchItem['custom_' + custom_count++] = custom.toLocaleLowerCase(lang);
							}
						}
					});
					searchSettings.push(searchItem);
				});
			}
			this.updateState({
				searchSettings,
			});
		}
		return searchSettings;
	}

	handleSearch = event => {
		let { searchSettings } = this.props;

		// use the custom search instead, reset page to 0 though
		if (this.props.customSearch && typeof this.props.customSearch === 'function') {
			this.updateState({
				page: 0
			});
			return this.props.customSearch(event.target.value);
		}


		if (!searchSettings) {
			searchSettings = this.initializeSearch();
		}
		let page = this.props.page ? this.props.page : 0;
		let searchQuery = event.target.value;
		let searchResults = [];
		if (searchQuery) {
			const lang = document.documentElement.getAttribute('lang');
			searchQuery = searchQuery.toLocaleLowerCase(lang);
			if (searchSettings) {
				searchSettings.forEach(searchItem => {
					let match = false;
					for (let attr in searchItem) {
						if (attr !== 'originalItem') {
							if (searchItem[attr].indexOf(searchQuery) !== -1) {
								match = true;
							}
						}
					}
					if (match) {
						searchResults.push(searchItem.originalItem);
					}
				});
			}
			page = 0;
		} else {
			searchQuery = '';
		}
		this.updateState({
			searchQuery,
			searchResults,
			page,
		});
	};

	updateState = data => {
		const allData = {};
		allData[this.props.itemId] = {
			page: this.props.page,
			view: this.props.view,
			searchAttributes: this.props.searchAttributes,
			searchSettings: this.props.searchSettings,
			searchQuery: this.props.searchQuery,
			searchResults: this.props.searchResults,
			...data,
		};
		this.props.updateState(SCOPE, allData);
	};

	buildList(translate) {
		const { loading, searchEnabled, searchQuery, searchResults } = this.props;
		const page = this.props.page ? this.props.page : 0;
		const pageSize = this.getPageSize('list');
		const start = page * pageSize;
		let items = this.props.items ? this.props.items.slice(start, start + pageSize) : [];
		if (loading) items = this.buildSkeleton('list');
		const renderedItems = searchQuery && searchQuery.length ? searchResults.slice(start, start + pageSize) : items;
		const rows = [];
		const headers = [];
		let column_count = 0;
		this.props.listMapping.forEach(column => {
			if (!column.width) {
				column.width = 1;
			}
			column_count = column_count + column.width;
		});

		this.props.listMapping.forEach(column => {
			let width = this.props.menuItems ? 95 : 100;
			width = Math.floor((width * column.width) / column_count) + '%';
			headers.push({
				...column,
				key: column.attr ? column.attr : column.header,
				header: translate(column.header),
				width,
			});
		});
		if (this.props.menuItems) {
			headers.push({
				key: 'actions',
				header: '',
				width: '5%',
			});
		}
		renderedItems.forEach(item => {
			rows.push({ id: '' + (item.id || item.name) });
		});
		const ariaTitle = this.props.containerTitle ? translate(this.props.containerTitle) : this.props.itemId ? this.props.itemId : '';
		const multiSelect = this.props.selectItem && this.props.selectItem.multiSelect;
		return (
			<div className={`ibp-container-list ${!items.length ? 'ibp-container-empty-list' : ''}`}>
				<DataTable
					headers={headers}
					rows={rows}
					render={({ rows, headers, getHeaderProps, getSelectionProps, selectedRows }) => (
						<TableContainer id={this.props.id}>
							{this.props.containerTitle && !this.props.tileMapping &&
								<h3 className="ibp-container-title">
									{!this.props.containerTooltip ? (
										translate(this.props.containerTitle)
									) : (
										<BlockchainTooltip triggerText={translate(this.props.containerTitle)}
											direction={this.props.tooltipDirection}
										>
											{translate(this.props.containerTooltip)}
										</BlockchainTooltip>
									)}
								</h3>
							}
							{this.props.containerDesc && !this.props.containerDescLink && !this.props.tileMapping && (
								<div className="ibp-title-desc-container">
									<p>{translate(this.props.containerDesc)}</p>
								</div>
							)}
							{this.props.containerDesc && this.props.containerDescLink && !this.props.tileMapping && (
								<div className="ibp-title-desc-container">
									<a
										className="ibp-learn-more"
										href={translate(this.props.containerDescLink, { DOC_PREFIX: this.props.docPrefix })}
										target="_blank"
										rel="noopener noreferrer"
									>
										{translate(this.props.containerDesc)}
									</a>
								</div>
							)}
							{(this.props.selectItem || this.props.addItems) && (
								<div className="ibp__button--container">
									{searchEnabled && (
										<TableToolbarSearch
											className='searchBox'
											onChange={event => this.handleSearch(event)}
											labelText={translate(`find_${this.props.itemId}`)}
											persistent={true}
										/>
									)}
									<div className="ibp__button--container">
										{this.buildSelectButton(translate, selectedRows, items)}
										{this.buildButtons(translate)}
									</div>
								</div>
							)}
							<Table useZebraStyles={false}
								id={`table-${this.props.itemId}`}
								className="ibp__peer--table"
							>
								<TableHead>
									<TableRow>
										{this.props.selectItem && <TableSelectAll {...getSelectionProps()}
											disabled={!this.props.selectItem.multiSelect}
										/>}
										{headers.map(header => (
											<TableHeader key={header.key}
												style={{ width: header.width }}
											>
												{header.header}
											</TableHeader>
										))}
									</TableRow>
								</TableHead>
								<TableBody>
									{renderedItems.map((row, i) => (
										<TableRow
											key={row.id || row.name || `${row.email}-${i}`}
											className={
												(row.new ? 'ibp-new-item' : '') + (this.props.isLink ? ' ibp-row-link' : '') + (loading ? 'ibp-row-loading' : '') + ' ibp-table-row'
											}
											id={`${this.props.id}-row-${i}`}
											tabIndex={loading ? '-1' : '0'}
											onKeyDown={evt => {
												if (evt.which === 13 || evt.which === 32) {
													this.selectItem(row);
												}
											}}
										>
											{row.disabled && multiSelect && (
												<TableCell
													key={(row.id || row.name) + '_' + i}
													id={`${this.props.id}-${i}`}
												>
													<Checkbox
														id={`${this.props.id}-${i}-disabled`}
														checked={false}
														disabled={true}
														labelText=''
													/>
												</TableCell>
											)}
											{!row.disabled && multiSelect && (
												<TableSelectRow
													disabled={
														row.disabled ||
														(!this.props.selectItem.multiSelect &&
															selectedRows.length > 0 &&
															rows.find(arow => {
																return arow.id === row.id;
															}).isSelected === false)
													}
													{...getSelectionProps({
														row: rows.find(arow => {
															return arow.id === row.id;
														}),
													})}
												/>
											)}
											{this.props.listMapping.map((column, index) => (
												<TableCell
													key={(row.id || row.name) + '_' + column.header}
													onClick={() => {
														this.selectItem(row);
													}}
													className={this.getCellClassName(column.header)}
													id={`${this.props.id}-${column.header}-${i}`}
													style={{ width: column.width }}
												>
													{this.buildListDataCell(row, headers[index], translate)}
												</TableCell>
											))}
											{this.buildListMenu(row)}
										</TableRow>
									))}
								</TableBody>
							</Table>
							{items.length > 0 && (
								<TableToolbar className="ibp__table--toolbar"
									aria-label={`${ariaTitle} ${translate('data_table_toolbar')}`}
								>
									<TableToolbarContent className="ibp__table--toolbar--content">{this.buildPagination(translate)}</TableToolbarContent>
								</TableToolbar>
							)}
						</TableContainer>
					)}
				/>
				{items.length === 0 && this.props.items && this.props.items.length === 0 && this.buildEmptyState(translate, true)}
			</div>
		);
	}

	buildContainer(translate) {
		const views = this.getViews();
		let view = this.props.view;
		if (views.indexOf(this.props.view) < 0) {
			// view not supported, use first available view
			view = views[0];
		}
		switch (view) {
			case 'list':
				return this.buildList(translate);
			default:
				return this.buildGrid(translate);
		}
	}

	render() {
		const { t: translate } = this.props;
		return (
			<div className="ibp-item-container">
				{this.buildHeader(translate)}
				{this.buildContainer(translate)}
			</div>
		);
	}
}

const dataProps = {
	page: PropTypes.number,
	view: PropTypes.string,
	searchAttributes: PropTypes.array,
	searchSettings: PropTypes.array,
	searchQuery: PropTypes.string,
	searchResults: PropTypes.array,
};

ItemContainer.propTypes = {
	...dataProps,
	containerTitle: PropTypes.string,
	containerDesc: PropTypes.string,
	containerDescLink: PropTypes.string,
	containerTooltip: PropTypes.string,
	tooltipDirection: PropTypes.string,
	emptyMessage: PropTypes.string,
	emptyTitle: PropTypes.string,
	emptyTranslationOpts: PropTypes.object,
	emptyCustom: PropTypes.func,
	itemId: PropTypes.string,
	id: PropTypes.string,
	tileMapping: PropTypes.object,
	items: PropTypes.array,
	addItem: PropTypes.object,
	selectItem: PropTypes.object,
	listMapping: PropTypes.array,
	multiAction: PropTypes.bool,
	pageSize: PropTypes.number,
	loading: PropTypes.bool,
	largeTiles: PropTypes.bool,
	itemCount: PropTypes.number,
	disableAddItem: PropTypes.bool,
	selectedItem: PropTypes.object,
	searchEnabled: PropTypes.bool,
	updateState: PropTypes.func,
	select: PropTypes.func,
	menuItems: PropTypes.func,
	onPage: PropTypes.func,
	widerTiles: PropTypes.bool,
	maxTilesPerPagination: PropTypes.number,
	t: PropTypes.func, // Provided by withTranslation()
	customSearch: PropTypes.func,
};

export default connect(
	(state, props) => {
		let newProps = Helper.mapStateToProps(state[SCOPE] ? state[SCOPE][props.itemId] : {}, dataProps);
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(ItemContainer));
