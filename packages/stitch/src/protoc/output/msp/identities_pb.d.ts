// package: msp
// file: msp/identities.proto

import * as jspb from "google-protobuf";

export class SerializedIdentity extends jspb.Message {
  getMspid(): string;
  setMspid(value: string): void;

  getIdBytes(): Uint8Array | string;
  getIdBytes_asU8(): Uint8Array;
  getIdBytes_asB64(): string;
  setIdBytes(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SerializedIdentity.AsObject;
  static toObject(includeInstance: boolean, msg: SerializedIdentity): SerializedIdentity.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SerializedIdentity, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SerializedIdentity;
  static deserializeBinaryFromReader(message: SerializedIdentity, reader: jspb.BinaryReader): SerializedIdentity;
}

export namespace SerializedIdentity {
  export type AsObject = {
    mspid: string,
    idBytes: Uint8Array | string,
  }
}

export class SerializedIdemixIdentity extends jspb.Message {
  getNymX(): Uint8Array | string;
  getNymX_asU8(): Uint8Array;
  getNymX_asB64(): string;
  setNymX(value: Uint8Array | string): void;

  getNymY(): Uint8Array | string;
  getNymY_asU8(): Uint8Array;
  getNymY_asB64(): string;
  setNymY(value: Uint8Array | string): void;

  getOu(): Uint8Array | string;
  getOu_asU8(): Uint8Array;
  getOu_asB64(): string;
  setOu(value: Uint8Array | string): void;

  getRole(): Uint8Array | string;
  getRole_asU8(): Uint8Array;
  getRole_asB64(): string;
  setRole(value: Uint8Array | string): void;

  getProof(): Uint8Array | string;
  getProof_asU8(): Uint8Array;
  getProof_asB64(): string;
  setProof(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SerializedIdemixIdentity.AsObject;
  static toObject(includeInstance: boolean, msg: SerializedIdemixIdentity): SerializedIdemixIdentity.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SerializedIdemixIdentity, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SerializedIdemixIdentity;
  static deserializeBinaryFromReader(message: SerializedIdemixIdentity, reader: jspb.BinaryReader): SerializedIdemixIdentity;
}

export namespace SerializedIdemixIdentity {
  export type AsObject = {
    nymX: Uint8Array | string,
    nymY: Uint8Array | string,
    ou: Uint8Array | string,
    role: Uint8Array | string,
    proof: Uint8Array | string,
  }
}

