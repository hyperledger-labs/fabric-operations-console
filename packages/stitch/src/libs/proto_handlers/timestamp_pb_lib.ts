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

// Libs from protoc
import { Timestamp as Timestamp_Timestamp } from '../../protoc/output/google/protobuf/timestamp_pb';

// --------------------------------------------------------------------------------
// make a timestamp protobuf
// --------------------------------------------------------------------------------
export class TimestampLib {
	p_build_timestamp() {
		const p_timestamp = new Timestamp_Timestamp();
		const ts = Date.now();
		p_timestamp.setSeconds(Math.floor(Date.now() / 1000));		// <int64>
		p_timestamp.setNanos((ts % 1000) * 1000000);				// <int32>
		return p_timestamp;
	}
}
