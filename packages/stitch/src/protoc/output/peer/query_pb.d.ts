// package: protos
// file: peer/query.proto

import * as jspb from "google-protobuf";

export class ChaincodeQueryResponse extends jspb.Message {
  clearChaincodesList(): void;
  getChaincodesList(): Array<ChaincodeInfo>;
  setChaincodesList(value: Array<ChaincodeInfo>): void;
  addChaincodes(value?: ChaincodeInfo, index?: number): ChaincodeInfo;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeQueryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeQueryResponse): ChaincodeQueryResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeQueryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeQueryResponse;
  static deserializeBinaryFromReader(message: ChaincodeQueryResponse, reader: jspb.BinaryReader): ChaincodeQueryResponse;
}

export namespace ChaincodeQueryResponse {
  export type AsObject = {
    chaincodesList: Array<ChaincodeInfo.AsObject>,
  }
}

export class ChaincodeInfo extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  getVersion(): string;
  setVersion(value: string): void;

  getPath(): string;
  setPath(value: string): void;

  getInput(): string;
  setInput(value: string): void;

  getEscc(): string;
  setEscc(value: string): void;

  getVscc(): string;
  setVscc(value: string): void;

  getId(): Uint8Array | string;
  getId_asU8(): Uint8Array;
  getId_asB64(): string;
  setId(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeInfo.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeInfo): ChaincodeInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeInfo;
  static deserializeBinaryFromReader(message: ChaincodeInfo, reader: jspb.BinaryReader): ChaincodeInfo;
}

export namespace ChaincodeInfo {
  export type AsObject = {
    name: string,
    version: string,
    path: string,
    input: string,
    escc: string,
    vscc: string,
    id: Uint8Array | string,
  }
}

export class ChannelQueryResponse extends jspb.Message {
  clearChannelsList(): void;
  getChannelsList(): Array<ChannelInfo>;
  setChannelsList(value: Array<ChannelInfo>): void;
  addChannels(value?: ChannelInfo, index?: number): ChannelInfo;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelQueryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelQueryResponse): ChannelQueryResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChannelQueryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelQueryResponse;
  static deserializeBinaryFromReader(message: ChannelQueryResponse, reader: jspb.BinaryReader): ChannelQueryResponse;
}

export namespace ChannelQueryResponse {
  export type AsObject = {
    channelsList: Array<ChannelInfo.AsObject>,
  }
}

export class ChannelInfo extends jspb.Message {
  getChannelId(): string;
  setChannelId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelInfo.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelInfo): ChannelInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChannelInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelInfo;
  static deserializeBinaryFromReader(message: ChannelInfo, reader: jspb.BinaryReader): ChannelInfo;
}

export namespace ChannelInfo {
  export type AsObject = {
    channelId: string,
  }
}

