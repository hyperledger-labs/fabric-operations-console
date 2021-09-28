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
export const ABSOLUTE_MAX_BYTES_DEFAULT = '10MB';
export const ABSOLUTE_MAX_BYTES_MAX = '99MB';
export const PREFERRED_MAX_BYTES_DEFAULT = '2MB';
export const PREFERRED_MAX_BYTES_MIN = '1B';
export const PREFERRED_MAX_BYTES_MAX = '75MB';
export const TIMEOUT_DEFAULT = '2000ms';
export const TIMEOUT_MIN = '50ms';
export const TIMEOUT_MAX = '5m';
export const MAX_MESSAGE_COUNT_DEFAULT = 500;
export const MAX_MESSAGE_COUNT_MIN = 1;
export const MAX_MESSAGE_COUNT_MAX = 10000;
export const ACTION_COMPONENT_CREATE = 'blockchain.components.create';
export const ACTION_COMPONENT_REMOVE = 'blockchain.components.remove';
export const ACTION_COMPONENT_DELETE = 'blockchain.components.delete';
export const ACTION_COMPONENT_IMPORT = 'blockchain.components.import';
export const ACTION_COMPONENT_EXPORT = 'blockchain.components.export';
export const ACTION_OPTOOLS_RESTART = 'blockchain.optools.restart';
export const ACTION_OPTOOLS_LOGS = 'blockchain.optools.logs';
export const ACTION_OPTOOLS_VIEW = 'blockchain.optools.view';
export const ACTION_OPTOOLS_SETTINGS = 'blockchain.optools.settings';
export const ACTION_ENROLL_MANAGE = 'blockchain.enrollids.manage';
export const ACTION_NOTIFICATIONS_MANAGE = 'blockchain.notifications.manage';
export const ACTION_USERS_MANAGE = 'blockchain.users.manage';
export const ACTION_KEYS_MANAGE = 'blockchain.api_keys.manage';
export const TICK_INTERVAL_MIN = '100ms';
export const TICK_INTERVAL_MAX = '2000ms';
export const ELECTION_TICK_MIN = '2';
export const ELECTION_TICK_MAX = '30';
export const HEARTBEAT_TICK_MIN = '1';
export const HEARTBEAT_TICK_MAX = '3';
export const MAX_INFLIGHT_BLOCKS_MIN = '1';
export const MAX_INFLIGHT_BLOCKS_MAX = '20';
export const SNAPSHOT_INTERVAL_SIZE_MIN = '1MB';
export const SNAPSHOT_INTERVAL_SIZE_MAX = '200MB';
export const SNAPSHOT_INTERVAL_SIZE_DEFAULT = '20MB';
export const DEFAULT_APPLICATION_CAPABILITY = 'V1_4_2';
export const BLOCK_HEIGHT_UPGRADE_THRESHOLD = 100 * 1000;
export const CERTIFICATE_WARNING_DAYS = 30;
export const CERTIFICATE_WARNING_BANNER_DAYS = 30;
export const CERTIFICATE_SHOW_YEARS = 5 * 365;
export const SECONDARY_STATUS_TIMEOUT = 1000 * 60 * 60 * 8; // same as cookie expiration
export const SECONDARY_STATUS_PERIOD = 1 * 60 * 1000;
