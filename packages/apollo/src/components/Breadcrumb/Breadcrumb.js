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
import { withTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, SkeletonText } from 'carbon-components-react';
import { updateState } from '../../redux/commonActions';

const SCOPE = 'breadcrumb';

const BlockchainBreadcrumb = ({ t:translate }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const list = useSelector(state => state.breadcrumb && state.breadcrumb.list);

	const goToBreadcrumb = index => {
		const current = list.length - 1;
		if (index < current) {
			list.splice(index, list.length - index);
			dispatch(updateState(SCOPE, { list: [...list] }));
			navigate(index - current);
		}
	};

	if (!list) {
		return (
			<SkeletonText
				style={{
					height: '1.25rem',
					width: '4rem',
				}}
			/>
		);
	}

	return (
		<div className="ibp-breadcrumb">
			<div className="ibp-breadcrumb-inner">
				<Breadcrumb className="some-class"
					noTrailingSlash={false}
				>
					{list.map((entry, index) => {
						if (!entry.message) {
							return (
								<SkeletonText
									key={'key_' + index}
									style={{
										height: '1.25rem',
										width: '4rem',
									}}
								/>
							);
						}
						if (index === list.length - 1) {
							// don't show current page
							return null;
						}
						return (
							<BreadcrumbItem
								href="#"
								key={'key_' + index}
								onClick={evt => {
									goToBreadcrumb(index);
									evt.preventDefault();
									evt.stopPropagation();
								}}
								isCurrentPage={index === list.length - 1}
							>
								{translate(entry.message, entry.options)}
							</BreadcrumbItem>
						);
					})}
				</Breadcrumb>
			</div>
		</div>
	);
};

BlockchainBreadcrumb.propTypes = {
	// history: PropTypes.any,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default withTranslation()(BlockchainBreadcrumb);
