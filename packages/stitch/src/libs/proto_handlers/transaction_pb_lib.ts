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
import { ChaincodeEndorsedAction as Transaction_ChaincodeEndorsedAction } from '../../protoc/output/peer/transaction_pb';
import { ChaincodeActionPayload as Transaction_ChaincodeActionPayload } from '../../protoc/output/peer/transaction_pb';
import { TransactionAction as Transaction_TransactionAction } from '../../protoc/output/peer/transaction_pb';
import { Transaction as Transaction_Transaction } from '../../protoc/output/peer/transaction_pb';

export class TransactionLib {

	// --------------------------------------------------------------------------------
	// build a chaincode endorsed action protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			p_proposal_response_payload: <protobuf proposal>,
			p_endorsements: [<endorsements>]
		}
	*/
	p_build_chaincode_endorsed_action(opts: Bcea) {
		const p_chaincodeEndorsedAction = new Transaction_ChaincodeEndorsedAction();
		if (opts.p_proposal_response_payload) { p_chaincodeEndorsedAction.setProposalResponsePayload(opts.p_proposal_response_payload); }
		if (opts.p_endorsements) { p_chaincodeEndorsedAction.setEndorsementsList(opts.p_endorsements); }
		return p_chaincodeEndorsedAction;
	}

	// --------------------------------------------------------------------------------
	// build a chaincode action payload protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			p_action: <protobuf ChaincodeEndorsedAction>,
			b_chaincode_proposal_payload: <bytes>,
		}
	*/
	p_build_chaincode_action_payload(opts: Bcap) {
		const p_chaincodeActionPayload = new Transaction_ChaincodeActionPayload();
		p_chaincodeActionPayload.setAction(opts.p_action);		// if this is empty.. bad things happen
		p_chaincodeActionPayload.setChaincodeProposalPayload(opts.b_chaincode_proposal_payload);
		return p_chaincodeActionPayload;
	}

	// --------------------------------------------------------------------------------
	// build a transaction action protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			b_header: <>,
			b_payload: <>
		}
	*/
	p_build_transaction_action(opts: Bta) {
		const p_transactionAction = new Transaction_TransactionAction();
		p_transactionAction.setHeader(opts.b_header);
		p_transactionAction.setPayload(opts.b_payload);
		return p_transactionAction;
	}

	// --------------------------------------------------------------------------------
	// build a transaction protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			p_actions: []
		}
	*/
	p_build_transaction(opts: Bt) {
		const p_transaction = new Transaction_Transaction();
		p_transaction.setActionsList(opts.p_actions);
		return p_transaction;
	}
}

interface Bcea {
	p_proposal_response_payload: any | null;
	p_endorsements: any[] | null;
}
interface Bcap {
	p_action: any;
	b_chaincode_proposal_payload: any;
}
interface Bta {
	b_header: Uint8Array;
	b_payload: Uint8Array;
}
interface Bt {
	p_actions: any[];
}
