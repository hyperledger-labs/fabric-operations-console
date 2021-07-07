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
//import async from 'async';
import Logger from '../components/Log/Logger';
import IdentityApi from './IdentityApi';
import { RestApi } from './RestApi';

const Log = new Logger('TemplateRestApi');

//const TEMPLATE_CHECK_TIMEOUT = 5000;

class TemplateRestApi {
	static dispatch = null;
	static scope = null;

	static getTemplates(skip_cache) {
		return RestApi.get('/api/v2/templates', skip_cache);
	}

	static validate(template) {
		return new Promise((resolve, reject) => {
			const body = {
				...template,
				only_validate: true,
			};
			RestApi.post('/api/v2/templates/build', body)
				.then(resp => {
					if (!resp.valid_template) {
						reject('template_not_valid');
					}
					const counts = {
						resp: resp,
						enroll_ids: 0,
						cas: 0,
						peers: 0,
						orderers: 0,
					};
					resp.resolved_components.forEach(comp => {
						if (counts[comp.type]) {
							counts[comp.type]++;
						} else {
							counts[comp.type] = 1;
						}
					});
					resolve(counts);
				})
				.catch(error => {
					Log.error(error);
					reject(error);
				});
		});
	}

	static createIdentities(ids_2_import) {
		const allIdentities = [];
		for (let i in ids_2_import) {
			const data = ids_2_import[i];
			Log.info('setting up data...', i, data);
			allIdentities.push(IdentityApi.createIdentity([data]));
		}
		Promise.all(allIdentities)
			.then(identities => {
				Log.info('import success');
				Log.info(identities);
			})
			.catch(error => {
				Log.info('import failure', error);
			});
	}

	static checkTemplateStatus(url) {
		Log.info(url);
		return new Promise((resolve, reject) => {
			RestApi.get(url)
				.then(json => {
					Log.info(json);
					resolve(json);
				})
				.catch(error => {
					Log.error(error);
					reject(error);
				});
		});
	}

	static build(template) {
		Log.info(template);
		return new Promise((resolve, reject) => {
			const body = {
				...template,
				only_validate: false,
			};
			Log.info('building template', body);
			RestApi.post('/api/v2/templates/build', body)
				.then(resp => {
					Log.info(resp);
					let url_path = resp.poll_url;
					const pos = url_path.indexOf('/ak/api');
					if (pos >= 0) {
						// remove the "*/ak" part, don't have the auth for it
						url_path = url_path.substring(pos + 3);
					}
					Log.trace('url_path:', url_path);
					resolve(resp);
				})
				.catch(error => {
					Log.error(error);
					reject(error);
				});
		});
	}

	static getStartedTemplates(cb) {
		RestApi.get('/api/v2/webhooks/templates')
			.then(resp => {
				if (!resp || !resp.template_webhooks) {
					return cb(null, null);
				} else {
					return cb(null, resp.template_webhooks); // return the template progress data
				}
			})
			.catch(error => {
				return cb(error);
			});
	}

	static updateTemplateStatus(txId, updatedTemplate) {
		return new Promise((resolve, reject) => {
			RestApi.put(`/api/v2/webhooks/txs/${txId}`, {
				...updatedTemplate,
			})
				.then(result => {
					resolve(result);
				})
				.catch(error => {
					reject(error);
				});
		});
	}
}

export default TemplateRestApi;
