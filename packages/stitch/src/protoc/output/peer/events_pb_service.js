// package: protos
// file: peer/events.proto

var peer_events_pb = require("../peer/events_pb");
var common_common_pb = require("../common/common_pb");

var Events = (function () {
  function Events() {}
  Events.serviceName = "protos.Events";
  return Events;
}());

Events.Chat = {
  methodName: "Chat",
  service: Events,
  requestStream: true,
  responseStream: true,
  requestType: peer_events_pb.SignedEvent,
  responseType: peer_events_pb.Event
};

exports.Events = Events;

function EventsClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

Events.prototype.chat = function chat() {
  throw new Error("Client streaming is not currently supported");
}

exports.EventsClient = EventsClient;

var Deliver = (function () {
  function Deliver() {}
  Deliver.serviceName = "protos.Deliver";
  return Deliver;
}());

Deliver.Deliver = {
  methodName: "Deliver",
  service: Deliver,
  requestStream: true,
  responseStream: true,
  requestType: common_common_pb.Envelope,
  responseType: peer_events_pb.DeliverResponse
};

Deliver.DeliverFiltered = {
  methodName: "DeliverFiltered",
  service: Deliver,
  requestStream: true,
  responseStream: true,
  requestType: common_common_pb.Envelope,
  responseType: peer_events_pb.DeliverResponse
};

exports.Deliver = Deliver;

function DeliverClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

Deliver.prototype.deliver = function deliver() {
  throw new Error("Client streaming is not currently supported");
}

Deliver.prototype.deliverFiltered = function deliverFiltered() {
  throw new Error("Client streaming is not currently supported");
}

exports.DeliverClient = DeliverClient;
