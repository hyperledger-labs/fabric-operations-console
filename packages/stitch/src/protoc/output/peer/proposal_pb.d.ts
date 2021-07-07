// package: protos
// file: peer/proposal.proto

import * as jspb from "google-protobuf";
import * as peer_chaincode_pb from "../peer/chaincode_pb";
import * as peer_proposal_response_pb from "../peer/proposal_response_pb";

export class SignedProposal extends jspb.Message {
  getProposalBytes(): Uint8Array | string;
  getProposalBytes_asU8(): Uint8Array;
  getProposalBytes_asB64(): string;
  setProposalBytes(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignedProposal.AsObject;
  static toObject(includeInstance: boolean, msg: SignedProposal): SignedProposal.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignedProposal, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignedProposal;
  static deserializeBinaryFromReader(message: SignedProposal, reader: jspb.BinaryReader): SignedProposal;
}

export namespace SignedProposal {
  export type AsObject = {
    proposalBytes: Uint8Array | string,
    signature: Uint8Array | string,
  }
}

export class Proposal extends jspb.Message {
  getHeader(): Uint8Array | string;
  getHeader_asU8(): Uint8Array;
  getHeader_asB64(): string;
  setHeader(value: Uint8Array | string): void;

  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  getFabricExtension(): Uint8Array | string;
  getFabricExtension_asU8(): Uint8Array;
  getFabricExtension_asB64(): string;
  setFabricExtension(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Proposal.AsObject;
  static toObject(includeInstance: boolean, msg: Proposal): Proposal.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Proposal, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Proposal;
  static deserializeBinaryFromReader(message: Proposal, reader: jspb.BinaryReader): Proposal;
}

export namespace Proposal {
  export type AsObject = {
    header: Uint8Array | string,
    payload: Uint8Array | string,
    fabricExtension: Uint8Array | string,
  }
}

export class ChaincodeHeaderExtension extends jspb.Message {
  getPayloadVisibility(): Uint8Array | string;
  getPayloadVisibility_asU8(): Uint8Array;
  getPayloadVisibility_asB64(): string;
  setPayloadVisibility(value: Uint8Array | string): void;

  hasChaincodeId(): boolean;
  clearChaincodeId(): void;
  getChaincodeId(): peer_chaincode_pb.ChaincodeID | undefined;
  setChaincodeId(value?: peer_chaincode_pb.ChaincodeID): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeHeaderExtension.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeHeaderExtension): ChaincodeHeaderExtension.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeHeaderExtension, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeHeaderExtension;
  static deserializeBinaryFromReader(message: ChaincodeHeaderExtension, reader: jspb.BinaryReader): ChaincodeHeaderExtension;
}

export namespace ChaincodeHeaderExtension {
  export type AsObject = {
    payloadVisibility: Uint8Array | string,
    chaincodeId?: peer_chaincode_pb.ChaincodeID.AsObject,
  }
}

export class ChaincodeProposalPayload extends jspb.Message {
  getInput(): Uint8Array | string;
  getInput_asU8(): Uint8Array;
  getInput_asB64(): string;
  setInput(value: Uint8Array | string): void;

  getTransientmapMap(): jspb.Map<string, Uint8Array | string>;
  clearTransientmapMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeProposalPayload.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeProposalPayload): ChaincodeProposalPayload.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeProposalPayload, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeProposalPayload;
  static deserializeBinaryFromReader(message: ChaincodeProposalPayload, reader: jspb.BinaryReader): ChaincodeProposalPayload;
}

export namespace ChaincodeProposalPayload {
  export type AsObject = {
    input: Uint8Array | string,
    transientmapMap: Array<[string, Uint8Array | string]>,
  }
}

export class ChaincodeAction extends jspb.Message {
  getResults(): Uint8Array | string;
  getResults_asU8(): Uint8Array;
  getResults_asB64(): string;
  setResults(value: Uint8Array | string): void;

  getEvents(): Uint8Array | string;
  getEvents_asU8(): Uint8Array;
  getEvents_asB64(): string;
  setEvents(value: Uint8Array | string): void;

  hasResponse(): boolean;
  clearResponse(): void;
  getResponse(): peer_proposal_response_pb.Response | undefined;
  setResponse(value?: peer_proposal_response_pb.Response): void;

  hasChaincodeId(): boolean;
  clearChaincodeId(): void;
  getChaincodeId(): peer_chaincode_pb.ChaincodeID | undefined;
  setChaincodeId(value?: peer_chaincode_pb.ChaincodeID): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeAction.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeAction): ChaincodeAction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeAction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeAction;
  static deserializeBinaryFromReader(message: ChaincodeAction, reader: jspb.BinaryReader): ChaincodeAction;
}

export namespace ChaincodeAction {
  export type AsObject = {
    results: Uint8Array | string,
    events: Uint8Array | string,
    response?: peer_proposal_response_pb.Response.AsObject,
    chaincodeId?: peer_chaincode_pb.ChaincodeID.AsObject,
  }
}
