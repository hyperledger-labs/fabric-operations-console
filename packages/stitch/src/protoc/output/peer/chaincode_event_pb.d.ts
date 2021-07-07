// package: protos
// file: peer/chaincode_event.proto

import * as jspb from "google-protobuf";

export class ChaincodeEvent extends jspb.Message {
  getChaincodeId(): string;
  setChaincodeId(value: string): void;

  getTxId(): string;
  setTxId(value: string): void;

  getEventName(): string;
  setEventName(value: string): void;

  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeEvent.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeEvent): ChaincodeEvent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeEvent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeEvent;
  static deserializeBinaryFromReader(message: ChaincodeEvent, reader: jspb.BinaryReader): ChaincodeEvent;
}

export namespace ChaincodeEvent {
  export type AsObject = {
    chaincodeId: string,
    txId: string,
    eventName: string,
    payload: Uint8Array | string,
  }
}

