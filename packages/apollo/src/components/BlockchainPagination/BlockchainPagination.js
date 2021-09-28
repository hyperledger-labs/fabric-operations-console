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

import React from 'react';
import PropTypes from 'prop-types';
import { Pagination } from 'carbon-components-react';

const BlockchainPagination = ({
	id,
	backwardText,
	forwardText,
	itemRangeText,
	pageRangeText,
	itemsPerPageText,
	pageNumberText,
	totalItems,
	pageSize,
	pageSizes,
	page,
	onChange,
	translate,
}) => {
	let min = (page - 1) * pageSize + 1;
	let max = page * pageSize;
	if (max > totalItems) max = totalItems;
	let pages = Math.floor((totalItems - 1) / pageSize) + 1;
	if (pages < 100) {
		// If we have less than 100 pages, use the Carbon Pagination control that provides a dropdown
		// to select a new page
		return (
			<Pagination
				id={id}
				backwardText={backwardText}
				forwardText={forwardText}
				itemRangeText={itemRangeText}
				pageRangeText={pageRangeText}
				itemsPerPageText={itemsPerPageText}
				pageNumberText={pageNumberText}
				totalItems={totalItems}
				pageSize={pageSize}
				pageSizes={pageSizes}
				page={page}
				onChange={onChange}
			/>
		);
	}
	return (
		<div id={id}
			className="bx--pagination"
		>
			<div className="bx--pagination__left">
				<span className="bx--pagination__text">{itemRangeText(min, max, totalItems)}</span>
			</div>
			<div className="bx--pagination__right">
				<span className="bx--pagination__text">
					<input
						id={id + '-input'}
						style={{
							background: 'transparent',
							color: 'inherit',
							fontSize: 'inherit',
							border: 'none',
						}}
						type="number"
						min={1}
						max={pages}
						value={page}
						onChange={evt => {
							let value = Number(evt.target.value);
							if (isNaN(value)) value = 1;
							if (value < 1) value = 1;
							if (value > pages) value = pages;
							value = Math.floor(value);
							onChange({ page: value });
						}}
						aria-label={translate('page_number', { n: pages })}
					/>
					{pageRangeText(page, pages)}
				</span>
				<button
					type="button"
					className="bx--pagination__button bx--pagination__button--backward"
					aria-label={backwardText}
					onClick={() => {
						onChange({ page: page - 1 });
					}}
					disabled={page < 2}
				>
					<svg
						focusable="false"
						preserveAspectRatio="xMidYMid meet"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 32 32"
						aria-hidden="true"
					>
						<path d="M20 24L10 16 20 8z"></path>
					</svg>
				</button>
				<button
					type="button"
					className="bx--pagination__button bx--pagination__button--forward"
					aria-label={forwardText}
					onClick={() => {
						onChange({ page: page + 1 });
					}}
					disabled={page >= pages}
				>
					<svg
						focusable="false"
						preserveAspectRatio="xMidYMid meet"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 32 32"
						aria-hidden="true"
					>
						<path d="M12 8L22 16 12 24z"></path>
					</svg>
				</button>
			</div>
		</div>
	);
};

BlockchainPagination.propTypes = {
	id: PropTypes.string,
	backwardText: PropTypes.string,
	forwardText: PropTypes.string,
	itemRangeText: PropTypes.func,
	pageRangeText: PropTypes.func,
	itemsPerPageText: PropTypes.string,
	pageNumberText: PropTypes.string,
	totalItems: PropTypes.number,
	pageSize: PropTypes.number,
	pageSizes: PropTypes.array,
	page: PropTypes.number,
	onChange: PropTypes.func,
	translate: PropTypes.func,
};

export default BlockchainPagination;
