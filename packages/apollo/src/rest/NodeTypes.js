/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

/**
 * A component record.  These fields are common to all components.
 * @typedef {object} Component
 * @param {string} display_name A descriptive name for the component.
 * @param {string} id The unique identifier of this component.
 * @param {string[]} tags User defined strings that can be used to search/filter components.*
 * @param {number} timestamp UTC unix timestamp of component onboarding to the UI. In milliseconds.
 * @param {('fabric-peer'|'fabric-orderer'|'fabric-ca'|'msp')} type The component type.  Different types have different required params.
 */

/**
 * An MSP record.
 * @typedef {object} Msp
 * @extends Component
 * @param {string} admins
 * @param {string} fabric_node_ous
 * @param {string} host_url
 * @param {string} intermediate_certs
 * @param {string} msp_id
 * @param {string} organizational_unit_identifiers
 * @param {string} revocation_list
 * @param {string} root_certs
 * @param {string} tls_intermediate_certs
 * @param {string} tls_root_certs
 */

/**
 * A node record.  These fields are common to all nodes (ca, orderer, and peer)
 * @typedef {object} Node
 * @extends Component
 * @param {string} api_url
 * @param {string} grpcwp_url
 * @param {string} operations_url
 * @param {string} url2use
 */

/**
 * A node with GRPC proxy record.  These fields are common to proxied nodes (orderer, and peer)
 * @typedef {object} NodeWithProxy
 * @extends Node
 * @param {string} grpcwp_url
 */

/**
 * A fabric node (provisioned by this service instance) record.
 * @typedef {object} FabricNode
 * @extends Node
 * @param {object} config_override
 * @param {string} dep_component_id The unique id for the component in Kubernetes. Not present if component was imported or does not involve a
 * @param {object} resources
 * @param {object} storage
 * @param {string} tls_ca_root_cert The TLS certificate as base 64 encoded PEM.
 * @param {string} [pem] Legacy alias of tls_ca_root_cert.
 * @param {string} version
 * @param {string} zone
 */

/**
 * A certificate authority record.
 * @typedef {object} CA
 * @extends Node
 * @param {object} ca
 * @param {object} tlsca
 * @param {object} component
 */

/**
 * A fabric certificate authority (provisioned by this service instance) record.
 * @typedef {object} FabricCA
 * @extends CA
 * @extends FabricNode
 */

/**
 * A component record.  The fields in the record vary based on the component type and whether the component is an imported component or a created component.
 * @typedef {object} Orderer
 * @extends NodeWithProxy
 * @param {string} cluster_id
 * @param {string} cluster_name
 * @param {string} tls_cert The TLS communication cert.
 * @param {string} server_tls_cert Should always be the same as tls_cert.
 * @param {string} client_tls_cert When the orderer is the client in a TLS connection, this is the cert it will use.
 * @param {string} system_channel_id The ID for the orderer's system channel.
 */

/**
 * A component record.  The fields in the record vary based on the component type and whether the component is an imported component or a created component.
 * @typedef {object} FabricOrderer
 * @extends Orderer
 * @extends FabricNode
 * @param {boolean} consenter_proposal_fin
 */

/**
 * A component record.  The fields in the record vary based on the component type and whether the component is an imported component or a created component.
 * @typedef {object} Peer
 * @extends NodeWithProxy
 */

/**
 * A component record.  The fields in the record vary based on the component type and whether the component is an imported component or a created component.
 * @typedef {object} FabricPeer
 * @extends Peer
 * @extends FabricNode
 */

/**
 * The server response when successfully deleting a component.
 * @typedef {object} DeleteComponentResponse
 * @param {string} message A description of what happened.  Generally "deleted".
 * @param {string} id The ID of the component that was deleted from the UIs records.
 * @param {string} display_name The display name of the deleted component.
 * @param {string} type The deleted component's component type.
 */

/**
 * The status of a node
 * @typedef {object} NodeStatus
 * @param {string} status A description of the node status
 */
