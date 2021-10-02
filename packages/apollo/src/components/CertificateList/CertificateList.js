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
import { WarningFilled16 } from '@carbon/icons-react/es';
import PropTypes from 'prop-types';
import React from 'react';
import StitchApi from '../../rest/StitchApi';
import * as constants from '../../utils/constants';

const CertificateList = ({ certs, parsed }) => {
	const parseCertificates = () => {
		const list = [];
		if (certs) {
			certs.forEach(cert => {
				list.push(StitchApi.parseCertificate(cert));
			});
		}
		return list;
	};

	const renderList = () => {
		const list = parsed || parseCertificates() || [];
		const timeNow = new Date().getTime();
		return list.map((cert, index) => {
			const exp = new Date(cert.not_after_ts).toLocaleString();
			const diff = cert.not_after_ts - timeNow;
			const days = diff / (1000 * 3600 * 24);
			return (
				<div className="ibp-certificate-details"
					key={`cert-${index}`}
				>
					{list.length > 1 && (
						<>
							{cert.serial_number_hex.substring(0, 4) + '...' + cert.serial_number_hex.substring(cert.serial_number_hex.length - 4)}
							:&nbsp;
						</>
					)}
					{days < constants.CERTIFICATE_WARNING_DAYS ? (
						<span className="ibp-cert-expiry">
							<WarningFilled16 />
							{exp}
						</span>
					) : (
						<span>{exp}</span>
					)}
				</div>
			);
		});
	};

	return <div className="ibp-certificate-list">{renderList()}</div>;
};

CertificateList.propTypes = {
	certs: PropTypes.array,
	parsed: PropTypes.array,
};

export default CertificateList;
