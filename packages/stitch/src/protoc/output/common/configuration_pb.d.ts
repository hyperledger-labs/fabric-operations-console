// package: common
// file: common/configuration.proto

import * as jspb from "google-protobuf";

export class HashingAlgorithm extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HashingAlgorithm.AsObject;
  static toObject(includeInstance: boolean, msg: HashingAlgorithm): HashingAlgorithm.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HashingAlgorithm, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HashingAlgorithm;
  static deserializeBinaryFromReader(message: HashingAlgorithm, reader: jspb.BinaryReader): HashingAlgorithm;
}

export namespace HashingAlgorithm {
  export type AsObject = {
    name: string,
  }
}

export class BlockDataHashingStructure extends jspb.Message {
  getWidth(): number;
  setWidth(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BlockDataHashingStructure.AsObject;
  static toObject(includeInstance: boolean, msg: BlockDataHashingStructure): BlockDataHashingStructure.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BlockDataHashingStructure, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BlockDataHashingStructure;
  static deserializeBinaryFromReader(message: BlockDataHashingStructure, reader: jspb.BinaryReader): BlockDataHashingStructure;
}

export namespace BlockDataHashingStructure {
  export type AsObject = {
    width: number,
  }
}

export class OrdererAddresses extends jspb.Message {
  clearAddressesList(): void;
  getAddressesList(): Array<string>;
  setAddressesList(value: Array<string>): void;
  addAddresses(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OrdererAddresses.AsObject;
  static toObject(includeInstance: boolean, msg: OrdererAddresses): OrdererAddresses.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: OrdererAddresses, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OrdererAddresses;
  static deserializeBinaryFromReader(message: OrdererAddresses, reader: jspb.BinaryReader): OrdererAddresses;
}

export namespace OrdererAddresses {
  export type AsObject = {
    addressesList: Array<string>,
  }
}

export class Consortium extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Consortium.AsObject;
  static toObject(includeInstance: boolean, msg: Consortium): Consortium.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Consortium, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Consortium;
  static deserializeBinaryFromReader(message: Consortium, reader: jspb.BinaryReader): Consortium;
}

export namespace Consortium {
  export type AsObject = {
    name: string,
  }
}

export class Capabilities extends jspb.Message {
  getCapabilitiesMap(): jspb.Map<string, Capability>;
  clearCapabilitiesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Capabilities.AsObject;
  static toObject(includeInstance: boolean, msg: Capabilities): Capabilities.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Capabilities, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Capabilities;
  static deserializeBinaryFromReader(message: Capabilities, reader: jspb.BinaryReader): Capabilities;
}

export namespace Capabilities {
  export type AsObject = {
    capabilitiesMap: Array<[string, Capability.AsObject]>,
  }
}

export class Capability extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Capability.AsObject;
  static toObject(includeInstance: boolean, msg: Capability): Capability.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Capability, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Capability;
  static deserializeBinaryFromReader(message: Capability, reader: jspb.BinaryReader): Capability;
}

export namespace Capability {
  export type AsObject = {
  }
}

