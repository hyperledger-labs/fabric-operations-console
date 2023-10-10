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

const ChannelUtils = {
	getSampleConsortiumOrFirstKey: (obj) => {
		if (obj && typeof obj === 'object') {
			if (obj.SampleConsortium) {
				return obj.SampleConsortium;
			} else {
				for (let key in obj) {
					return obj[key]; // return the first one, good enough for me
				}
			}
		}
		return null;
	}
};
export default ChannelUtils;
