// package: rwset
// file: ledger/rwset/rwset.proto

import * as jspb from "google-protobuf";

export class TxReadWriteSet extends jspb.Message {
  getDataModel(): TxReadWriteSet.DataModel;
  setDataModel(value: TxReadWriteSet.DataModel): void;

  clearNsRwsetList(): void;
  getNsRwsetList(): Array<NsReadWriteSet>;
  setNsRwsetList(value: Array<NsReadWriteSet>): void;
  addNsRwset(value?: NsReadWriteSet, index?: number): NsReadWriteSet;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TxReadWriteSet.AsObject;
  static toObject(includeInstance: boolean, msg: TxReadWriteSet): TxReadWriteSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TxReadWriteSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TxReadWriteSet;
  static deserializeBinaryFromReader(message: TxReadWriteSet, reader: jspb.BinaryReader): TxReadWriteSet;
}

export namespace TxReadWriteSet {
  export type AsObject = {
    dataModel: TxReadWriteSet.DataModel,
    nsRwsetList: Array<NsReadWriteSet.AsObject>,
  }

  export enum DataModel {
    KV = 0,
  }
}

export class NsReadWriteSet extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): void;

  getRwset(): Uint8Array | string;
  getRwset_asU8(): Uint8Array;
  getRwset_asB64(): string;
  setRwset(value: Uint8Array | string): void;

  clearCollectionHashedRwsetList(): void;
  getCollectionHashedRwsetList(): Array<CollectionHashedReadWriteSet>;
  setCollectionHashedRwsetList(value: Array<CollectionHashedReadWriteSet>): void;
  addCollectionHashedRwset(value?: CollectionHashedReadWriteSet, index?: number): CollectionHashedReadWriteSet;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): NsReadWriteSet.AsObject;
  static toObject(includeInstance: boolean, msg: NsReadWriteSet): NsReadWriteSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: NsReadWriteSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): NsReadWriteSet;
  static deserializeBinaryFromReader(message: NsReadWriteSet, reader: jspb.BinaryReader): NsReadWriteSet;
}

export namespace NsReadWriteSet {
  export type AsObject = {
    namespace: string,
    rwset: Uint8Array | string,
    collectionHashedRwsetList: Array<CollectionHashedReadWriteSet.AsObject>,
  }
}

export class CollectionHashedReadWriteSet extends jspb.Message {
  getCollectionName(): string;
  setCollectionName(value: string): void;

  getHashedRwset(): Uint8Array | string;
  getHashedRwset_asU8(): Uint8Array;
  getHashedRwset_asB64(): string;
  setHashedRwset(value: Uint8Array | string): void;

  getPvtRwsetHash(): Uint8Array | string;
  getPvtRwsetHash_asU8(): Uint8Array;
  getPvtRwsetHash_asB64(): string;
  setPvtRwsetHash(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CollectionHashedReadWriteSet.AsObject;
  static toObject(includeInstance: boolean, msg: CollectionHashedReadWriteSet): CollectionHashedReadWriteSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CollectionHashedReadWriteSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CollectionHashedReadWriteSet;
  static deserializeBinaryFromReader(message: CollectionHashedReadWriteSet, reader: jspb.BinaryReader): CollectionHashedReadWriteSet;
}

export namespace CollectionHashedReadWriteSet {
  export type AsObject = {
    collectionName: string,
    hashedRwset: Uint8Array | string,
    pvtRwsetHash: Uint8Array | string,
  }
}

export class TxPvtReadWriteSet extends jspb.Message {
  getDataModel(): TxReadWriteSet.DataModel;
  setDataModel(value: TxReadWriteSet.DataModel): void;

  clearNsPvtRwsetList(): void;
  getNsPvtRwsetList(): Array<NsPvtReadWriteSet>;
  setNsPvtRwsetList(value: Array<NsPvtReadWriteSet>): void;
  addNsPvtRwset(value?: NsPvtReadWriteSet, index?: number): NsPvtReadWriteSet;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TxPvtReadWriteSet.AsObject;
  static toObject(includeInstance: boolean, msg: TxPvtReadWriteSet): TxPvtReadWriteSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TxPvtReadWriteSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TxPvtReadWriteSet;
  static deserializeBinaryFromReader(message: TxPvtReadWriteSet, reader: jspb.BinaryReader): TxPvtReadWriteSet;
}

export namespace TxPvtReadWriteSet {
  export type AsObject = {
    dataModel: TxReadWriteSet.DataModel,
    nsPvtRwsetList: Array<NsPvtReadWriteSet.AsObject>,
  }
}

export class NsPvtReadWriteSet extends jspb.Message {
  getNamespace(): string;
  setNamespace(value: string): void;

  clearCollectionPvtRwsetList(): void;
  getCollectionPvtRwsetList(): Array<CollectionPvtReadWriteSet>;
  setCollectionPvtRwsetList(value: Array<CollectionPvtReadWriteSet>): void;
  addCollectionPvtRwset(value?: CollectionPvtReadWriteSet, index?: number): CollectionPvtReadWriteSet;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): NsPvtReadWriteSet.AsObject;
  static toObject(includeInstance: boolean, msg: NsPvtReadWriteSet): NsPvtReadWriteSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: NsPvtReadWriteSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): NsPvtReadWriteSet;
  static deserializeBinaryFromReader(message: NsPvtReadWriteSet, reader: jspb.BinaryReader): NsPvtReadWriteSet;
}

export namespace NsPvtReadWriteSet {
  export type AsObject = {
    namespace: string,
    collectionPvtRwsetList: Array<CollectionPvtReadWriteSet.AsObject>,
  }
}

export class CollectionPvtReadWriteSet extends jspb.Message {
  getCollectionName(): string;
  setCollectionName(value: string): void;

  getRwset(): Uint8Array | string;
  getRwset_asU8(): Uint8Array;
  getRwset_asB64(): string;
  setRwset(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CollectionPvtReadWriteSet.AsObject;
  static toObject(includeInstance: boolean, msg: CollectionPvtReadWriteSet): CollectionPvtReadWriteSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CollectionPvtReadWriteSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CollectionPvtReadWriteSet;
  static deserializeBinaryFromReader(message: CollectionPvtReadWriteSet, reader: jspb.BinaryReader): CollectionPvtReadWriteSet;
}

export namespace CollectionPvtReadWriteSet {
  export type AsObject = {
    collectionName: string,
    rwset: Uint8Array | string,
  }
}

