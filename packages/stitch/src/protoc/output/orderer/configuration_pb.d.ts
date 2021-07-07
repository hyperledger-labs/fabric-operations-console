// package: orderer
// file: orderer/configuration.proto

import * as jspb from "google-protobuf";

export class ConsensusType extends jspb.Message {
  getType(): string;
  setType(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConsensusType.AsObject;
  static toObject(includeInstance: boolean, msg: ConsensusType): ConsensusType.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConsensusType, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConsensusType;
  static deserializeBinaryFromReader(message: ConsensusType, reader: jspb.BinaryReader): ConsensusType;
}

export namespace ConsensusType {
  export type AsObject = {
    type: string,
  }
}

export class BatchSize extends jspb.Message {
  getMaxMessageCount(): number;
  setMaxMessageCount(value: number): void;

  getAbsoluteMaxBytes(): number;
  setAbsoluteMaxBytes(value: number): void;

  getPreferredMaxBytes(): number;
  setPreferredMaxBytes(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BatchSize.AsObject;
  static toObject(includeInstance: boolean, msg: BatchSize): BatchSize.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BatchSize, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BatchSize;
  static deserializeBinaryFromReader(message: BatchSize, reader: jspb.BinaryReader): BatchSize;
}

export namespace BatchSize {
  export type AsObject = {
    maxMessageCount: number,
    absoluteMaxBytes: number,
    preferredMaxBytes: number,
  }
}

export class BatchTimeout extends jspb.Message {
  getTimeout(): string;
  setTimeout(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BatchTimeout.AsObject;
  static toObject(includeInstance: boolean, msg: BatchTimeout): BatchTimeout.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BatchTimeout, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BatchTimeout;
  static deserializeBinaryFromReader(message: BatchTimeout, reader: jspb.BinaryReader): BatchTimeout;
}

export namespace BatchTimeout {
  export type AsObject = {
    timeout: string,
  }
}

export class KafkaBrokers extends jspb.Message {
  clearBrokersList(): void;
  getBrokersList(): Array<string>;
  setBrokersList(value: Array<string>): void;
  addBrokers(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KafkaBrokers.AsObject;
  static toObject(includeInstance: boolean, msg: KafkaBrokers): KafkaBrokers.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KafkaBrokers, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KafkaBrokers;
  static deserializeBinaryFromReader(message: KafkaBrokers, reader: jspb.BinaryReader): KafkaBrokers;
}

export namespace KafkaBrokers {
  export type AsObject = {
    brokersList: Array<string>,
  }
}

export class ChannelRestrictions extends jspb.Message {
  getMaxCount(): number;
  setMaxCount(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChannelRestrictions.AsObject;
  static toObject(includeInstance: boolean, msg: ChannelRestrictions): ChannelRestrictions.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChannelRestrictions, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChannelRestrictions;
  static deserializeBinaryFromReader(message: ChannelRestrictions, reader: jspb.BinaryReader): ChannelRestrictions;
}

export namespace ChannelRestrictions {
  export type AsObject = {
    maxCount: number,
  }
}

