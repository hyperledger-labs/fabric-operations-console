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

// Libs built by us
import { logger, __pb_root } from '../misc';

// Libs from protoc
import { ProposalResponse as ProposalResponse_ProposalResponse } from '../../protoc/output/peer/proposal_response_pb';

// --------------------------------------------------------------------------------
// Response
// --------------------------------------------------------------------------------
export class ProposalResponseLib {

	// --------------------------------------------------------------------------------
	// Return the inner "payload" protobuf from a proposal response
	// --------------------------------------------------------------------------------
	// ProposalResponse
	// 	\_Response
	//		\_Payload
	b_deserialize_payload(grpc_web_message: ProposalResponse_ProposalResponse) {
		logger.info('[stitch - deserialize payload] going to parse the proposal response for the payload');
		const p_proposal_response = ProposalResponse_ProposalResponse.deserializeBinary(grpc_web_message.serializeBinary());
		logger.debug('[stitch - deserialize payload] p_proposal_response:', p_proposal_response.toObject());

		const p_response = p_proposal_response.getResponse();
		if (!p_response) {
			logger.error('[stitch - deserialize payload] could not get "response" from p_proposal_response');
			return -1;
		} else {
			const b_payload = p_response.getPayload();
			if (b_payload) {
				return <Uint8Array>(b_payload);
			} else {
				return null;
			}
		}
	}

	// --------------------------------------------------------------------------------
	// sometimes we need the other payload...
	// --------------------------------------------------------------------------------
	// ProposalResponse
	//	\_Payload
	b_alt_deserialize_payload(grpc_web_message: ProposalResponse_ProposalResponse) {
		logger.info('[stitch - deserialize payload] going to parse the proposal response for the payload');
		const bin = grpc_web_message ? grpc_web_message.serializeBinary() : null;
		const ProposalResponse = __pb_root.lookupType('protos.ProposalResponse');
		const p_proposalResponse = ProposalResponse.decode(bin);
		const proposal_response = ProposalResponse.toObject(p_proposalResponse, { defaults: false, bytes: Uint8Array });
		logger.debug('[stitch - deserialize payload] proposal_response:', proposal_response);

		if (!proposal_response || !proposal_response.payload) {
			logger.error('[stitch - deserialize payload] could not get "payload" from proposal_response');
			return -1;
		} else {
			const b_payload = proposal_response.payload;
			return b_payload ? b_payload : null;		// conform to either something or null, no 0s, no false
		}
	}
}
