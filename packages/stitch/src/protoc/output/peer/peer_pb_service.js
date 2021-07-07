// package: protos
// file: peer/peer.proto

var peer_peer_pb = require("../peer/peer_pb");
var peer_proposal_pb = require("../peer/proposal_pb");
var peer_proposal_response_pb = require("../peer/proposal_response_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var Endorser = (function () {
  function Endorser() {}
  Endorser.serviceName = "protos.Endorser";
  return Endorser;
}());

Endorser.ProcessProposal = {
  methodName: "ProcessProposal",
  service: Endorser,
  requestStream: false,
  responseStream: false,
  requestType: peer_proposal_pb.SignedProposal,
  responseType: peer_proposal_response_pb.ProposalResponse
};

exports.Endorser = Endorser;

function EndorserClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

EndorserClient.prototype.processProposal = function processProposal(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  grpc.unary(Endorser.ProcessProposal, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          callback(Object.assign(new Error(response.statusMessage), { code: response.status, metadata: response.trailers }), null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
};

exports.EndorserClient = EndorserClient;
