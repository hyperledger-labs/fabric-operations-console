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
import { SerializedIdentity as Identities_SerializedIdentity } from '../../protoc/output/msp/identities_pb';

// Libs built by us
import { utf8StrToUint8Array } from '../misc';

export class IdentitiesLib {
	// --------------------------------------------------------------------------------
	// build a SerializedIdentity protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			msp_id: "string",
			client_cert_pem: "string"
		}
	*/
	p_build_serialized_identity(opts: any) {
		const serializedIdentity = new Identities_SerializedIdentity();
		serializedIdentity.setMspid(opts.msp_id);
		serializedIdentity.setIdBytes(utf8StrToUint8Array(opts.client_cert_pem));
		return serializedIdentity;
	}
}
