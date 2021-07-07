// package: protos
// file: peer/events.proto

import * as peer_events_pb from "../peer/events_pb";
import * as common_common_pb from "../common/common_pb";
import {grpc} from "grpc-web-client";

type EventsChat = {
  readonly methodName: string;
  readonly service: typeof Events;
  readonly requestStream: true;
  readonly responseStream: true;
  readonly requestType: typeof peer_events_pb.SignedEvent;
  readonly responseType: typeof peer_events_pb.Event;
};

export class Events {
  static readonly serviceName: string;
  static readonly Chat: EventsChat;
}

type DeliverDeliver = {
  readonly methodName: string;
  readonly service: typeof Deliver;
  readonly requestStream: true;
  readonly responseStream: true;
  readonly requestType: typeof common_common_pb.Envelope;
  readonly responseType: typeof peer_events_pb.DeliverResponse;
};

type DeliverDeliverFiltered = {
  readonly methodName: string;
  readonly service: typeof Deliver;
  readonly requestStream: true;
  readonly responseStream: true;
  readonly requestType: typeof common_common_pb.Envelope;
  readonly responseType: typeof peer_events_pb.DeliverResponse;
};

export class Deliver {
  static readonly serviceName: string;
  static readonly Deliver: DeliverDeliver;
  static readonly DeliverFiltered: DeliverDeliverFiltered;
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

export class EventsClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: ServiceClientOptions);
  chat(): void;
}

export class DeliverClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: ServiceClientOptions);
  deliver(): void;
  deliverFiltered(): void;
}

