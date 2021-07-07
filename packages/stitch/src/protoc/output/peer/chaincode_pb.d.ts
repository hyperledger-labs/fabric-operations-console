// package: protos
// file: peer/chaincode.proto

import * as jspb from "google-protobuf";

export class ChaincodeID extends jspb.Message {
  getPath(): string;
  setPath(value: string): void;

  getName(): string;
  setName(value: string): void;

  getVersion(): string;
  setVersion(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeID.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeID): ChaincodeID.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeID, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeID;
  static deserializeBinaryFromReader(message: ChaincodeID, reader: jspb.BinaryReader): ChaincodeID;
}

export namespace ChaincodeID {
  export type AsObject = {
    path: string,
    name: string,
    version: string,
  }
}

export class ChaincodeInput extends jspb.Message {
  clearArgsList(): void;
  getArgsList(): Array<Uint8Array | string>;
  getArgsList_asU8(): Array<Uint8Array>;
  getArgsList_asB64(): Array<string>;
  setArgsList(value: Array<Uint8Array | string>): void;
  addArgs(value: Uint8Array | string, index?: number): Uint8Array | string;

  getDecorationsMap(): jspb.Map<string, Uint8Array | string>;
  clearDecorationsMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeInput.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeInput): ChaincodeInput.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeInput, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeInput;
  static deserializeBinaryFromReader(message: ChaincodeInput, reader: jspb.BinaryReader): ChaincodeInput;
}

export namespace ChaincodeInput {
  export type AsObject = {
    argsList: Array<Uint8Array | string>,
    decorationsMap: Array<[string, Uint8Array | string]>,
  }
}

export class ChaincodeSpec extends jspb.Message {
  getType(): ChaincodeSpec.Type;
  setType(value: ChaincodeSpec.Type): void;

  hasChaincodeId(): boolean;
  clearChaincodeId(): void;
  getChaincodeId(): ChaincodeID | undefined;
  setChaincodeId(value?: ChaincodeID): void;

  hasInput(): boolean;
  clearInput(): void;
  getInput(): ChaincodeInput | undefined;
  setInput(value?: ChaincodeInput): void;

  getTimeout(): number;
  setTimeout(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeSpec.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeSpec): ChaincodeSpec.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeSpec, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeSpec;
  static deserializeBinaryFromReader(message: ChaincodeSpec, reader: jspb.BinaryReader): ChaincodeSpec;
}

export namespace ChaincodeSpec {
  export type AsObject = {
    type: ChaincodeSpec.Type,
    chaincodeId?: ChaincodeID.AsObject,
    input?: ChaincodeInput.AsObject,
    timeout: number,
  }

  export enum Type {
    UNDEFINED = 0,
    GOLANG = 1,
    NODE = 2,
    CAR = 3,
    JAVA = 4,
  }
}

export class ChaincodeDeploymentSpec extends jspb.Message {
  hasChaincodeSpec(): boolean;
  clearChaincodeSpec(): void;
  getChaincodeSpec(): ChaincodeSpec | undefined;
  setChaincodeSpec(value?: ChaincodeSpec): void;

  getCodePackage(): Uint8Array | string;
  getCodePackage_asU8(): Uint8Array;
  getCodePackage_asB64(): string;
  setCodePackage(value: Uint8Array | string): void;

  getExecEnv(): ChaincodeDeploymentSpec.ExecutionEnvironment;
  setExecEnv(value: ChaincodeDeploymentSpec.ExecutionEnvironment): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeDeploymentSpec.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeDeploymentSpec): ChaincodeDeploymentSpec.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeDeploymentSpec, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeDeploymentSpec;
  static deserializeBinaryFromReader(message: ChaincodeDeploymentSpec, reader: jspb.BinaryReader): ChaincodeDeploymentSpec;
}

export namespace ChaincodeDeploymentSpec {
  export type AsObject = {
    chaincodeSpec?: ChaincodeSpec.AsObject,
    codePackage: Uint8Array | string,
    execEnv: ChaincodeDeploymentSpec.ExecutionEnvironment,
  }

  export enum ExecutionEnvironment {
    DOCKER = 0,
    SYSTEM = 1,
  }
}

export class ChaincodeInvocationSpec extends jspb.Message {
  hasChaincodeSpec(): boolean;
  clearChaincodeSpec(): void;
  getChaincodeSpec(): ChaincodeSpec | undefined;
  setChaincodeSpec(value?: ChaincodeSpec): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeInvocationSpec.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeInvocationSpec): ChaincodeInvocationSpec.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeInvocationSpec, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeInvocationSpec;
  static deserializeBinaryFromReader(message: ChaincodeInvocationSpec, reader: jspb.BinaryReader): ChaincodeInvocationSpec;
}

export namespace ChaincodeInvocationSpec {
  export type AsObject = {
    chaincodeSpec?: ChaincodeSpec.AsObject,
  }
}

export class LifecycleEvent extends jspb.Message {
  getChaincodeName(): string;
  setChaincodeName(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): LifecycleEvent.AsObject;
  static toObject(includeInstance: boolean, msg: LifecycleEvent): LifecycleEvent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: LifecycleEvent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): LifecycleEvent;
  static deserializeBinaryFromReader(message: LifecycleEvent, reader: jspb.BinaryReader): LifecycleEvent;
}

export namespace LifecycleEvent {
  export type AsObject = {
    chaincodeName: string,
  }
}

export enum ConfidentialityLevel {
  PUBLIC = 0,
  CONFIDENTIAL = 1,
}

