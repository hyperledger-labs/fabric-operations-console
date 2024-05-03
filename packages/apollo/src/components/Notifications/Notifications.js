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
import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { withTranslation, Trans } from 'react-i18next';
import { ToastNotification, InlineLoading } from 'carbon-components-react';
import { updateState } from '../../redux/commonActions';

const SCOPE = 'notifications';

const Notifications = ({ t: translate }) => {
	const dispatch = useDispatch();
	const list = useSelector(state => state[SCOPE] && state[SCOPE].list);
	const clearNotifications = id => {
		const filteredList = [];
		list.forEach(notify => {
			if (notify.id !== id) {
				filteredList.push(notify);
			}
		});
		dispatch(updateState(SCOPE, { list: filteredList }));
	};

	if (!list) {
		return null;
	}

	return list.length ? (
		<div className="ibp-notifications">
			{list.map(notify => {
				if (notify.autoClose && !notify.timer) {
					const timeout = _.isNumber(notify.autoClose) ? notify.autoClose : 10000;
					notify.timer = setTimeout(() => {
						clearNotifications(notify.id);
					}, timeout);
				}
				// Support showing translated `Error` instances
				if (notify.error && notify.error.translation) {
					const translation = notify.error.translation;
					notify.message = translation.title;
					notify.details = translation.message;
					notify.options = translation.params;
				}
				return (
					<ToastNotification
						id={'notification_' + notify.id}
						kind={notify.type}
						title={<Trans>{translate(notify.message, notify.options)}</Trans>}
						subtitle={notify.details ? <Trans>{translate(notify.details, notify.options)}</Trans> : ''}
						iconDescription={translate('close')}
						onCloseButtonClick={() => {
							clearNotifications(notify.id);
						}}
						caption={notify.type === 'info' ? '' : new Date(notify.id).toLocaleString()}
						style={{
							backgroundColor: '#fff',
							color: '#202529',
							minWidth: '18rem',
							marginBottom: '.5rem',
						}}
						key={notify.id}
						hideCloseButton={notify.type === 'info'}
						className={notify.type === 'info' ? 'ibp-info-notification' : ''}
					>
						{notify.type === 'info' && notify.loading === true && <InlineLoading className="ibp-notification-icon-spin" />}
						{notify.type === 'info' && notify.customMessage && notify.customMessage}
					</ToastNotification>
				);
			})}
		</div>
	) : null;
};

Notifications.propTypes = {
	t: PropTypes.func,
};

export default withTranslation()(Notifications);
