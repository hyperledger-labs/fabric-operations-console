// package: kvrwset
// file: ledger/rwset/kvrwset/kv_rwset.proto

import * as jspb from "google-protobuf";

export class KVRWSet extends jspb.Message {
  clearReadsList(): void;
  getReadsList(): Array<KVRead>;
  setReadsList(value: Array<KVRead>): void;
  addReads(value?: KVRead, index?: number): KVRead;

  clearRangeQueriesInfoList(): void;
  getRangeQueriesInfoList(): Array<RangeQueryInfo>;
  setRangeQueriesInfoList(value: Array<RangeQueryInfo>): void;
  addRangeQueriesInfo(value?: RangeQueryInfo, index?: number): RangeQueryInfo;

  clearWritesList(): void;
  getWritesList(): Array<KVWrite>;
  setWritesList(value: Array<KVWrite>): void;
  addWrites(value?: KVWrite, index?: number): KVWrite;

  clearMetadataWritesList(): void;
  getMetadataWritesList(): Array<KVMetadataWrite>;
  setMetadataWritesList(value: Array<KVMetadataWrite>): void;
  addMetadataWrites(value?: KVMetadataWrite, index?: number): KVMetadataWrite;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVRWSet.AsObject;
  static toObject(includeInstance: boolean, msg: KVRWSet): KVRWSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVRWSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVRWSet;
  static deserializeBinaryFromReader(message: KVRWSet, reader: jspb.BinaryReader): KVRWSet;
}

export namespace KVRWSet {
  export type AsObject = {
    readsList: Array<KVRead.AsObject>,
    rangeQueriesInfoList: Array<RangeQueryInfo.AsObject>,
    writesList: Array<KVWrite.AsObject>,
    metadataWritesList: Array<KVMetadataWrite.AsObject>,
  }
}

export class HashedRWSet extends jspb.Message {
  clearHashedReadsList(): void;
  getHashedReadsList(): Array<KVReadHash>;
  setHashedReadsList(value: Array<KVReadHash>): void;
  addHashedReads(value?: KVReadHash, index?: number): KVReadHash;

  clearHashedWritesList(): void;
  getHashedWritesList(): Array<KVWriteHash>;
  setHashedWritesList(value: Array<KVWriteHash>): void;
  addHashedWrites(value?: KVWriteHash, index?: number): KVWriteHash;

  clearMetadataWritesList(): void;
  getMetadataWritesList(): Array<KVMetadataWriteHash>;
  setMetadataWritesList(value: Array<KVMetadataWriteHash>): void;
  addMetadataWrites(value?: KVMetadataWriteHash, index?: number): KVMetadataWriteHash;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HashedRWSet.AsObject;
  static toObject(includeInstance: boolean, msg: HashedRWSet): HashedRWSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HashedRWSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HashedRWSet;
  static deserializeBinaryFromReader(message: HashedRWSet, reader: jspb.BinaryReader): HashedRWSet;
}

export namespace HashedRWSet {
  export type AsObject = {
    hashedReadsList: Array<KVReadHash.AsObject>,
    hashedWritesList: Array<KVWriteHash.AsObject>,
    metadataWritesList: Array<KVMetadataWriteHash.AsObject>,
  }
}

export class KVRead extends jspb.Message {
  getKey(): string;
  setKey(value: string): void;

  hasVersion(): boolean;
  clearVersion(): void;
  getVersion(): Version | undefined;
  setVersion(value?: Version): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVRead.AsObject;
  static toObject(includeInstance: boolean, msg: KVRead): KVRead.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVRead, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVRead;
  static deserializeBinaryFromReader(message: KVRead, reader: jspb.BinaryReader): KVRead;
}

export namespace KVRead {
  export type AsObject = {
    key: string,
    version?: Version.AsObject,
  }
}

export class KVWrite extends jspb.Message {
  getKey(): string;
  setKey(value: string): void;

  getIsDelete(): boolean;
  setIsDelete(value: boolean): void;

  getValue(): Uint8Array | string;
  getValue_asU8(): Uint8Array;
  getValue_asB64(): string;
  setValue(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVWrite.AsObject;
  static toObject(includeInstance: boolean, msg: KVWrite): KVWrite.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVWrite, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVWrite;
  static deserializeBinaryFromReader(message: KVWrite, reader: jspb.BinaryReader): KVWrite;
}

export namespace KVWrite {
  export type AsObject = {
    key: string,
    isDelete: boolean,
    value: Uint8Array | string,
  }
}

export class KVMetadataWrite extends jspb.Message {
  getKey(): string;
  setKey(value: string): void;

  clearEntriesList(): void;
  getEntriesList(): Array<KVMetadataEntry>;
  setEntriesList(value: Array<KVMetadataEntry>): void;
  addEntries(value?: KVMetadataEntry, index?: number): KVMetadataEntry;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVMetadataWrite.AsObject;
  static toObject(includeInstance: boolean, msg: KVMetadataWrite): KVMetadataWrite.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVMetadataWrite, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVMetadataWrite;
  static deserializeBinaryFromReader(message: KVMetadataWrite, reader: jspb.BinaryReader): KVMetadataWrite;
}

export namespace KVMetadataWrite {
  export type AsObject = {
    key: string,
    entriesList: Array<KVMetadataEntry.AsObject>,
  }
}

export class KVReadHash extends jspb.Message {
  getKeyHash(): Uint8Array | string;
  getKeyHash_asU8(): Uint8Array;
  getKeyHash_asB64(): string;
  setKeyHash(value: Uint8Array | string): void;

  hasVersion(): boolean;
  clearVersion(): void;
  getVersion(): Version | undefined;
  setVersion(value?: Version): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVReadHash.AsObject;
  static toObject(includeInstance: boolean, msg: KVReadHash): KVReadHash.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVReadHash, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVReadHash;
  static deserializeBinaryFromReader(message: KVReadHash, reader: jspb.BinaryReader): KVReadHash;
}

export namespace KVReadHash {
  export type AsObject = {
    keyHash: Uint8Array | string,
    version?: Version.AsObject,
  }
}

export class KVWriteHash extends jspb.Message {
  getKeyHash(): Uint8Array | string;
  getKeyHash_asU8(): Uint8Array;
  getKeyHash_asB64(): string;
  setKeyHash(value: Uint8Array | string): void;

  getIsDelete(): boolean;
  setIsDelete(value: boolean): void;

  getValueHash(): Uint8Array | string;
  getValueHash_asU8(): Uint8Array;
  getValueHash_asB64(): string;
  setValueHash(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVWriteHash.AsObject;
  static toObject(includeInstance: boolean, msg: KVWriteHash): KVWriteHash.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVWriteHash, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVWriteHash;
  static deserializeBinaryFromReader(message: KVWriteHash, reader: jspb.BinaryReader): KVWriteHash;
}

export namespace KVWriteHash {
  export type AsObject = {
    keyHash: Uint8Array | string,
    isDelete: boolean,
    valueHash: Uint8Array | string,
  }
}

export class KVMetadataWriteHash extends jspb.Message {
  getKeyHash(): Uint8Array | string;
  getKeyHash_asU8(): Uint8Array;
  getKeyHash_asB64(): string;
  setKeyHash(value: Uint8Array | string): void;

  clearEntriesList(): void;
  getEntriesList(): Array<KVMetadataEntry>;
  setEntriesList(value: Array<KVMetadataEntry>): void;
  addEntries(value?: KVMetadataEntry, index?: number): KVMetadataEntry;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVMetadataWriteHash.AsObject;
  static toObject(includeInstance: boolean, msg: KVMetadataWriteHash): KVMetadataWriteHash.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVMetadataWriteHash, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVMetadataWriteHash;
  static deserializeBinaryFromReader(message: KVMetadataWriteHash, reader: jspb.BinaryReader): KVMetadataWriteHash;
}

export namespace KVMetadataWriteHash {
  export type AsObject = {
    keyHash: Uint8Array | string,
    entriesList: Array<KVMetadataEntry.AsObject>,
  }
}

export class KVMetadataEntry extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  getValue(): Uint8Array | string;
  getValue_asU8(): Uint8Array;
  getValue_asB64(): string;
  setValue(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KVMetadataEntry.AsObject;
  static toObject(includeInstance: boolean, msg: KVMetadataEntry): KVMetadataEntry.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KVMetadataEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KVMetadataEntry;
  static deserializeBinaryFromReader(message: KVMetadataEntry, reader: jspb.BinaryReader): KVMetadataEntry;
}

export namespace KVMetadataEntry {
  export type AsObject = {
    name: string,
    value: Uint8Array | string,
  }
}

export class Version extends jspb.Message {
  getBlockNum(): number;
  setBlockNum(value: number): void;

  getTxNum(): number;
  setTxNum(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Version.AsObject;
  static toObject(includeInstance: boolean, msg: Version): Version.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Version, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Version;
  static deserializeBinaryFromReader(message: Version, reader: jspb.BinaryReader): Version;
}

export namespace Version {
  export type AsObject = {
    blockNum: number,
    txNum: number,
  }
}

export class RangeQueryInfo extends jspb.Message {
  getStartKey(): string;
  setStartKey(value: string): void;

  getEndKey(): string;
  setEndKey(value: string): void;

  getItrExhausted(): boolean;
  setItrExhausted(value: boolean): void;

  hasRawReads(): boolean;
  clearRawReads(): void;
  getRawReads(): QueryReads | undefined;
  setRawReads(value?: QueryReads): void;

  hasReadsMerkleHashes(): boolean;
  clearReadsMerkleHashes(): void;
  getReadsMerkleHashes(): QueryReadsMerkleSummary | undefined;
  setReadsMerkleHashes(value?: QueryReadsMerkleSummary): void;

  getReadsInfoCase(): RangeQueryInfo.ReadsInfoCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RangeQueryInfo.AsObject;
  static toObject(includeInstance: boolean, msg: RangeQueryInfo): RangeQueryInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RangeQueryInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RangeQueryInfo;
  static deserializeBinaryFromReader(message: RangeQueryInfo, reader: jspb.BinaryReader): RangeQueryInfo;
}

export namespace RangeQueryInfo {
  export type AsObject = {
    startKey: string,
    endKey: string,
    itrExhausted: boolean,
    rawReads?: QueryReads.AsObject,
    readsMerkleHashes?: QueryReadsMerkleSummary.AsObject,
  }

  export enum ReadsInfoCase {
    READS_INFO_NOT_SET = 0,
    RAW_READS = 4,
    READS_MERKLE_HASHES = 5,
  }
}

export class QueryReads extends jspb.Message {
  clearKvReadsList(): void;
  getKvReadsList(): Array<KVRead>;
  setKvReadsList(value: Array<KVRead>): void;
  addKvReads(value?: KVRead, index?: number): KVRead;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): QueryReads.AsObject;
  static toObject(includeInstance: boolean, msg: QueryReads): QueryReads.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: QueryReads, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): QueryReads;
  static deserializeBinaryFromReader(message: QueryReads, reader: jspb.BinaryReader): QueryReads;
}

export namespace QueryReads {
  export type AsObject = {
    kvReadsList: Array<KVRead.AsObject>,
  }
}

export class QueryReadsMerkleSummary extends jspb.Message {
  getMaxDegree(): number;
  setMaxDegree(value: number): void;

  getMaxLevel(): number;
  setMaxLevel(value: number): void;

  clearMaxLevelHashesList(): void;
  getMaxLevelHashesList(): Array<Uint8Array | string>;
  getMaxLevelHashesList_asU8(): Array<Uint8Array>;
  getMaxLevelHashesList_asB64(): Array<string>;
  setMaxLevelHashesList(value: Array<Uint8Array | string>): void;
  addMaxLevelHashes(value: Uint8Array | string, index?: number): Uint8Array | string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): QueryReadsMerkleSummary.AsObject;
  static toObject(includeInstance: boolean, msg: QueryReadsMerkleSummary): QueryReadsMerkleSummary.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: QueryReadsMerkleSummary, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): QueryReadsMerkleSummary;
  static deserializeBinaryFromReader(message: QueryReadsMerkleSummary, reader: jspb.BinaryReader): QueryReadsMerkleSummary;
}

export namespace QueryReadsMerkleSummary {
  export type AsObject = {
    maxDegree: number,
    maxLevel: number,
    maxLevelHashesList: Array<Uint8Array | string>,
  }
}

