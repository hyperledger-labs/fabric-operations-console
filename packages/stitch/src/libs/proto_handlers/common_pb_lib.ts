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
import { Header as Common_Header } from '../../protoc/output/common/common_pb';
import { Payload as Common_Payload } from '../../protoc/output/common/common_pb';
import { ChannelHeader as Common_ChannelHeader } from '../../protoc/output/common/common_pb';
import { SignatureHeader as Common_SignatureHeader } from '../../protoc/output/common/common_pb';

// Libs built by us
import { TimestampLib } from './timestamp_pb_lib';
import { ProposalLib } from './proposal_pb_lib';
import { IdentitiesLib } from './identities_pb_lib';

export class CommonLib {
	// --------------------------------------------------------------------------------
	// make a channel header protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			type: <int32>,
			channel_id: "string",
			tx_id: "string",
			epoch: <uint64>,
			chaincode_id: "string",
			client_tls_cert_hash: "string" || null		// [optional] required for mutual tls, i think...
		}
	*/
	p_build_channel_header(opts: any) {
		opts.chaincode_id = (opts.chaincode_id) ? opts.chaincode_id : '';	// defaults match https://developers.google.com/protocol-buffers/docs/proto3#default
		opts.epoch = (opts.epoch) ? opts.epoch : 0;
		opts.client_tls_cert_hash = (opts.client_tls_cert_hash) ? opts.client_tls_cert_hash : '';
		const ts = (new TimestampLib).p_build_timestamp();

		const p_channelHeader = new Common_ChannelHeader();					// create the channel header proto
		p_channelHeader.setType(opts.type);
		p_channelHeader.setVersion(1);										// <int32>
		p_channelHeader.setTimestamp(ts);
		p_channelHeader.setChannelId(opts.channel_id);
		p_channelHeader.setTxId(opts.tx_id);
		p_channelHeader.setEpoch(opts.epoch);

		if (opts.chaincode_id) {
			const ext = (new ProposalLib).p_build_chaincode_header_extension(opts.chaincode_id);
			p_channelHeader.setFabricExtension(ext.serializeBinary());
		}
		p_channelHeader.setTlsCertHash(opts.client_tls_cert_hash);

		return p_channelHeader;
	}

	// --------------------------------------------------------------------------------
	// make a header protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			msp_id: "string",
			client_cert_pem: "string",
			nonce: <bytes>
			p_channelHeader: <protobuf channelHeader> || <protobuf seekInfoHeader>,
		}
	*/
	p_build_header(opts: Bh) {
		const p_signatureHeader = new Common_SignatureHeader();				// first build "signature header" proto
		const p_serializedIdentity = (new IdentitiesLib).p_build_serialized_identity({ msp_id: opts.msp_id, client_cert_pem: opts.client_cert_pem });
		p_signatureHeader.setCreator(p_serializedIdentity.serializeBinary());
		p_signatureHeader.setNonce(opts.nonce);

		const p_header = new Common_Header();
		p_header.setSignatureHeader(p_signatureHeader.serializeBinary());	// then stuff it into the "header" proto
		p_header.setChannelHeader(opts.p_channelHeader.serializeBinary());
		return p_header;
	}

	// --------------------------------------------------------------------------------
	// make a payload protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			p_header: <protobuf>,
			p_data: <protobuf>,
		}
	*/
	p_build_payload(opts: Bp) {
		const p_payload = new Common_Payload();
		p_payload.setHeader(opts.p_header);
		p_payload.setData(opts.b_data);
		return p_payload;
	}

	// --------------------------------------------------------------------------------
	// make a block protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			p_header: <protobuf>,
			p_data: <protobuf>,
			p_metadata: <protobuf>
		}
	*/
	/*p_build_block(opts: any) {
		const p_block = new Common_Block();
		p_block.setHeader(opts.p_header);
		p_block.setData(opts.p_data);
		p_block.setMetadata(opts.p_metadata);
		return p_block;
	}*/
}

interface Bh {
	msp_id: string;
	client_cert_pem: string;
	nonce: Uint8Array;
	p_channelHeader: any;
}

interface Bp {
	p_header: Common_Header;
	b_data: Uint8Array;
}
