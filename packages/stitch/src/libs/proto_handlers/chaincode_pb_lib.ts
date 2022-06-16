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
import { ChaincodeID as Chaincode_ChaincodeID } from '../../protoc/output/peer/chaincode_pb';
import { ChaincodeSpec as Chaincode_ChaincodeSpec } from '../../protoc/output/peer/chaincode_pb';
import { ChaincodeInput as Chaincode_ChaincodeInput } from '../../protoc/output/peer/chaincode_pb';
import { ChaincodeDeploymentSpec as Chaincode_ChaincodeDeploymentSpec } from '../../protoc/output/peer/chaincode_pb';

// Libs built by us
import { utf8StrToUint8Array, uint8ArrayToStr, logger, __pb_root } from '../misc';

export class ChaincodeLib {
	// --------------------------------------------------------------------------------
	// make a chaincode ID protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			chaincode_id: "string",
			chaincode_version: "string"		// optional
		}
	*/
	p_build_chaincode_ID(opts: any) {
		const p_chaincodeID = new Chaincode_ChaincodeID();
		p_chaincodeID.setName(opts.chaincode_id);
		if (opts.chaincode_version) {
			p_chaincodeID.setVersion(opts.chaincode_version);
		}

		return p_chaincodeID;
	}

	// --------------------------------------------------------------------------------
	// build a ChaincodeSpec protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			chaincode_id: "string",
			chaincode_version: "string",		// optional
			chaincode_type: <enum 0-4>
			chaincode_function: "string"
			chaincode_args: ["string"],
		}
	*/
	p_build_chaincode_spec(opts: any) {
		const p_chaincodeSpec = new Chaincode_ChaincodeSpec();
		p_chaincodeSpec.setType(opts.chaincode_type);
		p_chaincodeSpec.setChaincodeId(this.p_build_chaincode_ID(opts));	// build the cc id as a proto then set it in cc spec
		p_chaincodeSpec.setInput(this.p_build_chaincode_input(opts));		// build the input options as a proto then set them in cc spec
		return p_chaincodeSpec;
	}

	// --------------------------------------------------------------------------------
	// build a ChaincodeInput protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			chaincode_function: "string"
			chaincode_args: ["string"],
		}
	*/
	p_build_chaincode_input(opts: any) {
		const args = [];
		if (opts.chaincode_function) {									// its possible (though rare) to not have a cc function name..
			args.push(utf8StrToUint8Array(opts.chaincode_function));	// first arg is the cc function name
		}
		for (let i in opts.chaincode_args) {							// reset of the args are w/e the user sent, should be strings
			if (opts.chaincode_args[i]) {
				args.push(utf8StrToUint8Array(opts.chaincode_args[i]));
			} else {
				args.push(new Uint8Array(0));							// empty args are needed b/c some system chaincode will check the length of arguments
			}
		}

		const p_chaincodeInput = new Chaincode_ChaincodeInput();
		p_chaincodeInput.setArgsList(args);

		logger.debug('[stitch] debug cc arguments:');
		for (let i in args) {
			logger.debug('arg', i, 'is:', uint8ArrayToStr(args[i]));
		}

		return p_chaincodeInput;
	}

	// --------------------------------------------------------------------------------
	// build a ChaincodeDeploymentSpec protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			chaincode_id: "string",
			chaincode_version: "string",
			chaincode_type: <enum 0-4>
			chaincode_function: "string"
			chaincode_args: ["string"],

			code_package: <?>
			exec_env: <?>
		}
	*/
	p_build_chaincode_deployment_spec(opts: any) {
		const p_chaincodeDeploymentSpec = new Chaincode_ChaincodeDeploymentSpec();
		const p_chaincodeSpec = this.p_build_chaincode_spec(opts);
		p_chaincodeDeploymentSpec.setChaincodeSpec(p_chaincodeSpec);
		if (opts.code_package) {
			p_chaincodeDeploymentSpec.setCodePackage(opts.code_package);
		}
		if (opts.exec_env) {
			p_chaincodeDeploymentSpec.setExecEnv(opts.exec_env);
		}
		return p_chaincodeDeploymentSpec;
	}

	// --------------------------------------------------------------------------------
	// convert chaincode type to enum
	// --------------------------------------------------------------------------------
	conform_cc_type(type: string) {
		const chaincodeType = (type && typeof type === 'string') ? type.toLowerCase() : 'golang';
		const types = <any>{
			golang: Chaincode_ChaincodeSpec.Type.GOLANG,
			car: Chaincode_ChaincodeSpec.Type.CAR,
			java: Chaincode_ChaincodeSpec.Type.JAVA,
			node: Chaincode_ChaincodeSpec.Type.NODE
		};
		if (chaincodeType && types[chaincodeType]) {
			return types[chaincodeType];
		}

		logger.error('[stitch] chaincode type is not understood "' + type + '". valid types:', Object.keys(types));
		return null;
	}

	// --------------------------------------------------------------------------------
	// decode "ChaincodeData" binary structure
	// --------------------------------------------------------------------------------
	__decode_chaincode_data(pb: Uint8Array) {
		const ChaincodeData = __pb_root.lookupType('ChaincodeData');
		const message = ChaincodeData.decode(pb);
		const obj = ChaincodeData.toObject(message, { defaults: false });
		return obj;
	}
}
