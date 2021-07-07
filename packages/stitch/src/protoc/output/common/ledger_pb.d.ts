// package: common
// file: common/ledger.proto

import * as jspb from "google-protobuf";

export class BlockchainInfo extends jspb.Message {
  getHeight(): number;
  setHeight(value: number): void;

  getCurrentblockhash(): Uint8Array | string;
  getCurrentblockhash_asU8(): Uint8Array;
  getCurrentblockhash_asB64(): string;
  setCurrentblockhash(value: Uint8Array | string): void;

  getPreviousblockhash(): Uint8Array | string;
  getPreviousblockhash_asU8(): Uint8Array;
  getPreviousblockhash_asB64(): string;
  setPreviousblockhash(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BlockchainInfo.AsObject;
  static toObject(includeInstance: boolean, msg: BlockchainInfo): BlockchainInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BlockchainInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BlockchainInfo;
  static deserializeBinaryFromReader(message: BlockchainInfo, reader: jspb.BinaryReader): BlockchainInfo;
}

export namespace BlockchainInfo {
  export type AsObject = {
    height: number,
    currentblockhash: Uint8Array | string,
    previousblockhash: Uint8Array | string,
  }
}

