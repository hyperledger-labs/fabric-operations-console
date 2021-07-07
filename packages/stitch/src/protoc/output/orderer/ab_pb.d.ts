// package: orderer
// file: orderer/ab.proto

import * as jspb from "google-protobuf";
import * as common_common_pb from "../common/common_pb";

export class BroadcastResponse extends jspb.Message {
  getStatus(): common_common_pb.Status;
  setStatus(value: common_common_pb.Status): void;

  getInfo(): string;
  setInfo(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BroadcastResponse.AsObject;
  static toObject(includeInstance: boolean, msg: BroadcastResponse): BroadcastResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BroadcastResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BroadcastResponse;
  static deserializeBinaryFromReader(message: BroadcastResponse, reader: jspb.BinaryReader): BroadcastResponse;
}

export namespace BroadcastResponse {
  export type AsObject = {
    status: common_common_pb.Status,
    info: string,
  }
}

export class SeekNewest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SeekNewest.AsObject;
  static toObject(includeInstance: boolean, msg: SeekNewest): SeekNewest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SeekNewest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SeekNewest;
  static deserializeBinaryFromReader(message: SeekNewest, reader: jspb.BinaryReader): SeekNewest;
}

export namespace SeekNewest {
  export type AsObject = {
  }
}

export class SeekOldest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SeekOldest.AsObject;
  static toObject(includeInstance: boolean, msg: SeekOldest): SeekOldest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SeekOldest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SeekOldest;
  static deserializeBinaryFromReader(message: SeekOldest, reader: jspb.BinaryReader): SeekOldest;
}

export namespace SeekOldest {
  export type AsObject = {
  }
}

export class SeekSpecified extends jspb.Message {
  getNumber(): number;
  setNumber(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SeekSpecified.AsObject;
  static toObject(includeInstance: boolean, msg: SeekSpecified): SeekSpecified.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SeekSpecified, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SeekSpecified;
  static deserializeBinaryFromReader(message: SeekSpecified, reader: jspb.BinaryReader): SeekSpecified;
}

export namespace SeekSpecified {
  export type AsObject = {
    number: number,
  }
}

export class SeekPosition extends jspb.Message {
  hasNewest(): boolean;
  clearNewest(): void;
  getNewest(): SeekNewest | undefined;
  setNewest(value?: SeekNewest): void;

  hasOldest(): boolean;
  clearOldest(): void;
  getOldest(): SeekOldest | undefined;
  setOldest(value?: SeekOldest): void;

  hasSpecified(): boolean;
  clearSpecified(): void;
  getSpecified(): SeekSpecified | undefined;
  setSpecified(value?: SeekSpecified): void;

  getTypeCase(): SeekPosition.TypeCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SeekPosition.AsObject;
  static toObject(includeInstance: boolean, msg: SeekPosition): SeekPosition.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SeekPosition, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SeekPosition;
  static deserializeBinaryFromReader(message: SeekPosition, reader: jspb.BinaryReader): SeekPosition;
}

export namespace SeekPosition {
  export type AsObject = {
    newest?: SeekNewest.AsObject,
    oldest?: SeekOldest.AsObject,
    specified?: SeekSpecified.AsObject,
  }

  export enum TypeCase {
    TYPE_NOT_SET = 0,
    NEWEST = 1,
    OLDEST = 2,
    SPECIFIED = 3,
  }
}

export class SeekInfo extends jspb.Message {
  hasStart(): boolean;
  clearStart(): void;
  getStart(): SeekPosition | undefined;
  setStart(value?: SeekPosition): void;

  hasStop(): boolean;
  clearStop(): void;
  getStop(): SeekPosition | undefined;
  setStop(value?: SeekPosition): void;

  getBehavior(): SeekInfo.SeekBehavior;
  setBehavior(value: SeekInfo.SeekBehavior): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SeekInfo.AsObject;
  static toObject(includeInstance: boolean, msg: SeekInfo): SeekInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SeekInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SeekInfo;
  static deserializeBinaryFromReader(message: SeekInfo, reader: jspb.BinaryReader): SeekInfo;
}

export namespace SeekInfo {
  export type AsObject = {
    start?: SeekPosition.AsObject,
    stop?: SeekPosition.AsObject,
    behavior: SeekInfo.SeekBehavior,
  }

  export enum SeekBehavior {
    BLOCK_UNTIL_READY = 0,
    FAIL_IF_NOT_READY = 1,
  }
}

export class DeliverResponse extends jspb.Message {
  hasStatus(): boolean;
  clearStatus(): void;
  getStatus(): common_common_pb.Status;
  setStatus(value: common_common_pb.Status): void;

  hasBlock(): boolean;
  clearBlock(): void;
  getBlock(): common_common_pb.Block | undefined;
  setBlock(value?: common_common_pb.Block): void;

  getTypeCase(): DeliverResponse.TypeCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeliverResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeliverResponse): DeliverResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DeliverResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeliverResponse;
  static deserializeBinaryFromReader(message: DeliverResponse, reader: jspb.BinaryReader): DeliverResponse;
}

export namespace DeliverResponse {
  export type AsObject = {
    status: common_common_pb.Status,
    block?: common_common_pb.Block.AsObject,
  }

  export enum TypeCase {
    TYPE_NOT_SET = 0,
    STATUS = 1,
    BLOCK = 2,
  }
}

