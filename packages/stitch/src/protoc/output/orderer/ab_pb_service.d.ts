// package: orderer
// file: orderer/ab.proto

import * as orderer_ab_pb from "../orderer/ab_pb";
import * as common_common_pb from "../common/common_pb";
import {grpc} from "grpc-web-client";

type AtomicBroadcastBroadcast = {
  readonly methodName: string;
  readonly service: typeof AtomicBroadcast;
  readonly requestStream: true;
  readonly responseStream: true;
  readonly requestType: typeof common_common_pb.Envelope;
  readonly responseType: typeof orderer_ab_pb.BroadcastResponse;
};

type AtomicBroadcastDeliver = {
  readonly methodName: string;
  readonly service: typeof AtomicBroadcast;
  readonly requestStream: true;
  readonly responseStream: true;
  readonly requestType: typeof common_common_pb.Envelope;
  readonly responseType: typeof orderer_ab_pb.DeliverResponse;
};

export class AtomicBroadcast {
  static readonly serviceName: string;
  static readonly Broadcast: AtomicBroadcastBroadcast;
  static readonly Deliver: AtomicBroadcastDeliver;
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

export class AtomicBroadcastClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: ServiceClientOptions);
  broadcast(): void;
  deliver(): void;
}
