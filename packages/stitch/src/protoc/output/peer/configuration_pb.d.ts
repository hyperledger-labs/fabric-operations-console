// package: protos
// file: peer/configuration.proto

import * as jspb from "google-protobuf";

export class AnchorPeers extends jspb.Message {
  clearAnchorPeersList(): void;
  getAnchorPeersList(): Array<AnchorPeer>;
  setAnchorPeersList(value: Array<AnchorPeer>): void;
  addAnchorPeers(value?: AnchorPeer, index?: number): AnchorPeer;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AnchorPeers.AsObject;
  static toObject(includeInstance: boolean, msg: AnchorPeers): AnchorPeers.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AnchorPeers, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AnchorPeers;
  static deserializeBinaryFromReader(message: AnchorPeers, reader: jspb.BinaryReader): AnchorPeers;
}

export namespace AnchorPeers {
  export type AsObject = {
    anchorPeersList: Array<AnchorPeer.AsObject>,
  }
}

export class AnchorPeer extends jspb.Message {
  getHost(): string;
  setHost(value: string): void;

  getPort(): number;
  setPort(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AnchorPeer.AsObject;
  static toObject(includeInstance: boolean, msg: AnchorPeer): AnchorPeer.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AnchorPeer, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AnchorPeer;
  static deserializeBinaryFromReader(message: AnchorPeer, reader: jspb.BinaryReader): AnchorPeer;
}

export namespace AnchorPeer {
  export type AsObject = {
    host: string,
    port: number,
  }
}

export class APIResource extends jspb.Message {
  getPolicyRef(): string;
  setPolicyRef(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): APIResource.AsObject;
  static toObject(includeInstance: boolean, msg: APIResource): APIResource.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: APIResource, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): APIResource;
  static deserializeBinaryFromReader(message: APIResource, reader: jspb.BinaryReader): APIResource;
}

export namespace APIResource {
  export type AsObject = {
    policyRef: string,
  }
}

export class ACLs extends jspb.Message {
  getAclsMap(): jspb.Map<string, APIResource>;
  clearAclsMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ACLs.AsObject;
  static toObject(includeInstance: boolean, msg: ACLs): ACLs.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ACLs, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ACLs;
  static deserializeBinaryFromReader(message: ACLs, reader: jspb.BinaryReader): ACLs;
}

export namespace ACLs {
  export type AsObject = {
    aclsMap: Array<[string, APIResource.AsObject]>,
  }
}

