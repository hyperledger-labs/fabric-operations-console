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
//-------------------------------------------------------------
// cache.js - supplemental file for app.js
//-------------------------------------------------------------
module.exports = function (logger, ev, tools) {
	const cache = {};

	// CouchDB's Cache
	const cloudant_opts = {
		stdTTL: 15,				// the default expiration in seconds
		checkperiod: 15,		// the period in seconds for the delete check interval
		deleteOnExpire: true	// if true variables will be deleted automatically when they expire
	};
	const cl_cache = new tools.NodeCache(cloudant_opts);
	tools.otcc = require('../libs/ot_cache_couch.js')(logger, ev, tools, tools.couch_lib, cl_cache);

	// IAM's Cache
	const iam_opts = {
		stdTTL: 60,				// the default expiration in seconds
		checkperiod: 120,		// the period in seconds for the delete check interval
		deleteOnExpire: true	// if true variables will be deleted automatically when they expire
	};
	const iam_cache = new tools.NodeCache(iam_opts);
	tools.iam_lib = require('../libs/iam_lib.js')(logger, ev, tools, iam_cache);

	// Proxy's Cache
	const proxy_cache_opts = {
		stdTTL: 120,			// the default expiration in seconds
		checkperiod: 240,		// the period in seconds for the delete check interval
		deleteOnExpire: true	// if true variables will be deleted automatically when they expire
	};
	tools.proxy_cache = new tools.NodeCache(proxy_cache_opts);
	tools.proxy_cache.get_stats = () => {
		if (ev.PROXY_CACHE_ENABLED !== true) {
			return null;
		} else {
			return tools.proxy_cache.getStats();
		}
	};
	tools.proxy_cache.flush_cache = () => {
		if (ev.PROXY_CACHE_ENABLED) {
			tools.proxy_cache.flushAll();
		}
	};
	tools.proxy_cache.evict_manual = (keys) => {
		if (ev.PROXY_CACHE_ENABLED) {
			return tools.proxy_cache.del(keys);
		}
	};

	// ------------------------------------------
	// flush every cache we have tabs on
	// ------------------------------------------
	cache.flush_all = () => {
		tools.session_store._flush_cache();
		tools.otcc.flush_cache();
		tools.iam_lib.flush_cache();
		tools.proxy_cache.flush_cache();
		logger.info('[cache] flushed all caches');
		return null;
	};

	// ------------------------------------------
	// normalize all cache responses
	// ------------------------------------------
	cache.friendly_stats = (cache_obj) => {
		let data = null;

		if (cache_obj && typeof cache_obj.get_stats === 'function') {
			data = cache_obj.get_stats();
		} else if (cache_obj && typeof cache_obj._cache_stats === 'function') {
			data = cache_obj._cache_stats();
		}

		if (!data) {
			return null;
		} else {
			const key_size = !isNaN(data.ksize) ? Number(data.ksize) : 0;
			const value_size = !isNaN(data.vsize) ? Number(data.vsize) : 0;
			return {
				hits: data.hits,
				misses: data.misses,
				keys: data.keys,
				cache_size: tools.misc.friendly_bytes(key_size + value_size)
			};
		}
	};

	// ------------------------------------------
	// use pillow talk to inform all athenas to evict entries in their caches
	// ------------------------------------------
	cache.broadcast_evict_event = (event, component_doc) => {
		const msg = {
			message_type: 'evict_cache_keys',
			message: 'evicting cache keys from event:' + event,
			event: event,
			comp_doc: component_doc,
		};
		tools.pillow.broadcast(msg);
	};

	// ------------------------------------------
	// evict cache entries for a delete component event
	// ------------------------------------------
	cache.handle_comp_delete = (component_doc) => {
		const cache_keys = [tools.misc.hash_str(ev.STR.GET_ALL_COMPONENTS_KEY)];	// this is the all-components lookup key in the cache
		if (component_doc && component_doc._id) {
			cache_keys.push(tools.misc.hash_str('GET /api/v3/components/' + component_doc._id));
			cache_keys.push(tools.misc.hash_str('GET /ak/api/v3/components/' + component_doc._id));
			cache_keys.push(tools.misc.hash_str('GET /api/v2/components/' + component_doc._id));
			cache_keys.push(tools.misc.hash_str('GET /ak/api/v2/components/' + component_doc._id));
			cache_keys.push(tools.misc.hash_str('GET /api/v1/components/' + component_doc._id));
			cache_keys.push(tools.misc.hash_str('GET /ak/api/v1/components/' + component_doc._id));
		}
		tools.proxy_cache.evict_manual(cache_keys);									// remove deployer (proxy) cache keys that are sale
	};

	// ------------------------------------------
	// evict cache entries for a remove component event
	// ------------------------------------------
	cache.handle_comp_remove = (component_doc) => {
		const cache_keys = [

			// all ids view
			ev.DB_COMPONENTS + ':all_ids:_design/athena-v1:' + tools.misc.formatObjAsQueryParams({
				group: true,
			}),

			// runnable components view
			ev.DB_COMPONENTS + ':_doc_types:_design/athena-v1:' + tools.misc.formatObjAsQueryParams({
				include_docs: true,
				keys: [ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER]
			}),

			// all components view
			ev.DB_COMPONENTS + ':_doc_types:_design/athena-v1:' + tools.misc.formatObjAsQueryParams({
				include_docs: true,
				keys: [ev.STR.MSP, ev.STR.MSP_EXTERNAL, ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER]
			})
		];
		if (component_doc && component_doc._id) {
			cache_keys.push('athena_components:' + component_doc._id);
		}
		tools.otcc.evict_manual(cache_keys);										// remove cloudant cache keys that are sale

		const status_url = tools.component_lib.build_status_url(component_doc);		// build the component's status url
		if (status_url) {
			tools.proxy_cache.evict_manual(tools.misc.hash_str(status_url));		// evict the component status entry too, its in the proxy cache
		}
	};

	// ------------------------------------------
	// evict cache entries for a onboard component event
	// ------------------------------------------
	cache.handle_comp_onboard = () => {
		const dep_cache_keys = [tools.misc.hash_str(ev.STR.GET_ALL_COMPONENTS_KEY)]; // this is the all-components lookup key in the cache
		tools.proxy_cache.evict_manual(dep_cache_keys);								 // remove deployer (proxy) cache keys that are sale

		const couch_cache_keys = [

			// runnable components view
			ev.DB_COMPONENTS + ':_doc_types:_design/athena-v1:' + tools.misc.formatObjAsQueryParams({
				include_docs: true,
				keys: [ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER]
			}),

			// all components view
			ev.DB_COMPONENTS + ':_doc_types:_design/athena-v1:' + tools.misc.formatObjAsQueryParams({
				include_docs: true,
				keys: [ev.STR.MSP, ev.STR.MSP_EXTERNAL, ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER]
			})
		];

		tools.otcc.evict_manual(couch_cache_keys);									// remove cloudant cache keys that are sale
	};

	// ------------------------------------------
	// evict cache entries for a edit component event
	// ------------------------------------------
	cache.handle_comp_edit = (component_doc) => {
		cache.handle_comp_delete(component_doc);									// evict the same keys for edit as delete, should cover edit
		cache.handle_comp_remove(component_doc);
	};

	return cache;
};
