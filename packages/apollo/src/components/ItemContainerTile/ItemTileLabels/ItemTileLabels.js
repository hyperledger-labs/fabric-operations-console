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
import { Cloud16, DocumentImport16, IbmCloud16, WarningAltFilled16, WarningFilled16 } from '@carbon/icons-react/es';
import Helper from '../../../utils/helper';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import * as constants from '../../../utils/constants';

const ItemTileLabels = ({ certificateWarning, custom, isPatchAvailable, location, nodeOU, pending, translate, type }) => {
	const platform = useSelector(state => state['settings'] && state['settings'].platform);

	const renderLocation = () => {
		if (!location) {
			return;
		}
		return (
			<>
				{location !== 'ibm_saas' && <TileLabel icon={<DocumentImport16 className="ibp--item-location-icon" />}
					label={'imported'}
					translate={translate}
				/>}
				<TileLabel
					icon={
						(platform === 'ibmcloud' && location === 'ibm_saas') || location === 'ibmcloud' ? (
							<IbmCloud16 className="ibp--item-location-icon" />
						) : (
							<Cloud16 className="ibp--item-location-icon" />
						)
					}
					label={location ? location : ''}
					translate={translate}
				/>
			</>
		);
	};

	const renderPending = () => {
		if (!pending || (pending !== true && !pending.length)) {
			return;
		}
		return (
			<TileLabel
				icon={<WarningAltFilled16 className="ibp--item-location-icon ibp-item-location-icon-needs-attention" />}
				label={'requires_attention'}
				translate={translate}
			/>
		);
	};

	const renderPatchAvailable = () => {
		if (!isPatchAvailable) {
			return;
		}
		return (
			<TileLabel
				icon={<WarningFilled16 className="ibp--item-location-icon ibp-item-location-icon-patch-available" />}
				label={'patch_available'}
				translate={translate}
			/>
		);
	};

	const renderCertificateWarning = () => {
		if (certificateWarning === undefined) {
			return;
		}
		let showWarning = false;
		if (_.isArray(certificateWarning)) {
			if (Helper.getLongestExpiry(certificateWarning) < constants.CERTIFICATE_WARNING_DAYS) {
				showWarning = true;
			}
		} else if (_.isString(certificateWarning)) {
			if (Helper.getLongestExpiry([certificateWarning]) < constants.CERTIFICATE_WARNING_DAYS) {
				showWarning = true;
			}
		} else if (_.isNumber(certificateWarning)) {
			if (certificateWarning < constants.CERTIFICATE_WARNING_DAYS) {
				showWarning = true;
			}
		} else if (certificateWarning === true) {
			showWarning = true;
		}
		if (!showWarning) {
			return;
		}
		return (
			<TileLabel
				className="ibp-certificate-expiration-warning"
				icon={<WarningFilled16 className="ibp--item-location-icon ibp-item-location-icon-certificate-warning" />}
				label={'cert_warning'}
				translate={translate}
			/>
		);
	};

	const renderNodeOU = () => {
		if (nodeOU === undefined) {
			return;
		}
		return <TileLabel label={translate('node_ou_param', { state: translate(nodeOU ? 'enabled' : 'disabled') })} />;
	};

	const renderCustom = () => {
		if (custom === undefined) {
			return;
		}
		if (_.isString(custom)) {
			return <TileLabel label={custom} />;
		}
		return <TileLabel icon={custom} />;
	};

	return (
		<div className="ibp-item-location-details">
			{renderPending()}
			{renderPatchAvailable()}
			{renderCertificateWarning()}
			{renderNodeOU()}
			{renderCustom()}
			{renderLocation()}
		</div>
	);
};

const TileLabel = ({ className, icon, label, translate }) => {
	return (
		<p className={'ibp-item-tile-details-label' + (className ? ' ' + className : '')}>
			{!!icon && icon}
			{!!label && <span className="ibp-item-location-tile-label">{translate ? translate(label) : label}</span>}
		</p>
	);
};

ItemTileLabels.propTypes = {
	isPatchAvailable: PropTypes.bool,
	location: PropTypes.string,
	pending: PropTypes.array,
	translate: PropTypes.func,
	type: PropTypes.string,
	nodeOU: PropTypes.bool,
	certificateWarning: PropTypes.oneOfType([PropTypes.array, PropTypes.string, PropTypes.number, PropTypes.bool]),
	custom: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
};

TileLabel.propTypes = {
	className: PropTypes.string,
	icon: PropTypes.element,
	label: PropTypes.string,
	translate: PropTypes.func,
};

export default withLocalize(ItemTileLabels);
