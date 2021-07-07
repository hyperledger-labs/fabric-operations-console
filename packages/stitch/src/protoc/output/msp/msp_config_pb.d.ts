// package: msp
// file: msp/msp_config.proto

import * as jspb from "google-protobuf";

export class MSPConfig extends jspb.Message {
  getType(): number;
  setType(value: number): void;

  getConfig(): Uint8Array | string;
  getConfig_asU8(): Uint8Array;
  getConfig_asB64(): string;
  setConfig(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MSPConfig.AsObject;
  static toObject(includeInstance: boolean, msg: MSPConfig): MSPConfig.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MSPConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MSPConfig;
  static deserializeBinaryFromReader(message: MSPConfig, reader: jspb.BinaryReader): MSPConfig;
}

export namespace MSPConfig {
  export type AsObject = {
    type: number,
    config: Uint8Array | string,
  }
}

export class FabricMSPConfig extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  clearRootCertsList(): void;
  getRootCertsList(): Array<Uint8Array | string>;
  getRootCertsList_asU8(): Array<Uint8Array>;
  getRootCertsList_asB64(): Array<string>;
  setRootCertsList(value: Array<Uint8Array | string>): void;
  addRootCerts(value: Uint8Array | string, index?: number): Uint8Array | string;

  clearIntermediateCertsList(): void;
  getIntermediateCertsList(): Array<Uint8Array | string>;
  getIntermediateCertsList_asU8(): Array<Uint8Array>;
  getIntermediateCertsList_asB64(): Array<string>;
  setIntermediateCertsList(value: Array<Uint8Array | string>): void;
  addIntermediateCerts(value: Uint8Array | string, index?: number): Uint8Array | string;

  clearAdminsList(): void;
  getAdminsList(): Array<Uint8Array | string>;
  getAdminsList_asU8(): Array<Uint8Array>;
  getAdminsList_asB64(): Array<string>;
  setAdminsList(value: Array<Uint8Array | string>): void;
  addAdmins(value: Uint8Array | string, index?: number): Uint8Array | string;

  clearRevocationListList(): void;
  getRevocationListList(): Array<Uint8Array | string>;
  getRevocationListList_asU8(): Array<Uint8Array>;
  getRevocationListList_asB64(): Array<string>;
  setRevocationListList(value: Array<Uint8Array | string>): void;
  addRevocationList(value: Uint8Array | string, index?: number): Uint8Array | string;

  hasSigningIdentity(): boolean;
  clearSigningIdentity(): void;
  getSigningIdentity(): SigningIdentityInfo | undefined;
  setSigningIdentity(value?: SigningIdentityInfo): void;

  clearOrganizationalUnitIdentifiersList(): void;
  getOrganizationalUnitIdentifiersList(): Array<FabricOUIdentifier>;
  setOrganizationalUnitIdentifiersList(value: Array<FabricOUIdentifier>): void;
  addOrganizationalUnitIdentifiers(value?: FabricOUIdentifier, index?: number): FabricOUIdentifier;

  hasCryptoConfig(): boolean;
  clearCryptoConfig(): void;
  getCryptoConfig(): FabricCryptoConfig | undefined;
  setCryptoConfig(value?: FabricCryptoConfig): void;

  clearTlsRootCertsList(): void;
  getTlsRootCertsList(): Array<Uint8Array | string>;
  getTlsRootCertsList_asU8(): Array<Uint8Array>;
  getTlsRootCertsList_asB64(): Array<string>;
  setTlsRootCertsList(value: Array<Uint8Array | string>): void;
  addTlsRootCerts(value: Uint8Array | string, index?: number): Uint8Array | string;

  clearTlsIntermediateCertsList(): void;
  getTlsIntermediateCertsList(): Array<Uint8Array | string>;
  getTlsIntermediateCertsList_asU8(): Array<Uint8Array>;
  getTlsIntermediateCertsList_asB64(): Array<string>;
  setTlsIntermediateCertsList(value: Array<Uint8Array | string>): void;
  addTlsIntermediateCerts(value: Uint8Array | string, index?: number): Uint8Array | string;

  hasFabricNodeOus(): boolean;
  clearFabricNodeOus(): void;
  getFabricNodeOus(): FabricNodeOUs | undefined;
  setFabricNodeOus(value?: FabricNodeOUs): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FabricMSPConfig.AsObject;
  static toObject(includeInstance: boolean, msg: FabricMSPConfig): FabricMSPConfig.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FabricMSPConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FabricMSPConfig;
  static deserializeBinaryFromReader(message: FabricMSPConfig, reader: jspb.BinaryReader): FabricMSPConfig;
}

export namespace FabricMSPConfig {
  export type AsObject = {
    name: string,
    rootCertsList: Array<Uint8Array | string>,
    intermediateCertsList: Array<Uint8Array | string>,
    adminsList: Array<Uint8Array | string>,
    revocationListList: Array<Uint8Array | string>,
    signingIdentity?: SigningIdentityInfo.AsObject,
    organizationalUnitIdentifiersList: Array<FabricOUIdentifier.AsObject>,
    cryptoConfig?: FabricCryptoConfig.AsObject,
    tlsRootCertsList: Array<Uint8Array | string>,
    tlsIntermediateCertsList: Array<Uint8Array | string>,
    fabricNodeOus?: FabricNodeOUs.AsObject,
  }
}

export class FabricCryptoConfig extends jspb.Message {
  getSignatureHashFamily(): string;
  setSignatureHashFamily(value: string): void;

  getIdentityIdentifierHashFunction(): string;
  setIdentityIdentifierHashFunction(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FabricCryptoConfig.AsObject;
  static toObject(includeInstance: boolean, msg: FabricCryptoConfig): FabricCryptoConfig.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FabricCryptoConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FabricCryptoConfig;
  static deserializeBinaryFromReader(message: FabricCryptoConfig, reader: jspb.BinaryReader): FabricCryptoConfig;
}

export namespace FabricCryptoConfig {
  export type AsObject = {
    signatureHashFamily: string,
    identityIdentifierHashFunction: string,
  }
}

export class IdemixMSPConfig extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  getIpk(): Uint8Array | string;
  getIpk_asU8(): Uint8Array;
  getIpk_asB64(): string;
  setIpk(value: Uint8Array | string): void;

  hasSigner(): boolean;
  clearSigner(): void;
  getSigner(): IdemixMSPSignerConfig | undefined;
  setSigner(value?: IdemixMSPSignerConfig): void;

  getRevocationPk(): Uint8Array | string;
  getRevocationPk_asU8(): Uint8Array;
  getRevocationPk_asB64(): string;
  setRevocationPk(value: Uint8Array | string): void;

  getEpoch(): number;
  setEpoch(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): IdemixMSPConfig.AsObject;
  static toObject(includeInstance: boolean, msg: IdemixMSPConfig): IdemixMSPConfig.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: IdemixMSPConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): IdemixMSPConfig;
  static deserializeBinaryFromReader(message: IdemixMSPConfig, reader: jspb.BinaryReader): IdemixMSPConfig;
}

export namespace IdemixMSPConfig {
  export type AsObject = {
    name: string,
    ipk: Uint8Array | string,
    signer?: IdemixMSPSignerConfig.AsObject,
    revocationPk: Uint8Array | string,
    epoch: number,
  }
}

export class IdemixMSPSignerConfig extends jspb.Message {
  getCred(): Uint8Array | string;
  getCred_asU8(): Uint8Array;
  getCred_asB64(): string;
  setCred(value: Uint8Array | string): void;

  getSk(): Uint8Array | string;
  getSk_asU8(): Uint8Array;
  getSk_asB64(): string;
  setSk(value: Uint8Array | string): void;

  getOrganizationalUnitIdentifier(): string;
  setOrganizationalUnitIdentifier(value: string): void;

  getIsAdmin(): boolean;
  setIsAdmin(value: boolean): void;

  getEnrollmentId(): string;
  setEnrollmentId(value: string): void;

  getCredentialRevocationInformation(): Uint8Array | string;
  getCredentialRevocationInformation_asU8(): Uint8Array;
  getCredentialRevocationInformation_asB64(): string;
  setCredentialRevocationInformation(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): IdemixMSPSignerConfig.AsObject;
  static toObject(includeInstance: boolean, msg: IdemixMSPSignerConfig): IdemixMSPSignerConfig.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: IdemixMSPSignerConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): IdemixMSPSignerConfig;
  static deserializeBinaryFromReader(message: IdemixMSPSignerConfig, reader: jspb.BinaryReader): IdemixMSPSignerConfig;
}

export namespace IdemixMSPSignerConfig {
  export type AsObject = {
    cred: Uint8Array | string,
    sk: Uint8Array | string,
    organizationalUnitIdentifier: string,
    isAdmin: boolean,
    enrollmentId: string,
    credentialRevocationInformation: Uint8Array | string,
  }
}

export class SigningIdentityInfo extends jspb.Message {
  getPublicSigner(): Uint8Array | string;
  getPublicSigner_asU8(): Uint8Array;
  getPublicSigner_asB64(): string;
  setPublicSigner(value: Uint8Array | string): void;

  hasPrivateSigner(): boolean;
  clearPrivateSigner(): void;
  getPrivateSigner(): KeyInfo | undefined;
  setPrivateSigner(value?: KeyInfo): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SigningIdentityInfo.AsObject;
  static toObject(includeInstance: boolean, msg: SigningIdentityInfo): SigningIdentityInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SigningIdentityInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SigningIdentityInfo;
  static deserializeBinaryFromReader(message: SigningIdentityInfo, reader: jspb.BinaryReader): SigningIdentityInfo;
}

export namespace SigningIdentityInfo {
  export type AsObject = {
    publicSigner: Uint8Array | string,
    privateSigner?: KeyInfo.AsObject,
  }
}

export class KeyInfo extends jspb.Message {
  getKeyIdentifier(): string;
  setKeyIdentifier(value: string): void;

  getKeyMaterial(): Uint8Array | string;
  getKeyMaterial_asU8(): Uint8Array;
  getKeyMaterial_asB64(): string;
  setKeyMaterial(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): KeyInfo.AsObject;
  static toObject(includeInstance: boolean, msg: KeyInfo): KeyInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: KeyInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): KeyInfo;
  static deserializeBinaryFromReader(message: KeyInfo, reader: jspb.BinaryReader): KeyInfo;
}

export namespace KeyInfo {
  export type AsObject = {
    keyIdentifier: string,
    keyMaterial: Uint8Array | string,
  }
}

export class FabricOUIdentifier extends jspb.Message {
  getCertificate(): Uint8Array | string;
  getCertificate_asU8(): Uint8Array;
  getCertificate_asB64(): string;
  setCertificate(value: Uint8Array | string): void;

  getOrganizationalUnitIdentifier(): string;
  setOrganizationalUnitIdentifier(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FabricOUIdentifier.AsObject;
  static toObject(includeInstance: boolean, msg: FabricOUIdentifier): FabricOUIdentifier.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FabricOUIdentifier, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FabricOUIdentifier;
  static deserializeBinaryFromReader(message: FabricOUIdentifier, reader: jspb.BinaryReader): FabricOUIdentifier;
}

export namespace FabricOUIdentifier {
  export type AsObject = {
    certificate: Uint8Array | string,
    organizationalUnitIdentifier: string,
  }
}

export class FabricNodeOUs extends jspb.Message {
  getEnable(): boolean;
  setEnable(value: boolean): void;

  hasClientOuIdentifier(): boolean;
  clearClientOuIdentifier(): void;
  getClientOuIdentifier(): FabricOUIdentifier | undefined;
  setClientOuIdentifier(value?: FabricOUIdentifier): void;

  hasPeerOuIdentifier(): boolean;
  clearPeerOuIdentifier(): void;
  getPeerOuIdentifier(): FabricOUIdentifier | undefined;
  setPeerOuIdentifier(value?: FabricOUIdentifier): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FabricNodeOUs.AsObject;
  static toObject(includeInstance: boolean, msg: FabricNodeOUs): FabricNodeOUs.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FabricNodeOUs, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FabricNodeOUs;
  static deserializeBinaryFromReader(message: FabricNodeOUs, reader: jspb.BinaryReader): FabricNodeOUs;
}

export namespace FabricNodeOUs {
  export type AsObject = {
    enable: boolean,
    clientOuIdentifier?: FabricOUIdentifier.AsObject,
    peerOuIdentifier?: FabricOUIdentifier.AsObject,
  }
}

