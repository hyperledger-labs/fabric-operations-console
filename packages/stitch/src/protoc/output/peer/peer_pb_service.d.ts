// package: protos
// file: peer/peer.proto

import * as peer_peer_pb from "../peer/peer_pb";
import * as peer_proposal_pb from "../peer/proposal_pb";
import * as peer_proposal_response_pb from "../peer/proposal_response_pb";
import {grpc} from "grpc-web-client";

type EndorserProcessProposal = {
  readonly methodName: string;
  readonly service: typeof Endorser;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof peer_proposal_pb.SignedProposal;
  readonly responseType: typeof peer_proposal_response_pb.ProposalResponse;
};

export class Endorser {
  static readonly serviceName: string;
  static readonly ProcessProposal: EndorserProcessProposal;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }
export type ServiceClientOptions = { transport: grpc.TransportConstructor }

interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: () => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}

export class EndorserClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: ServiceClientOptions);
  processProposal(
    requestMessage: peer_proposal_pb.SignedProposal,
    metadata: grpc.Metadata,
    callback: (error: ServiceError, responseMessage: peer_proposal_response_pb.ProposalResponse|null) => void
  ): void;
  processProposal(
    requestMessage: peer_proposal_pb.SignedProposal,
    callback: (error: ServiceError, responseMessage: peer_proposal_response_pb.ProposalResponse|null) => void
  ): void;
}

