// package: common
// file: common/common.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

export class LastConfig extends jspb.Message {
  getIndex(): number;
  setIndex(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LastConfig.AsObject;
  static toObject(includeInstance: boolean, msg: LastConfig): LastConfig.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: LastConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LastConfig;
  static deserializeBinaryFromReader(message: LastConfig, reader: jspb.BinaryReader): LastConfig;
}

export namespace LastConfig {
  export type AsObject = {
    index: number,
  }
}

export class Metadata extends jspb.Message {
  getValue(): Uint8Array | string;
  getValue_asU8(): Uint8Array;
  getValue_asB64(): string;
  setValue(value: Uint8Array | string): void;

  clearSignaturesList(): void;
  getSignaturesList(): Array<MetadataSignature>;
  setSignaturesList(value: Array<MetadataSignature>): void;
  addSignatures(value?: MetadataSignature, index?: number): MetadataSignature;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Metadata.AsObject;
  static toObject(includeInstance: boolean, msg: Metadata): Metadata.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Metadata, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Metadata;
  static deserializeBinaryFromReader(message: Metadata, reader: jspb.BinaryReader): Metadata;
}

export namespace Metadata {
  export type AsObject = {
    value: Uint8Array | string,
    signaturesList: Array<MetadataSignature.AsObject>,
  }
}

export class MetadataSignature extends jspb.Message {
  getSignatureHeader(): Uint8Array | string;
  getSignatureHeader_asU8(): Uint8Array;
  getSignatureHeader_asB64(): string;
  setSignatureHeader(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MetadataSignature.AsObject;
  static toObject(includeInstance: boolean, msg: MetadataSignature): MetadataSignature.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MetadataSignature, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MetadataSignature;
  static deserializeBinaryFromReader(message: MetadataSignature, reader: jspb.BinaryReader): MetadataSignature;
}

export namespace MetadataSignature {
  export type AsObject = {
    signatureHeader: Uint8Array | string,
    signature: Uint8Array | string,
  }
}

export class Header extends jspb.Message {
  getChannelHeader(): Uint8Array | string;
  getChannelHeader_asU8(): Uint8Array;
  getChannelHeader_asB64(): string;
  setChannelHeader(value: Uint8Array | string): void;

  getSignatureHeader(): Uint8Array | string;
  getSignatureHeader_asU8(): Uint8Array;
  getSignatureHeader_asB64(): string;
  setSignatureHeader(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Header.AsObject;
  static toObject(includeInstance: boolean, msg: Header): Header.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Header, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Header;
  static deserializeBinaryFromReader(message: Header, reader: jspb.BinaryReader): Header;
}

export namespace Header {
  export type AsObject = {
    channelHeader: Uint8Array | string,
    signatureHeader: Uint8Array | string,
  }
}

export class ChannelHeader extends jspb.Message {
  getType(): number;
  setType(value: number): void;

  getVersion(): number;
  setVersion(value: number): void;

  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getChannelId(): string;
  setChannelId(value: string): void;

  getTxId(): string;
  setTxId(value: string): void;

  getEpoch(): number;
  setEpoch(value: number): void;

  getFabricExtension(): Uint8Array | string;
  getFabricExtension_asU8(): Uint8Array;
  getFabricExtension_asB64(): string;
  setFabricExtension(value: Uint8Array | string): void;

  getTlsCertHash(): Uint8Array | string;
  getTlsCertHash_asU8(): Uint8Array;
  getTlsCertHash_asB64(): string;
  setTlsCertHash(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelHeader.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelHeader): ChannelHeader.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChannelHeader, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelHeader;
  static deserializeBinaryFromReader(message: ChannelHeader, reader: jspb.BinaryReader): ChannelHeader;
}

export namespace ChannelHeader {
  export type AsObject = {
    type: number,
    version: number,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    channelId: string,
    txId: string,
    epoch: number,
    fabricExtension: Uint8Array | string,
    tlsCertHash: Uint8Array | string,
  }
}

export class SignatureHeader extends jspb.Message {
  getCreator(): Uint8Array | string;
  getCreator_asU8(): Uint8Array;
  getCreator_asB64(): string;
  setCreator(value: Uint8Array | string): void;

  getNonce(): Uint8Array | string;
  getNonce_asU8(): Uint8Array;
  getNonce_asB64(): string;
  setNonce(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignatureHeader.AsObject;
  static toObject(includeInstance: boolean, msg: SignatureHeader): SignatureHeader.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignatureHeader, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignatureHeader;
  static deserializeBinaryFromReader(message: SignatureHeader, reader: jspb.BinaryReader): SignatureHeader;
}

export namespace SignatureHeader {
  export type AsObject = {
    creator: Uint8Array | string,
    nonce: Uint8Array | string,
  }
}

export class Payload extends jspb.Message {
  hasHeader(): boolean;
  clearHeader(): void;
  getHeader(): Header | undefined;
  setHeader(value?: Header): void;

  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Payload.AsObject;
  static toObject(includeInstance: boolean, msg: Payload): Payload.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Payload, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Payload;
  static deserializeBinaryFromReader(message: Payload, reader: jspb.BinaryReader): Payload;
}

export namespace Payload {
  export type AsObject = {
    header?: Header.AsObject,
    data: Uint8Array | string,
  }
}

export class Envelope extends jspb.Message {
  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Envelope.AsObject;
  static toObject(includeInstance: boolean, msg: Envelope): Envelope.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Envelope, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Envelope;
  static deserializeBinaryFromReader(message: Envelope, reader: jspb.BinaryReader): Envelope;
}

export namespace Envelope {
  export type AsObject = {
    payload: Uint8Array | string,
    signature: Uint8Array | string,
  }
}

export class Block extends jspb.Message {
  hasHeader(): boolean;
  clearHeader(): void;
  getHeader(): BlockHeader | undefined;
  setHeader(value?: BlockHeader): void;

  hasData(): boolean;
  clearData(): void;
  getData(): BlockData | undefined;
  setData(value?: BlockData): void;

  hasMetadata(): boolean;
  clearMetadata(): void;
  getMetadata(): BlockMetadata | undefined;
  setMetadata(value?: BlockMetadata): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Block.AsObject;
  static toObject(includeInstance: boolean, msg: Block): Block.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Block, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Block;
  static deserializeBinaryFromReader(message: Block, reader: jspb.BinaryReader): Block;
}

export namespace Block {
  export type AsObject = {
    header?: BlockHeader.AsObject,
    data?: BlockData.AsObject,
    metadata?: BlockMetadata.AsObject,
  }
}

export class BlockHeader extends jspb.Message {
  getNumber(): number;
  setNumber(value: number): void;

  getPreviousHash(): Uint8Array | string;
  getPreviousHash_asU8(): Uint8Array;
  getPreviousHash_asB64(): string;
  setPreviousHash(value: Uint8Array | string): void;

  getDataHash(): Uint8Array | string;
  getDataHash_asU8(): Uint8Array;
  getDataHash_asB64(): string;
  setDataHash(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BlockHeader.AsObject;
  static toObject(includeInstance: boolean, msg: BlockHeader): BlockHeader.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BlockHeader, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BlockHeader;
  static deserializeBinaryFromReader(message: BlockHeader, reader: jspb.BinaryReader): BlockHeader;
}

export namespace BlockHeader {
  export type AsObject = {
    number: number,
    previousHash: Uint8Array | string,
    dataHash: Uint8Array | string,
  }
}

export class BlockData extends jspb.Message {
  clearDataList(): void;
  getDataList(): Array<Uint8Array | string>;
  getDataList_asU8(): Array<Uint8Array>;
  getDataList_asB64(): Array<string>;
  setDataList(value: Array<Uint8Array | string>): void;
  addData(value: Uint8Array | string, index?: number): Uint8Array | string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BlockData.AsObject;
  static toObject(includeInstance: boolean, msg: BlockData): BlockData.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BlockData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BlockData;
  static deserializeBinaryFromReader(message: BlockData, reader: jspb.BinaryReader): BlockData;
}

export namespace BlockData {
  export type AsObject = {
    dataList: Array<Uint8Array | string>,
  }
}

export class BlockMetadata extends jspb.Message {
  clearMetadataList(): void;
  getMetadataList(): Array<Uint8Array | string>;
  getMetadataList_asU8(): Array<Uint8Array>;
  getMetadataList_asB64(): Array<string>;
  setMetadataList(value: Array<Uint8Array | string>): void;
  addMetadata(value: Uint8Array | string, index?: number): Uint8Array | string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BlockMetadata.AsObject;
  static toObject(includeInstance: boolean, msg: BlockMetadata): BlockMetadata.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BlockMetadata, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BlockMetadata;
  static deserializeBinaryFromReader(message: BlockMetadata, reader: jspb.BinaryReader): BlockMetadata;
}

export namespace BlockMetadata {
  export type AsObject = {
    metadataList: Array<Uint8Array | string>,
  }
}

export enum Status {
  UNKNOWN = 0,
  SUCCESS = 200,
  BAD_REQUEST = 400,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  REQUEST_ENTITY_TOO_LARGE = 413,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  SERVICE_UNAVAILABLE = 503,
}

export enum HeaderType {
  MESSAGE = 0,
  CONFIG = 1,
  CONFIG_UPDATE = 2,
  ENDORSER_TRANSACTION = 3,
  ORDERER_TRANSACTION = 4,
  DELIVER_SEEK_INFO = 5,
  CHAINCODE_PACKAGE = 6,
  PEER_ADMIN_OPERATION = 8,
}

export enum BlockMetadataIndex {
  SIGNATURES = 0,
  LAST_CONFIG = 1,
  TRANSACTIONS_FILTER = 2,
  ORDERER = 3,
}

