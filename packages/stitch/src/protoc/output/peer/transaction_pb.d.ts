// package: protos
// file: peer/transaction.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as peer_proposal_response_pb from "../peer/proposal_response_pb";
import * as common_common_pb from "../common/common_pb";

export class SignedTransaction extends jspb.Message {
  getTransactionBytes(): Uint8Array | string;
  getTransactionBytes_asU8(): Uint8Array;
  getTransactionBytes_asB64(): string;
  setTransactionBytes(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignedTransaction.AsObject;
  static toObject(includeInstance: boolean, msg: SignedTransaction): SignedTransaction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignedTransaction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignedTransaction;
  static deserializeBinaryFromReader(message: SignedTransaction, reader: jspb.BinaryReader): SignedTransaction;
}

export namespace SignedTransaction {
  export type AsObject = {
    transactionBytes: Uint8Array | string,
    signature: Uint8Array | string,
  }
}

export class ProcessedTransaction extends jspb.Message {
  hasTransactionenvelope(): boolean;
  clearTransactionenvelope(): void;
  getTransactionenvelope(): common_common_pb.Envelope | undefined;
  setTransactionenvelope(value?: common_common_pb.Envelope): void;

  getValidationcode(): number;
  setValidationcode(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProcessedTransaction.AsObject;
  static toObject(includeInstance: boolean, msg: ProcessedTransaction): ProcessedTransaction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ProcessedTransaction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProcessedTransaction;
  static deserializeBinaryFromReader(message: ProcessedTransaction, reader: jspb.BinaryReader): ProcessedTransaction;
}

export namespace ProcessedTransaction {
  export type AsObject = {
    transactionenvelope?: common_common_pb.Envelope.AsObject,
    validationcode: number,
  }
}

export class Transaction extends jspb.Message {
  clearActionsList(): void;
  getActionsList(): Array<TransactionAction>;
  setActionsList(value: Array<TransactionAction>): void;
  addActions(value?: TransactionAction, index?: number): TransactionAction;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Transaction.AsObject;
  static toObject(includeInstance: boolean, msg: Transaction): Transaction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Transaction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Transaction;
  static deserializeBinaryFromReader(message: Transaction, reader: jspb.BinaryReader): Transaction;
}

export namespace Transaction {
  export type AsObject = {
    actionsList: Array<TransactionAction.AsObject>,
  }
}

export class TransactionAction extends jspb.Message {
  getHeader(): Uint8Array | string;
  getHeader_asU8(): Uint8Array;
  getHeader_asB64(): string;
  setHeader(value: Uint8Array | string): void;

  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TransactionAction.AsObject;
  static toObject(includeInstance: boolean, msg: TransactionAction): TransactionAction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TransactionAction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TransactionAction;
  static deserializeBinaryFromReader(message: TransactionAction, reader: jspb.BinaryReader): TransactionAction;
}

export namespace TransactionAction {
  export type AsObject = {
    header: Uint8Array | string,
    payload: Uint8Array | string,
  }
}

export class ChaincodeActionPayload extends jspb.Message {
  getChaincodeProposalPayload(): Uint8Array | string;
  getChaincodeProposalPayload_asU8(): Uint8Array;
  getChaincodeProposalPayload_asB64(): string;
  setChaincodeProposalPayload(value: Uint8Array | string): void;

  hasAction(): boolean;
  clearAction(): void;
  getAction(): ChaincodeEndorsedAction | undefined;
  setAction(value?: ChaincodeEndorsedAction): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeActionPayload.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeActionPayload): ChaincodeActionPayload.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeActionPayload, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeActionPayload;
  static deserializeBinaryFromReader(message: ChaincodeActionPayload, reader: jspb.BinaryReader): ChaincodeActionPayload;
}

export namespace ChaincodeActionPayload {
  export type AsObject = {
    chaincodeProposalPayload: Uint8Array | string,
    action?: ChaincodeEndorsedAction.AsObject,
  }
}

export class ChaincodeEndorsedAction extends jspb.Message {
  getProposalResponsePayload(): Uint8Array | string;
  getProposalResponsePayload_asU8(): Uint8Array;
  getProposalResponsePayload_asB64(): string;
  setProposalResponsePayload(value: Uint8Array | string): void;

  clearEndorsementsList(): void;
  getEndorsementsList(): Array<peer_proposal_response_pb.Endorsement>;
  setEndorsementsList(value: Array<peer_proposal_response_pb.Endorsement>): void;
  addEndorsements(value?: peer_proposal_response_pb.Endorsement, index?: number): peer_proposal_response_pb.Endorsement;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeEndorsedAction.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeEndorsedAction): ChaincodeEndorsedAction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeEndorsedAction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeEndorsedAction;
  static deserializeBinaryFromReader(message: ChaincodeEndorsedAction, reader: jspb.BinaryReader): ChaincodeEndorsedAction;
}

export namespace ChaincodeEndorsedAction {
  export type AsObject = {
    proposalResponsePayload: Uint8Array | string,
    endorsementsList: Array<peer_proposal_response_pb.Endorsement.AsObject>,
  }
}

export enum TxValidationCode {
  VALID = 0,
  NIL_ENVELOPE = 1,
  BAD_PAYLOAD = 2,
  BAD_COMMON_HEADER = 3,
  BAD_CREATOR_SIGNATURE = 4,
  INVALID_ENDORSER_TRANSACTION = 5,
  INVALID_CONFIG_TRANSACTION = 6,
  UNSUPPORTED_TX_PAYLOAD = 7,
  BAD_PROPOSAL_TXID = 8,
  DUPLICATE_TXID = 9,
  ENDORSEMENT_POLICY_FAILURE = 10,
  MVCC_READ_CONFLICT = 11,
  PHANTOM_READ_CONFLICT = 12,
  UNKNOWN_TX_TYPE = 13,
  TARGET_CHAIN_NOT_FOUND = 14,
  MARSHAL_TX_ERROR = 15,
  NIL_TXACTION = 16,
  EXPIRED_CHAINCODE = 17,
  CHAINCODE_VERSION_CONFLICT = 18,
  BAD_HEADER_EXTENSION = 19,
  BAD_CHANNEL_HEADER = 20,
  BAD_RESPONSE_PAYLOAD = 21,
  BAD_RWSET = 22,
  ILLEGAL_WRITESET = 23,
  INVALID_WRITESET = 24,
  NOT_VALIDATED = 254,
  INVALID_OTHER_REASON = 255,
}

