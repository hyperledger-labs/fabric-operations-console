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
import React from 'react';
import ReactDOM from 'react-dom';
import { LocalizeProvider } from 'react-localize-redux';
import { Provider } from 'react-redux';
import App from './App';
import './index.scss';
import store from './redux/Store';
import { unregister as unregisterServiceWorker } from './registerServiceWorker';

ReactDOM.render(
	<Provider store={store}>
		<LocalizeProvider>
			<App />
		</LocalizeProvider>
	</Provider>,
	document.getElementById('root')
);
unregisterServiceWorker();
