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
import Download20 from '@carbon/icons-react/lib/download/20';
import Settings20 from '@carbon/icons-react/lib/settings/20';
import Restart20 from '@carbon/icons-react/lib/restart/20';
import Trash20 from '@carbon/icons-react/lib/trash-can/20';
import { Button, SkeletonPlaceholder, SkeletonText } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import SVGs from '../Svgs/Svgs';
import IdentityExpiration from '../IdentityExpiration/IdentityExpiration';

const StickySection = ({
	associateIdentityLabel,
	identityNotAssociatedLabel,
	title,
	details,
	openSettings,
	refreshCerts,
	exportNode,
	loading,
	groups,
	exporting,
	noIdentityAssociation,
	hideDelete,
	hideExport,
	hideRefreshCerts,
	type,
	translate,
	calloutGroups,
	quickActions,
	custom,
}) => {
	const renderAssociation = (identity, msp_id) => {
		if (!identity) {
			if (!identityNotAssociatedLabel) {
				return;
			}
			return (
				<button
					className="ibp-node-details-association ibp-error-node-not-associated-container"
					key={msp_id ? msp_id : 'msp_id'}
					onClick={() => openSettings('associate')}
				>
					<div className="ibp-identity-information">
						<div>
							{msp_id && <span className="ibp-associated-msp">{msp_id}: </span>}
							&mdash;
						</div>
						<p>{translate(identityNotAssociatedLabel)}</p>
					</div>
					<div className="ibp-identity-icon">
						<SVGs type="error"
							width="16px"
							height="16px"
						/>
					</div>
				</button>
			);
		}
		if (!associateIdentityLabel) {
			return;
		}
		return (
			<button className="ibp-node-details-association"
				key={msp_id ? msp_id : 'msp_id'}
				onClick={() => openSettings('associate')}
			>
				<div className="ibp-identity-information">
					{msp_id && <span className="ibp-associated-msp">{msp_id}: </span>}
					{identity.name}
					<p>{translate(associateIdentityLabel)}</p>
					<IdentityExpiration identity={identity.name}
						details={details}
					/>
				</div>
				<div className="ibp-identity-icon">
					<SVGs type="arrowRight"
						width="16px"
						height="16px"
					/>
				</div>
			</button>
		);
	};

	const renderOrdererAssociations = () => {
		const msps = {};
		details.raft.forEach(node => {
			if (msps[node.msp_id] === undefined) {
				msps[node.msp_id] = null;
				if (details.associatedIdentities) {
					details.associatedIdentities.forEach(identity => {
						if (identity.msp_id === node.msp_id) {
							msps[node.msp_id] = identity;
						}
					});
				}
			}
		});
		details.pending.forEach(node => {
			if (msps[node.msp_id] === undefined) {
				msps[node.msp_id] = null;
				if (details.associatedIdentities) {
					details.associatedIdentities.forEach(identity => {
						if (identity.msp_id === node.msp_id) {
							msps[node.msp_id] = identity;
						}
					});
				}
			}
		});
		const html = [];
		const msp_ids = Object.keys(msps);
		msp_ids.forEach(msp_id => {
			html.push(renderAssociation(msps[msp_id], msp_id));
		});
		return html;
	};

	const renderAssociations = () => {
		if (noIdentityAssociation) {
			return;
		}
		if (loading || !details) {
			return (
				<SkeletonPlaceholder
					style={{
						height: '5.125rem',
						width: '100%',
						borderBottom: '2px solid transparent',
					}}
				/>
			);
		}
		if (details.raft) {
			return renderOrdererAssociations();
		}
		return renderAssociation({
			name: details.associatedIdentity,
		});
	};

	const renderCustom = () => {
		if (custom) {
			return custom();
		}
	};

	return (
		<div className="ibp--node-details-sticky-container-content">
			<div className="ibp--node-details-sticky-header">
				<p className="ibp-node-detail-title">{translate(title)}</p>
				<div className="ibp-node-detail-icons">
					{details && (details.id || details.name) && !loading ? (
						<Button
							id={`${details.id || details.name}-sticky-settings-button`}
							className="ibp-detail-page-icon-button"
							kind="secondary"
							size="small"
							renderIcon={Settings20}
							iconDescription={translate('settings')}
							tooltipPosition="bottom"
							tooltipAlignment="center"
							onClick={() => openSettings('settings')}
							hasIconOnly
						/>
					) : (
						<SkeletonPlaceholder
							style={{
								cursor: 'pointer',
								height: '2rem',
								width: '2rem',
							}}
						/>
					)}
					{!hideRefreshCerts &&
						(details && (details.id || details.name) ? (
							<Button
								id={`${details.id || details.name}-sticky-refresh-button`}
								className="ibp-detail-page-icon-button"
								kind="secondary"
								size="small"
								renderIcon={Restart20}
								iconDescription={translate('refresh_certs')}
								tooltipPosition="bottom"
								tooltipAlignment="center"
								onClick={() => refreshCerts()}
								hasIconOnly
							/>
						) : (
							<SkeletonPlaceholder
								style={{
									cursor: 'pointer',
									height: '2rem',
									width: '2rem',
								}}
							/>
						))}
					{!hideExport &&
						(details && (details.id || details.name) && !exporting ? (
							<Button
								id={`${details.id || details.name}-sticky-download-button`}
								className="ibp-detail-page-icon-button"
								kind="secondary"
								size="small"
								renderIcon={Download20}
								iconDescription={translate('export')}
								tooltipPosition="bottom"
								tooltipAlignment="center"
								onClick={() => exportNode()}
								hasIconOnly
							/>
						) : (
							<SkeletonPlaceholder
								style={{
									cursor: 'pointer',
									height: '2rem',
									width: '2rem',
								}}
							/>
						))}
					{!hideDelete &&
						(details && (details.id || details.name) ? (
							<Button
								id={`${details.id || details.name}-sticky-delete-button`}
								className="ibp-detail-page-icon-button"
								kind="secondary"
								size="small"
								renderIcon={Trash20}
								iconDescription={translate('delete')}
								tooltipPosition="bottom"
								tooltipAlignment="center"
								onClick={() => openSettings('delete')}
								hasIconOnly
							/>
						) : (
							<SkeletonPlaceholder
								style={{
									cursor: 'pointer',
									height: '2rem',
									width: '2rem',
								}}
							/>
						))}
				</div>
			</div>
			{groups && groups.length > 0 && (
				<div className="ibp--sticky-section-main-content">
					{groups.map(item => (
						<div className="ibp--sticky-section-group"
							key={item.label}
						>
							<h4 className="ibp--sticky-section-header">{translate(item.label)}</h4>
							{item.loadingData ? (
								<SkeletonText
									style={{
										paddingTop: '.5rem',
										width: '8rem',
									}}
								/>
							) : (details || type === 'channel') && item.value && Array.isArray(item.value) ? (
								item.value.map((_item, idx) => (
									<p key={`item-${idx}`}
										className="ibp--sticky-section-item"
									>
										{_item}
									</p>
								))
							) : (
								<p className="ibp--sticky-section-item">{item.value}</p>
							)}
						</div>
					))}
				</div>
			)}
			{calloutGroups &&
				calloutGroups.length > 0 &&
				calloutGroups.map(item => (
					<div
						className={`ibp--sticky-section-callout-group-container ${item.label === 'last_transaction' ? 'ibp--sticky-section-tx-container' : ''}`}
						key={item.label}
					>
						<div className="ibp--sticky-section-group">
							<h4 className="ibp--sticky-section-header">{translate(item.label)}</h4>
							{item.loadingData ? (
								<SkeletonText
									style={{
										paddingTop: '.5rem',
										width: '8rem',
									}}
								/>
							) : (
								<h3 id={`${item.id || item.label}_item`}
									className="ibp--sticky-section-item"
								>
									{(details || type === 'channel') && item.value && item.value}
								</h3>
							)}
						</div>
					</div>
				))}

			{quickActions && quickActions.length > 0 && (
				<div className="ibp--sticky-section-quick-actions-container">
					<p className="ibp--sticky-section-header">{translate('quick_actions')}</p>
					{quickActions.map(item => (
						<div className="ibp--sticky-section-group"
							key={item.label}
						>
							{item.loadingData ? (
								<SkeletonText
									style={{
										paddingTop: '.5rem',
										width: '8rem',
									}}
								/>
							) : (
								<button className="ibp--sticky-section-item-button"
									onClick={item.quickAction}
								>
									{(details || type === 'channel') && item.label && translate(item.label)}
								</button>
							)}
						</div>
					))}
				</div>
			)}
			{renderAssociations()}
			{renderCustom()}
		</div>
	);
};

StickySection.propTypes = {
	associateIdentityLabel: PropTypes.string,
	identityNotAssociatedLabel: PropTypes.string,
	details: PropTypes.object,
	openSettings: PropTypes.func,
	refreshCerts: PropTypes.func,
	title: PropTypes.string,
	exportNode: PropTypes.func,
	loading: PropTypes.bool,
	groups: PropTypes.array,
	calloutGroups: PropTypes.array,
	exporting: PropTypes.bool,
	noIdentityAssociation: PropTypes.bool,
	hideDelete: PropTypes.bool,
	hideExport: PropTypes.bool,
	hideRefreshCerts: PropTypes.bool,
	type: PropTypes.string,
	quickActions: PropTypes.array,
	custom: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(StickySection);
