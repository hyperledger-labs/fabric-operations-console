// package: orderer
// file: orderer/ab.proto

var orderer_ab_pb = require("../orderer/ab_pb");
var common_common_pb = require("../common/common_pb");

var AtomicBroadcast = (function () {
  function AtomicBroadcast() {}
  AtomicBroadcast.serviceName = "orderer.AtomicBroadcast";
  return AtomicBroadcast;
}());

AtomicBroadcast.Broadcast = {
  methodName: "Broadcast",
  service: AtomicBroadcast,
  requestStream: true,
  responseStream: true,
  requestType: common_common_pb.Envelope,
  responseType: orderer_ab_pb.BroadcastResponse
};

AtomicBroadcast.Deliver = {
  methodName: "Deliver",
  service: AtomicBroadcast,
  requestStream: true,
  responseStream: true,
  requestType: common_common_pb.Envelope,
  responseType: orderer_ab_pb.DeliverResponse
};

exports.AtomicBroadcast = AtomicBroadcast;

function AtomicBroadcastClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

AtomicBroadcast.prototype.broadcast = function broadcast() {
  throw new Error("Client streaming is not currently supported");
}

AtomicBroadcast.prototype.deliver = function deliver() {
  throw new Error("Client streaming is not currently supported");
}

exports.AtomicBroadcastClient = AtomicBroadcastClient;
