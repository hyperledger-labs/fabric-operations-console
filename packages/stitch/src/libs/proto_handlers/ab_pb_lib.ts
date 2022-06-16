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
import { SeekSpecified as AB_SeekSpecified } from '../../protoc/output/orderer/ab_pb';		// stands for Atomic Broadcast
import { SeekPosition as AB_SeekPosition } from '../../protoc/output/orderer/ab_pb';
import { SeekNewest as AB_SeekNewest } from '../../protoc/output/orderer/ab_pb';
import { SeekInfo as AB_SeekInfo } from '../../protoc/output/orderer/ab_pb';

export class ABLib {					// stands for Atomic Broadcast
	// --------------------------------------------------------------------------------
	// make a seek specified protobuf
	// --------------------------------------------------------------------------------
	p_build_seek_specified(block: number) {
		const p_seek_specified = new AB_SeekSpecified();
		p_seek_specified.setNumber(block);
		return p_seek_specified;
	}

	// --------------------------------------------------------------------------------
	// make a seek position protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			set_specified: <>		// [optional]
			set_newest: <>			// [optional]
		}
	*/
	p_build_seek_position(opts: any) {
		const p_seek_position = new AB_SeekPosition();
		if (opts.set_specified) {
			p_seek_position.setSpecified(opts.set_specified);
		} else if (opts.set_newest) {
			p_seek_position.setNewest(opts.set_newest);
		}
		return p_seek_position;
	}

	// --------------------------------------------------------------------------------
	// make a seek position protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			seek_start: <AB_SeekSpecified>,
			seek_stop: <AB_SeekSpecified>
		}
	*/
	p_build_seek_info(opts: any) {
		const p_seek_info = new AB_SeekInfo();
		p_seek_info.setStart(opts.seek_start);
		p_seek_info.setStop(opts.seek_stop);
		p_seek_info.setBehavior(AB_SeekInfo.SeekBehavior.FAIL_IF_NOT_READY);	// fabric sdk had this as BLOCK_UNTIL_READY but that seems wrong
		return p_seek_info;
	}

	// --------------------------------------------------------------------------------
	// make a seek newest protobuf
	// --------------------------------------------------------------------------------
	p_build_seek_newest() {
		return new AB_SeekNewest();
	}
}
