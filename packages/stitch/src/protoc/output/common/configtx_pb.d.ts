// package: common
// file: common/configtx.proto

import * as jspb from "google-protobuf";
import * as common_common_pb from "../common/common_pb";
import * as common_policies_pb from "../common/policies_pb";

export class ConfigEnvelope extends jspb.Message {
  hasConfig(): boolean;
  clearConfig(): void;
  getConfig(): Config | undefined;
  setConfig(value?: Config): void;

  hasLastUpdate(): boolean;
  clearLastUpdate(): void;
  getLastUpdate(): common_common_pb.Envelope | undefined;
  setLastUpdate(value?: common_common_pb.Envelope): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigEnvelope.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigEnvelope): ConfigEnvelope.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigEnvelope, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigEnvelope;
  static deserializeBinaryFromReader(message: ConfigEnvelope, reader: jspb.BinaryReader): ConfigEnvelope;
}

export namespace ConfigEnvelope {
  export type AsObject = {
    config?: Config.AsObject,
    lastUpdate?: common_common_pb.Envelope.AsObject,
  }
}

export class ConfigGroupSchema extends jspb.Message {
  getGroupsMap(): jspb.Map<string, ConfigGroupSchema>;
  clearGroupsMap(): void;
  getValuesMap(): jspb.Map<string, ConfigValueSchema>;
  clearValuesMap(): void;
  getPoliciesMap(): jspb.Map<string, ConfigPolicySchema>;
  clearPoliciesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigGroupSchema.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigGroupSchema): ConfigGroupSchema.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigGroupSchema, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigGroupSchema;
  static deserializeBinaryFromReader(message: ConfigGroupSchema, reader: jspb.BinaryReader): ConfigGroupSchema;
}

export namespace ConfigGroupSchema {
  export type AsObject = {
    groupsMap: Array<[string, ConfigGroupSchema.AsObject]>,
    valuesMap: Array<[string, ConfigValueSchema.AsObject]>,
    policiesMap: Array<[string, ConfigPolicySchema.AsObject]>,
  }
}

export class ConfigValueSchema extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigValueSchema.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigValueSchema): ConfigValueSchema.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigValueSchema, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigValueSchema;
  static deserializeBinaryFromReader(message: ConfigValueSchema, reader: jspb.BinaryReader): ConfigValueSchema;
}

export namespace ConfigValueSchema {
  export type AsObject = {
  }
}

export class ConfigPolicySchema extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigPolicySchema.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigPolicySchema): ConfigPolicySchema.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigPolicySchema, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigPolicySchema;
  static deserializeBinaryFromReader(message: ConfigPolicySchema, reader: jspb.BinaryReader): ConfigPolicySchema;
}

export namespace ConfigPolicySchema {
  export type AsObject = {
  }
}

export class Config extends jspb.Message {
  getSequence(): number;
  setSequence(value: number): void;

  hasChannelGroup(): boolean;
  clearChannelGroup(): void;
  getChannelGroup(): ConfigGroup | undefined;
  setChannelGroup(value?: ConfigGroup): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Config.AsObject;
  static toObject(includeInstance: boolean, msg: Config): Config.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Config, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Config;
  static deserializeBinaryFromReader(message: Config, reader: jspb.BinaryReader): Config;
}

export namespace Config {
  export type AsObject = {
    sequence: number,
    channelGroup?: ConfigGroup.AsObject,
  }
}

export class ConfigUpdateEnvelope extends jspb.Message {
  getConfigUpdate(): Uint8Array | string;
  getConfigUpdate_asU8(): Uint8Array;
  getConfigUpdate_asB64(): string;
  setConfigUpdate(value: Uint8Array | string): void;

  clearSignaturesList(): void;
  getSignaturesList(): Array<ConfigSignature>;
  setSignaturesList(value: Array<ConfigSignature>): void;
  addSignatures(value?: ConfigSignature, index?: number): ConfigSignature;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigUpdateEnvelope.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigUpdateEnvelope): ConfigUpdateEnvelope.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigUpdateEnvelope, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigUpdateEnvelope;
  static deserializeBinaryFromReader(message: ConfigUpdateEnvelope, reader: jspb.BinaryReader): ConfigUpdateEnvelope;
}

export namespace ConfigUpdateEnvelope {
  export type AsObject = {
    configUpdate: Uint8Array | string,
    signaturesList: Array<ConfigSignature.AsObject>,
  }
}

export class ConfigUpdate extends jspb.Message {
  getChannelId(): string;
  setChannelId(value: string): void;

  hasReadSet(): boolean;
  clearReadSet(): void;
  getReadSet(): ConfigGroup | undefined;
  setReadSet(value?: ConfigGroup): void;

  hasWriteSet(): boolean;
  clearWriteSet(): void;
  getWriteSet(): ConfigGroup | undefined;
  setWriteSet(value?: ConfigGroup): void;

  getIsolatedDataMap(): jspb.Map<string, Uint8Array | string>;
  clearIsolatedDataMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigUpdate.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigUpdate): ConfigUpdate.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigUpdate, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigUpdate;
  static deserializeBinaryFromReader(message: ConfigUpdate, reader: jspb.BinaryReader): ConfigUpdate;
}

export namespace ConfigUpdate {
  export type AsObject = {
    channelId: string,
    readSet?: ConfigGroup.AsObject,
    writeSet?: ConfigGroup.AsObject,
    isolatedDataMap: Array<[string, Uint8Array | string]>,
  }
}

export class ConfigGroup extends jspb.Message {
  getVersion(): number;
  setVersion(value: number): void;

  getGroupsMap(): jspb.Map<string, ConfigGroup>;
  clearGroupsMap(): void;
  getValuesMap(): jspb.Map<string, ConfigValue>;
  clearValuesMap(): void;
  getPoliciesMap(): jspb.Map<string, ConfigPolicy>;
  clearPoliciesMap(): void;
  getModPolicy(): string;
  setModPolicy(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigGroup.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigGroup): ConfigGroup.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigGroup, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigGroup;
  static deserializeBinaryFromReader(message: ConfigGroup, reader: jspb.BinaryReader): ConfigGroup;
}

export namespace ConfigGroup {
  export type AsObject = {
    version: number,
    groupsMap: Array<[string, ConfigGroup.AsObject]>,
    valuesMap: Array<[string, ConfigValue.AsObject]>,
    policiesMap: Array<[string, ConfigPolicy.AsObject]>,
    modPolicy: string,
  }
}

export class ConfigValue extends jspb.Message {
  getVersion(): number;
  setVersion(value: number): void;

  getValue(): Uint8Array | string;
  getValue_asU8(): Uint8Array;
  getValue_asB64(): string;
  setValue(value: Uint8Array | string): void;

  getModPolicy(): string;
  setModPolicy(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigValue.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigValue): ConfigValue.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigValue, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigValue;
  static deserializeBinaryFromReader(message: ConfigValue, reader: jspb.BinaryReader): ConfigValue;
}

export namespace ConfigValue {
  export type AsObject = {
    version: number,
    value: Uint8Array | string,
    modPolicy: string,
  }
}

export class ConfigPolicy extends jspb.Message {
  getVersion(): number;
  setVersion(value: number): void;

  hasPolicy(): boolean;
  clearPolicy(): void;
  getPolicy(): common_policies_pb.Policy | undefined;
  setPolicy(value?: common_policies_pb.Policy): void;

  getModPolicy(): string;
  setModPolicy(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigPolicy.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigPolicy): ConfigPolicy.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigPolicy, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigPolicy;
  static deserializeBinaryFromReader(message: ConfigPolicy, reader: jspb.BinaryReader): ConfigPolicy;
}

export namespace ConfigPolicy {
  export type AsObject = {
    version: number,
    policy?: common_policies_pb.Policy.AsObject,
    modPolicy: string,
  }
}

export class ConfigSignature extends jspb.Message {
  getSignatureHeader(): Uint8Array | string;
  getSignatureHeader_asU8(): Uint8Array;
  getSignatureHeader_asB64(): string;
  setSignatureHeader(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigSignature.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigSignature): ConfigSignature.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigSignature, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigSignature;
  static deserializeBinaryFromReader(message: ConfigSignature, reader: jspb.BinaryReader): ConfigSignature;
}

export namespace ConfigSignature {
  export type AsObject = {
    signatureHeader: Uint8Array | string,
    signature: Uint8Array | string,
  }
}
