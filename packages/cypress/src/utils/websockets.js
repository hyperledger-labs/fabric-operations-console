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

import Logger from '../components/Log/Logger';

const Log = new Logger('WebSockets');
const INITIAL_RECONNECT_DELAY = 500;
const MAX_RECONNECT_DELAY = 30000;
const KEEP_ALIVE = 90000;

const WebSockets = {
	ws: null,
	keep_alive: null,
	reconnect_delay: INITIAL_RECONNECT_DELAY,
	reconnect: null,

	connect() {
		if (!WebSockets.ws) {
			let wsUri = null;
			if (document.location.protocol === 'https:') {
				// use tls in the ws connection
				wsUri = 'wss://' + document.location.hostname + ':' + document.location.port;
			} else {
				wsUri = 'ws://' + document.location.hostname + ':' + document.location.port;
			}
			Log.trace('Connecting to websocket', wsUri);
			WebSockets.ws = new WebSocket(wsUri);
			WebSockets.ws.onopen = WebSockets.onOpen;
			WebSockets.ws.onclose = WebSockets.onClose;
			WebSockets.ws.onmessage = WebSockets.onMessage;
			WebSockets.ws.onerror = WebSockets.onError;
		}
	},

	disconnect() {
		Log.trace('disconnected');
		WebSockets.stopKeepAlive();
		if (WebSockets.reconnect) {
			WebSockets.reconnect = clearTimeout(WebSockets.reconnect);
			WebSockets.reconnect = null;
		}
		WebSockets.ws = null;
	},

	startKeepAlive() {
		WebSockets.stopKeepAlive();
		WebSockets.keep_alive = setInterval(WebSockets.ping, KEEP_ALIVE);
	},

	stopKeepAlive() {
		if (WebSockets.keep_alive) {
			clearInterval(WebSockets.keep_alive);
			WebSockets.keep_alive = null;
		}
	},

	ping() {
		WebSockets.ws.send(JSON.stringify({ type: 'ping' }));
	},

	onOpen() {
		Log.trace('connected');
		WebSockets.startKeepAlive();
		WebSockets.reconnect_delay = INITIAL_RECONNECT_DELAY;
	},

	delayedReconnect() {
		WebSockets.reconnect_delay = (WebSockets.reconnect_delay * 1.35).toFixed(0);
		if (WebSockets.reconnect_delay >= MAX_RECONNECT_DELAY) {
			WebSockets.reconnect_delay = MAX_RECONNECT_DELAY;
		}
		WebSockets.reconnect = setTimeout(() => {
			WebSockets.reconnect = null;
			WebSockets.connect();
		}, WebSockets.reconnect_delay);
	},

	onClose() {
		if (WebSockets.ws) {
			WebSockets.disconnect();
			WebSockets.delayedReconnect();
		}
	},

	onMessage(msg) {
		if (WebSockets.ws && msg && msg.data) {
			Log.info(msg.data);
		}
	},

	onError(evt) {
		if (WebSockets.ws) {
			Log.error(evt);
		}
	},
};

export default WebSockets;
