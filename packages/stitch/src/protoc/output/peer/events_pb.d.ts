// package: protos
// file: peer/events.proto

import * as jspb from "google-protobuf";
import * as common_common_pb from "../common/common_pb";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";
import * as peer_chaincode_event_pb from "../peer/chaincode_event_pb";
import * as peer_transaction_pb from "../peer/transaction_pb";

export class ChaincodeReg extends jspb.Message {
  getChaincodeId(): string;
  setChaincodeId(value: string): void;

  getEventName(): string;
  setEventName(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChaincodeReg.AsObject;
  static toObject(includeInstance: boolean, msg: ChaincodeReg): ChaincodeReg.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ChaincodeReg, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChaincodeReg;
  static deserializeBinaryFromReader(message: ChaincodeReg, reader: jspb.BinaryReader): ChaincodeReg;
}

export namespace ChaincodeReg {
  export type AsObject = {
    chaincodeId: string,
    eventName: string,
  }
}

export class Interest extends jspb.Message {
  getEventType(): EventType;
  setEventType(value: EventType): void;

  hasChaincodeRegInfo(): boolean;
  clearChaincodeRegInfo(): void;
  getChaincodeRegInfo(): ChaincodeReg | undefined;
  setChaincodeRegInfo(value?: ChaincodeReg): void;

  getChainid(): string;
  setChainid(value: string): void;

  getRegInfoCase(): Interest.RegInfoCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Interest.AsObject;
  static toObject(includeInstance: boolean, msg: Interest): Interest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Interest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Interest;
  static deserializeBinaryFromReader(message: Interest, reader: jspb.BinaryReader): Interest;
}

export namespace Interest {
  export type AsObject = {
    eventType: EventType,
    chaincodeRegInfo?: ChaincodeReg.AsObject,
    chainid: string,
  }

  export enum RegInfoCase {
    REGINFO_NOT_SET = 0,
    CHAINCODE_REG_INFO = 2,
  }
}

export class Register extends jspb.Message {
  clearEventsList(): void;
  getEventsList(): Array<Interest>;
  setEventsList(value: Array<Interest>): void;
  addEvents(value?: Interest, index?: number): Interest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Register.AsObject;
  static toObject(includeInstance: boolean, msg: Register): Register.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Register, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Register;
  static deserializeBinaryFromReader(message: Register, reader: jspb.BinaryReader): Register;
}

export namespace Register {
  export type AsObject = {
    eventsList: Array<Interest.AsObject>,
  }
}

export class Rejection extends jspb.Message {
  hasTx(): boolean;
  clearTx(): void;
  getTx(): peer_transaction_pb.Transaction | undefined;
  setTx(value?: peer_transaction_pb.Transaction): void;

  getErrorMsg(): string;
  setErrorMsg(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Rejection.AsObject;
  static toObject(includeInstance: boolean, msg: Rejection): Rejection.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Rejection, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Rejection;
  static deserializeBinaryFromReader(message: Rejection, reader: jspb.BinaryReader): Rejection;
}

export namespace Rejection {
  export type AsObject = {
    tx?: peer_transaction_pb.Transaction.AsObject,
    errorMsg: string,
  }
}

export class Unregister extends jspb.Message {
  clearEventsList(): void;
  getEventsList(): Array<Interest>;
  setEventsList(value: Array<Interest>): void;
  addEvents(value?: Interest, index?: number): Interest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Unregister.AsObject;
  static toObject(includeInstance: boolean, msg: Unregister): Unregister.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Unregister, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Unregister;
  static deserializeBinaryFromReader(message: Unregister, reader: jspb.BinaryReader): Unregister;
}

export namespace Unregister {
  export type AsObject = {
    eventsList: Array<Interest.AsObject>,
  }
}

export class FilteredBlock extends jspb.Message {
  getChannelId(): string;
  setChannelId(value: string): void;

  getNumber(): number;
  setNumber(value: number): void;

  clearFilteredTransactionsList(): void;
  getFilteredTransactionsList(): Array<FilteredTransaction>;
  setFilteredTransactionsList(value: Array<FilteredTransaction>): void;
  addFilteredTransactions(value?: FilteredTransaction, index?: number): FilteredTransaction;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FilteredBlock.AsObject;
  static toObject(includeInstance: boolean, msg: FilteredBlock): FilteredBlock.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FilteredBlock, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FilteredBlock;
  static deserializeBinaryFromReader(message: FilteredBlock, reader: jspb.BinaryReader): FilteredBlock;
}

export namespace FilteredBlock {
  export type AsObject = {
    channelId: string,
    number: number,
    filteredTransactionsList: Array<FilteredTransaction.AsObject>,
  }
}

export class FilteredTransaction extends jspb.Message {
  getTxid(): string;
  setTxid(value: string): void;

  getType(): common_common_pb.HeaderType;
  setType(value: common_common_pb.HeaderType): void;

  getTxValidationCode(): peer_transaction_pb.TxValidationCode;
  setTxValidationCode(value: peer_transaction_pb.TxValidationCode): void;

  hasTransactionActions(): boolean;
  clearTransactionActions(): void;
  getTransactionActions(): FilteredTransactionActions | undefined;
  setTransactionActions(value?: FilteredTransactionActions): void;

  getDataCase(): FilteredTransaction.DataCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FilteredTransaction.AsObject;
  static toObject(includeInstance: boolean, msg: FilteredTransaction): FilteredTransaction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FilteredTransaction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FilteredTransaction;
  static deserializeBinaryFromReader(message: FilteredTransaction, reader: jspb.BinaryReader): FilteredTransaction;
}

export namespace FilteredTransaction {
  export type AsObject = {
    txid: string,
    type: common_common_pb.HeaderType,
    txValidationCode: peer_transaction_pb.TxValidationCode,
    transactionActions?: FilteredTransactionActions.AsObject,
  }

  export enum DataCase {
    DATA_NOT_SET = 0,
    TRANSACTION_ACTIONS = 4,
  }
}

export class FilteredTransactionActions extends jspb.Message {
  clearChaincodeActionsList(): void;
  getChaincodeActionsList(): Array<FilteredChaincodeAction>;
  setChaincodeActionsList(value: Array<FilteredChaincodeAction>): void;
  addChaincodeActions(value?: FilteredChaincodeAction, index?: number): FilteredChaincodeAction;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FilteredTransactionActions.AsObject;
  static toObject(includeInstance: boolean, msg: FilteredTransactionActions): FilteredTransactionActions.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FilteredTransactionActions, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FilteredTransactionActions;
  static deserializeBinaryFromReader(message: FilteredTransactionActions, reader: jspb.BinaryReader): FilteredTransactionActions;
}

export namespace FilteredTransactionActions {
  export type AsObject = {
    chaincodeActionsList: Array<FilteredChaincodeAction.AsObject>,
  }
}

export class FilteredChaincodeAction extends jspb.Message {
  hasChaincodeEvent(): boolean;
  clearChaincodeEvent(): void;
  getChaincodeEvent(): peer_chaincode_event_pb.ChaincodeEvent | undefined;
  setChaincodeEvent(value?: peer_chaincode_event_pb.ChaincodeEvent): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FilteredChaincodeAction.AsObject;
  static toObject(includeInstance: boolean, msg: FilteredChaincodeAction): FilteredChaincodeAction.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: FilteredChaincodeAction, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FilteredChaincodeAction;
  static deserializeBinaryFromReader(message: FilteredChaincodeAction, reader: jspb.BinaryReader): FilteredChaincodeAction;
}

export namespace FilteredChaincodeAction {
  export type AsObject = {
    chaincodeEvent?: peer_chaincode_event_pb.ChaincodeEvent.AsObject,
  }
}

export class SignedEvent extends jspb.Message {
  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  getEventbytes(): Uint8Array | string;
  getEventbytes_asU8(): Uint8Array;
  getEventbytes_asB64(): string;
  setEventbytes(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignedEvent.AsObject;
  static toObject(includeInstance: boolean, msg: SignedEvent): SignedEvent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignedEvent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignedEvent;
  static deserializeBinaryFromReader(message: SignedEvent, reader: jspb.BinaryReader): SignedEvent;
}

export namespace SignedEvent {
  export type AsObject = {
    signature: Uint8Array | string,
    eventbytes: Uint8Array | string,
  }
}

export class Event extends jspb.Message {
  hasRegister(): boolean;
  clearRegister(): void;
  getRegister(): Register | undefined;
  setRegister(value?: Register): void;

  hasBlock(): boolean;
  clearBlock(): void;
  getBlock(): common_common_pb.Block | undefined;
  setBlock(value?: common_common_pb.Block): void;

  hasChaincodeEvent(): boolean;
  clearChaincodeEvent(): void;
  getChaincodeEvent(): peer_chaincode_event_pb.ChaincodeEvent | undefined;
  setChaincodeEvent(value?: peer_chaincode_event_pb.ChaincodeEvent): void;

  hasRejection(): boolean;
  clearRejection(): void;
  getRejection(): Rejection | undefined;
  setRejection(value?: Rejection): void;

  hasUnregister(): boolean;
  clearUnregister(): void;
  getUnregister(): Unregister | undefined;
  setUnregister(value?: Unregister): void;

  hasFilteredBlock(): boolean;
  clearFilteredBlock(): void;
  getFilteredBlock(): FilteredBlock | undefined;
  setFilteredBlock(value?: FilteredBlock): void;

  getCreator(): Uint8Array | string;
  getCreator_asU8(): Uint8Array;
  getCreator_asB64(): string;
  setCreator(value: Uint8Array | string): void;

  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getTlsCertHash(): Uint8Array | string;
  getTlsCertHash_asU8(): Uint8Array;
  getTlsCertHash_asB64(): string;
  setTlsCertHash(value: Uint8Array | string): void;

  getEventCase(): Event.EventCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Event.AsObject;
  static toObject(includeInstance: boolean, msg: Event): Event.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Event, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Event;
  static deserializeBinaryFromReader(message: Event, reader: jspb.BinaryReader): Event;
}

export namespace Event {
  export type AsObject = {
    register?: Register.AsObject,
    block?: common_common_pb.Block.AsObject,
    chaincodeEvent?: peer_chaincode_event_pb.ChaincodeEvent.AsObject,
    rejection?: Rejection.AsObject,
    unregister?: Unregister.AsObject,
    filteredBlock?: FilteredBlock.AsObject,
    creator: Uint8Array | string,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    tlsCertHash: Uint8Array | string,
  }

  export enum EventCase {
    EVENT_NOT_SET = 0,
    REGISTER = 1,
    BLOCK = 2,
    CHAINCODE_EVENT = 3,
    REJECTION = 4,
    UNREGISTER = 5,
    FILTERED_BLOCK = 7,
  }
}

export class DeliverResponse extends jspb.Message {
  hasStatus(): boolean;
  clearStatus(): void;
  getStatus(): common_common_pb.Status;
  setStatus(value: common_common_pb.Status): void;

  hasBlock(): boolean;
  clearBlock(): void;
  getBlock(): common_common_pb.Block | undefined;
  setBlock(value?: common_common_pb.Block): void;

  hasFilteredBlock(): boolean;
  clearFilteredBlock(): void;
  getFilteredBlock(): FilteredBlock | undefined;
  setFilteredBlock(value?: FilteredBlock): void;

  getTypeCase(): DeliverResponse.TypeCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeliverResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeliverResponse): DeliverResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: DeliverResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeliverResponse;
  static deserializeBinaryFromReader(message: DeliverResponse, reader: jspb.BinaryReader): DeliverResponse;
}

export namespace DeliverResponse {
  export type AsObject = {
    status: common_common_pb.Status,
    block?: common_common_pb.Block.AsObject,
    filteredBlock?: FilteredBlock.AsObject,
  }

  export enum TypeCase {
    TYPE_NOT_SET = 0,
    STATUS = 1,
    BLOCK = 2,
    FILTERED_BLOCK = 3,
  }
}

export enum EventType {
  REGISTER = 0,
  BLOCK = 1,
  CHAINCODE = 2,
  REJECTION = 3,
  FILTEREDBLOCK = 4,
}

