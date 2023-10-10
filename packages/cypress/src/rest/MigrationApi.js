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
//import Logger from '../components/Log/Logger';
import { RestApi } from './RestApi';
//const Log = new Logger('MigrationApi');

require('./NodeTypes');

class MigrationApi {
	static skip_cache = false;

	// get overall migration status
	static async getStatus() {
		let url = '/api/v3/migration/status';
		return await RestApi.get(url);
	}

	// start the database migration
	static async startDbMigration() {
		let url = '/api/v3/migration/databases';
		return await RestApi.post(url);
	}
}

export { MigrationApi };
