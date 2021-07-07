// package: protos
// file: peer/peer.proto

import * as jspb from "google-protobuf";
import * as peer_proposal_pb from "../peer/proposal_pb";
import * as peer_proposal_response_pb from "../peer/proposal_response_pb";

export class PeerID extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PeerID.AsObject;
  static toObject(includeInstance: boolean, msg: PeerID): PeerID.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PeerID, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PeerID;
  static deserializeBinaryFromReader(message: PeerID, reader: jspb.BinaryReader): PeerID;
}

export namespace PeerID {
  export type AsObject = {
    name: string,
  }
}

export class PeerEndpoint extends jspb.Message {
  hasId(): boolean;
  clearId(): void;
  getId(): PeerID | undefined;
  setId(value?: PeerID): void;

  getAddress(): string;
  setAddress(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PeerEndpoint.AsObject;
  static toObject(includeInstance: boolean, msg: PeerEndpoint): PeerEndpoint.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PeerEndpoint, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PeerEndpoint;
  static deserializeBinaryFromReader(message: PeerEndpoint, reader: jspb.BinaryReader): PeerEndpoint;
}

export namespace PeerEndpoint {
  export type AsObject = {
    id?: PeerID.AsObject,
    address: string,
  }
}

