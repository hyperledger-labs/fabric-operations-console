// package: common
// file: common/policies.proto

import * as jspb from "google-protobuf";
import * as msp_msp_principal_pb from "../msp/msp_principal_pb";

export class Policy extends jspb.Message {
  getType(): number;
  setType(value: number): void;

  getValue(): Uint8Array | string;
  getValue_asU8(): Uint8Array;
  getValue_asB64(): string;
  setValue(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Policy.AsObject;
  static toObject(includeInstance: boolean, msg: Policy): Policy.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Policy, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Policy;
  static deserializeBinaryFromReader(message: Policy, reader: jspb.BinaryReader): Policy;
}

export namespace Policy {
  export type AsObject = {
    type: number,
    value: Uint8Array | string,
  }

  export enum PolicyType {
    UNKNOWN = 0,
    SIGNATURE = 1,
    MSP = 2,
    IMPLICIT_META = 3,
  }
}

export class SignaturePolicyEnvelope extends jspb.Message {
  getVersion(): number;
  setVersion(value: number): void;

  hasRule(): boolean;
  clearRule(): void;
  getRule(): SignaturePolicy | undefined;
  setRule(value?: SignaturePolicy): void;

  clearIdentitiesList(): void;
  getIdentitiesList(): Array<msp_msp_principal_pb.MSPPrincipal>;
  setIdentitiesList(value: Array<msp_msp_principal_pb.MSPPrincipal>): void;
  addIdentities(value?: msp_msp_principal_pb.MSPPrincipal, index?: number): msp_msp_principal_pb.MSPPrincipal;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignaturePolicyEnvelope.AsObject;
  static toObject(includeInstance: boolean, msg: SignaturePolicyEnvelope): SignaturePolicyEnvelope.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignaturePolicyEnvelope, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignaturePolicyEnvelope;
  static deserializeBinaryFromReader(message: SignaturePolicyEnvelope, reader: jspb.BinaryReader): SignaturePolicyEnvelope;
}

export namespace SignaturePolicyEnvelope {
  export type AsObject = {
    version: number,
    rule?: SignaturePolicy.AsObject,
    identitiesList: Array<msp_msp_principal_pb.MSPPrincipal.AsObject>,
  }
}

export class SignaturePolicy extends jspb.Message {
  hasSignedBy(): boolean;
  clearSignedBy(): void;
  getSignedBy(): number;
  setSignedBy(value: number): void;

  hasNOutOf(): boolean;
  clearNOutOf(): void;
  getNOutOf(): SignaturePolicy.NOutOf | undefined;
  setNOutOf(value?: SignaturePolicy.NOutOf): void;

  getTypeCase(): SignaturePolicy.TypeCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignaturePolicy.AsObject;
  static toObject(includeInstance: boolean, msg: SignaturePolicy): SignaturePolicy.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignaturePolicy, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignaturePolicy;
  static deserializeBinaryFromReader(message: SignaturePolicy, reader: jspb.BinaryReader): SignaturePolicy;
}

export namespace SignaturePolicy {
  export type AsObject = {
    signedBy: number,
    nOutOf?: SignaturePolicy.NOutOf.AsObject,
  }

  export class NOutOf extends jspb.Message {
    getN(): number;
    setN(value: number): void;

    clearRulesList(): void;
    getRulesList(): Array<SignaturePolicy>;
    setRulesList(value: Array<SignaturePolicy>): void;
    addRules(value?: SignaturePolicy, index?: number): SignaturePolicy;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NOutOf.AsObject;
    static toObject(includeInstance: boolean, msg: NOutOf): NOutOf.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NOutOf, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NOutOf;
    static deserializeBinaryFromReader(message: NOutOf, reader: jspb.BinaryReader): NOutOf;
  }

  export namespace NOutOf {
    export type AsObject = {
      n: number,
      rulesList: Array<SignaturePolicy.AsObject>,
    }
  }

  export enum TypeCase {
    TYPE_NOT_SET = 0,
    SIGNED_BY = 1,
    N_OUT_OF = 2,
  }
}

export class ImplicitMetaPolicy extends jspb.Message {
  getSubPolicy(): string;
  setSubPolicy(value: string): void;

  getRule(): ImplicitMetaPolicy.Rule;
  setRule(value: ImplicitMetaPolicy.Rule): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ImplicitMetaPolicy.AsObject;
  static toObject(includeInstance: boolean, msg: ImplicitMetaPolicy): ImplicitMetaPolicy.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ImplicitMetaPolicy, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ImplicitMetaPolicy;
  static deserializeBinaryFromReader(message: ImplicitMetaPolicy, reader: jspb.BinaryReader): ImplicitMetaPolicy;
}

export namespace ImplicitMetaPolicy {
  export type AsObject = {
    subPolicy: string,
    rule: ImplicitMetaPolicy.Rule,
  }

  export enum Rule {
    ANY = 0,
    ALL = 1,
    MAJORITY = 2,
  }
}

