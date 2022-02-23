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

// Libs built by us
import { logger } from "./misc";

export { buildTemplateConfigBlock };

// --------------------------------------------------------------------------------
// notes to self:
// There are two types of policies.
//  - Type 1 - SignaturePolicy - there must n signatures out of all defined identities to pass this policy
//  - Type 2 - ImplicitMetaPolicy - has 3 sub types: (these types are defined by pb "ImplicitMetaPolicy")
//    - Rule 0 means ANY signature will pas
//    - Rule 1 means ALL signatures needed to pass
//    - Rule 2 means MAJORITY of signatures need to pass

// the field "policies" defines multiple policies
// the field "mod_policy" will point to one of the entires defined in "policies" (the closest policies key)
// and its that policy must be met to change the data in "value"
// --------------------------------------------------------------------------------

// DEFAULT GENESIS BLOCK (aka config block, aka "Block" binary) for a new channel.
// This is for use with the osnadmin features
const template = {
	"data": {
		"data": [
			{
				"payload": {
					"data": {
						"config": {
							"channel_group": {
								"groups": {
									"Application": {
										"groups": {

											// this is the template for MSP's at the Application.group level.
											// each MSP passed will use the policies set below, thus this is the *default* MSP section for new channels.
											// (of course the "msp_identifier" will be edited to match it's msp id)
											"Org1MSP": {
												"groups": {},
												"mod_policy": "Admins",

												"policies": {
													"Admins": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Endorsement": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "PEER"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Readers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	},
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "PEER"
																		},
																		"principal_classification": "ROLE"
																	},
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "CLIENT"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			},
																			{
																				"signed_by": 1
																			},
																			{
																				"signed_by": 2
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Writers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	},
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "CLIENT"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			},
																			{
																				"signed_by": 1
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													}
												}, // end of "policies" key

												"values": {		// we are still in the "Org1MSP" key
													"MSP": {
														"mod_policy": "Admins",
														"value": {
															"config": {
																"admins": [],
																"crypto_config": {
																	"identity_identifier_hash_function": "SHA256",
																	"signature_hash_family": "SHA2"
																},
																"fabric_node_ous": null,
																"intermediate_certs": [],

																// replace below with org's MSP id
																"name": "Org1MSP",

																"organizational_unit_identifiers": [],
																"revocation_list": [],
																"root_certs": [],
																"signing_identity": null,
																"tls_intermediate_certs": [],
																"tls_root_certs": []
															},
															"type": 0
														},
														"version": "0"
													}
												},
												"version": "0"
											}, // end of "Org1MSP" key
										}, // end of "groups" key


										"mod_policy": "Admins",

										// replace this - dsh todo
										"policies": {
											"Admins": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Admins"
													}
												},
												"version": "0"
											},
											"Endorsement": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Endorsement"
													}
												},
												"version": "0"
											},
											"LifecycleEndorsement": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Endorsement"
													}
												},
												"version": "0"
											},
											"Readers": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Readers"
													}
												},
												"version": "0"
											},
											"Writers": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Writers"
													}
												},
												"version": "0"
											}
										},
										"values": {
											"Capabilities": {
												"mod_policy": "Admins",
												"value": {
													"capabilities": {

														// application capabilities
														"V2_0": {}
													}
												},
												"version": "0"
											}
										},
										"version": "0"
									},
									"Orderer": {
										"groups": {
											"OrdererOrg": {
												"groups": {},
												"mod_policy": "Admins",

												// replace this - dsh todo
												"policies": {
													"Admins": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {
																			"msp_identifier": "OrdererMSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Readers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {
																			"msp_identifier": "OrdererMSP",
																			"role": "MEMBER"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Writers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {
																			"msp_identifier": "OrdererMSP",
																			"role": "MEMBER"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													}
												},
												"values": {
													"Endpoints": {
														"mod_policy": "Admins",
														"value": {
															"addresses": [
																"orderer.example.com:7050"
															]
														},
														"version": "0"
													},
													"MSP": {
														"mod_policy": "Admins",
														"value": {
															"config": {
																"admins": [],
																"crypto_config": {
																	"identity_identifier_hash_function": "SHA256",
																	"signature_hash_family": "SHA2"
																},

																// replace this - dsh todo
																"fabric_node_ous": {
																	"admin_ou_identifier": {
																		"certificate": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDakNDQWJHZ0F3SUJBZ0lVWUVrU0orS3pQeC9NbkorVEROVTMyRGtoM2dZd0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVE0zTURJeE1qRTVNek13TUZvd1lqRUxNQWtHQTFVRUJoTUMKVlZNeEVUQVBCZ05WQkFnVENFNWxkeUJaYjNKck1SRXdEd1lEVlFRSEV3aE9aWGNnV1c5eWF6RVVNQklHQTFVRQpDaE1MWlhoaGJYQnNaUzVqYjIweEZ6QVZCZ05WQkFNVERtTmhMbVY0WVcxd2JHVXVZMjl0TUZrd0V3WUhLb1pJCnpqMENBUVlJS29aSXpqMERBUWNEUWdBRXpidC9ZQXp1YlZqYlRscWtTVFVzdGpxTVJqZ3QxUnJBSmxTR2xHNUcKOTRCc08wU0ZISWlIQkRKMk9YZ09VVFd1cDhVNkIxQU96bWNuS1MzVW9qODZwNk5GTUVNd0RnWURWUjBQQVFILwpCQVFEQWdFR01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRRXdIUVlEVlIwT0JCWUVGRVpDdVNjaytranZXVTEzCkswQlYzMS9KN05XUE1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lHQmxwQmRYSzNWOENGREU1c2kvMHRjTXp0V1QKdWRva2k4NGhjMS83WlVHVEFpQWtXUW1IZGphaFk5QmRUNkFySHYyaFZKY1NaM0diWFcyUUFvTzRsaTdhZmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==",
																		"organizational_unit_identifier": "admin"
																	},
																	"client_ou_identifier": {
																		"certificate": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDakNDQWJHZ0F3SUJBZ0lVWUVrU0orS3pQeC9NbkorVEROVTMyRGtoM2dZd0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVE0zTURJeE1qRTVNek13TUZvd1lqRUxNQWtHQTFVRUJoTUMKVlZNeEVUQVBCZ05WQkFnVENFNWxkeUJaYjNKck1SRXdEd1lEVlFRSEV3aE9aWGNnV1c5eWF6RVVNQklHQTFVRQpDaE1MWlhoaGJYQnNaUzVqYjIweEZ6QVZCZ05WQkFNVERtTmhMbVY0WVcxd2JHVXVZMjl0TUZrd0V3WUhLb1pJCnpqMENBUVlJS29aSXpqMERBUWNEUWdBRXpidC9ZQXp1YlZqYlRscWtTVFVzdGpxTVJqZ3QxUnJBSmxTR2xHNUcKOTRCc08wU0ZISWlIQkRKMk9YZ09VVFd1cDhVNkIxQU96bWNuS1MzVW9qODZwNk5GTUVNd0RnWURWUjBQQVFILwpCQVFEQWdFR01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRRXdIUVlEVlIwT0JCWUVGRVpDdVNjaytranZXVTEzCkswQlYzMS9KN05XUE1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lHQmxwQmRYSzNWOENGREU1c2kvMHRjTXp0V1QKdWRva2k4NGhjMS83WlVHVEFpQWtXUW1IZGphaFk5QmRUNkFySHYyaFZKY1NaM0diWFcyUUFvTzRsaTdhZmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==",
																		"organizational_unit_identifier": "client"
																	},
																	"enable": true,
																	"orderer_ou_identifier": {
																		"certificate": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDakNDQWJHZ0F3SUJBZ0lVWUVrU0orS3pQeC9NbkorVEROVTMyRGtoM2dZd0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVE0zTURJeE1qRTVNek13TUZvd1lqRUxNQWtHQTFVRUJoTUMKVlZNeEVUQVBCZ05WQkFnVENFNWxkeUJaYjNKck1SRXdEd1lEVlFRSEV3aE9aWGNnV1c5eWF6RVVNQklHQTFVRQpDaE1MWlhoaGJYQnNaUzVqYjIweEZ6QVZCZ05WQkFNVERtTmhMbVY0WVcxd2JHVXVZMjl0TUZrd0V3WUhLb1pJCnpqMENBUVlJS29aSXpqMERBUWNEUWdBRXpidC9ZQXp1YlZqYlRscWtTVFVzdGpxTVJqZ3QxUnJBSmxTR2xHNUcKOTRCc08wU0ZISWlIQkRKMk9YZ09VVFd1cDhVNkIxQU96bWNuS1MzVW9qODZwNk5GTUVNd0RnWURWUjBQQVFILwpCQVFEQWdFR01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRRXdIUVlEVlIwT0JCWUVGRVpDdVNjaytranZXVTEzCkswQlYzMS9KN05XUE1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lHQmxwQmRYSzNWOENGREU1c2kvMHRjTXp0V1QKdWRva2k4NGhjMS83WlVHVEFpQWtXUW1IZGphaFk5QmRUNkFySHYyaFZKY1NaM0diWFcyUUFvTzRsaTdhZmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==",
																		"organizational_unit_identifier": "orderer"
																	},
																	"peer_ou_identifier": {
																		"certificate": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDakNDQWJHZ0F3SUJBZ0lVWUVrU0orS3pQeC9NbkorVEROVTMyRGtoM2dZd0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVE0zTURJeE1qRTVNek13TUZvd1lqRUxNQWtHQTFVRUJoTUMKVlZNeEVUQVBCZ05WQkFnVENFNWxkeUJaYjNKck1SRXdEd1lEVlFRSEV3aE9aWGNnV1c5eWF6RVVNQklHQTFVRQpDaE1MWlhoaGJYQnNaUzVqYjIweEZ6QVZCZ05WQkFNVERtTmhMbVY0WVcxd2JHVXVZMjl0TUZrd0V3WUhLb1pJCnpqMENBUVlJS29aSXpqMERBUWNEUWdBRXpidC9ZQXp1YlZqYlRscWtTVFVzdGpxTVJqZ3QxUnJBSmxTR2xHNUcKOTRCc08wU0ZISWlIQkRKMk9YZ09VVFd1cDhVNkIxQU96bWNuS1MzVW9qODZwNk5GTUVNd0RnWURWUjBQQVFILwpCQVFEQWdFR01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRRXdIUVlEVlIwT0JCWUVGRVpDdVNjaytranZXVTEzCkswQlYzMS9KN05XUE1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lHQmxwQmRYSzNWOENGREU1c2kvMHRjTXp0V1QKdWRva2k4NGhjMS83WlVHVEFpQWtXUW1IZGphaFk5QmRUNkFySHYyaFZKY1NaM0diWFcyUUFvTzRsaTdhZmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==",
																		"organizational_unit_identifier": "peer"
																	}
																},
																"intermediate_certs": [],
																"name": "OrdererMSP",
																"organizational_unit_identifiers": [],
																"revocation_list": [],
																"root_certs": [
																	"LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDakNDQWJHZ0F3SUJBZ0lVWUVrU0orS3pQeC9NbkorVEROVTMyRGtoM2dZd0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVE0zTURJeE1qRTVNek13TUZvd1lqRUxNQWtHQTFVRUJoTUMKVlZNeEVUQVBCZ05WQkFnVENFNWxkeUJaYjNKck1SRXdEd1lEVlFRSEV3aE9aWGNnV1c5eWF6RVVNQklHQTFVRQpDaE1MWlhoaGJYQnNaUzVqYjIweEZ6QVZCZ05WQkFNVERtTmhMbVY0WVcxd2JHVXVZMjl0TUZrd0V3WUhLb1pJCnpqMENBUVlJS29aSXpqMERBUWNEUWdBRXpidC9ZQXp1YlZqYlRscWtTVFVzdGpxTVJqZ3QxUnJBSmxTR2xHNUcKOTRCc08wU0ZISWlIQkRKMk9YZ09VVFd1cDhVNkIxQU96bWNuS1MzVW9qODZwNk5GTUVNd0RnWURWUjBQQVFILwpCQVFEQWdFR01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRRXdIUVlEVlIwT0JCWUVGRVpDdVNjaytranZXVTEzCkswQlYzMS9KN05XUE1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lHQmxwQmRYSzNWOENGREU1c2kvMHRjTXp0V1QKdWRva2k4NGhjMS83WlVHVEFpQWtXUW1IZGphaFk5QmRUNkFySHYyaFZKY1NaM0diWFcyUUFvTzRsaTdhZmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=="
																],
																"signing_identity": null,
																"tls_intermediate_certs": [],
																"tls_root_certs": [
																	"LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDakNDQWJHZ0F3SUJBZ0lVWUVrU0orS3pQeC9NbkorVEROVTMyRGtoM2dZd0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVE0zTURJeE1qRTVNek13TUZvd1lqRUxNQWtHQTFVRUJoTUMKVlZNeEVUQVBCZ05WQkFnVENFNWxkeUJaYjNKck1SRXdEd1lEVlFRSEV3aE9aWGNnV1c5eWF6RVVNQklHQTFVRQpDaE1MWlhoaGJYQnNaUzVqYjIweEZ6QVZCZ05WQkFNVERtTmhMbVY0WVcxd2JHVXVZMjl0TUZrd0V3WUhLb1pJCnpqMENBUVlJS29aSXpqMERBUWNEUWdBRXpidC9ZQXp1YlZqYlRscWtTVFVzdGpxTVJqZ3QxUnJBSmxTR2xHNUcKOTRCc08wU0ZISWlIQkRKMk9YZ09VVFd1cDhVNkIxQU96bWNuS1MzVW9qODZwNk5GTUVNd0RnWURWUjBQQVFILwpCQVFEQWdFR01CSUdBMVVkRXdFQi93UUlNQVlCQWY4Q0FRRXdIUVlEVlIwT0JCWUVGRVpDdVNjaytranZXVTEzCkswQlYzMS9KN05XUE1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lHQmxwQmRYSzNWOENGREU1c2kvMHRjTXp0V1QKdWRva2k4NGhjMS83WlVHVEFpQWtXUW1IZGphaFk5QmRUNkFySHYyaFZKY1NaM0diWFcyUUFvTzRsaTdhZmc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=="
																]
															},
															"type": 0
														},
														"version": "0"
													}
												},
												"version": "0"
											}
										},
										"mod_policy": "Admins",

										// replace this - dsh todo
										"policies": {
											"Admins": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Admins"
													}
												},
												"version": "0"
											},
											"BlockValidation": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Writers"
													}
												},
												"version": "0"
											},
											"Readers": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Readers"
													}
												},
												"version": "0"
											},
											"Writers": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Writers"
													}
												},
												"version": "0"
											}
										},
										"values": {
											"BatchSize": {
												"mod_policy": "Admins",
												"value": {

													// replace this - dsh todo
													"absolute_max_bytes": 103809024,

													// replace this - dsh todo
													"max_message_count": 10,

													// replace this - dsh todo
													"preferred_max_bytes": 524288
												},
												"version": "0"
											},
											"BatchTimeout": {
												"mod_policy": "Admins",
												"value": {

													// replace this - dsh todo
													"timeout": "2s"
												},
												"version": "0"
											},
											"Capabilities": {
												"mod_policy": "Admins",
												"value": {
													"capabilities": {

														// orderer capabilities
														"V2_0": {}
													}
												},
												"version": "0"
											},
											"ChannelRestrictions": {
												"mod_policy": "Admins",
												"value": null,
												"version": "0"
											},
											"ConsensusType": {
												"mod_policy": "Admins",
												"value": {
													"metadata": {

														// replace this - dsh todo
														"consenters": [
															{
																"client_tls_cert": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUN6akNDQW5XZ0F3SUJBZ0lVSjNKKzZnTTRWTnVKOHdYUXZ0enJYZEF1VlE4d0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVEl6TURJeE5qRTVNemd3TUZvd1lERUxNQWtHQTFVRUJoTUMKVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLRXd0SWVYQmxjbXhsWkdkbApjakVRTUE0R0ExVUVDeE1IYjNKa1pYSmxjakVRTUE0R0ExVUVBeE1IYjNKa1pYSmxjakJaTUJNR0J5cUdTTTQ5CkFnRUdDQ3FHU000OUF3RUhBMElBQkxTV1p5S0ZMTjNza0VTK01jaEcyb2hmUDE4bHRmUVU3ckFaYTRrVWhqOUwKRzkzWFI3WlNpcm82VVJtSGJBUG9nT0ExaTBvZlUxbWVDa0gwUnpnQVNmMmpnZ0VKTUlJQkJUQU9CZ05WSFE4QgpBZjhFQkFNQ0E2Z3dIUVlEVlIwbEJCWXdGQVlJS3dZQkJRVUhBd0VHQ0NzR0FRVUZCd01DTUF3R0ExVWRFd0VCCi93UUNNQUF3SFFZRFZSME9CQllFRkM1dDlHUjZJenRISjZTOWhZK2gwd2xrNDNyVk1COEdBMVVkSXdRWU1CYUEKRkVaQ3VTY2sra2p2V1UxM0swQlYzMS9KN05XUE1Da0dBMVVkRVFRaU1DQ0NFMjl5WkdWeVpYSXVaWGhoYlhCcwpaUzVqYjIyQ0NXeHZZMkZzYUc5emREQmJCZ2dxQXdRRkJnY0lBUVJQZXlKaGRIUnljeUk2ZXlKb1ppNUJabVpwCmJHbGhkR2x2YmlJNklpSXNJbWhtTGtWdWNtOXNiRzFsYm5SSlJDSTZJbTl5WkdWeVpYSWlMQ0pvWmk1VWVYQmwKSWpvaWIzSmtaWEpsY2lKOWZUQUtCZ2dxaGtqT1BRUURBZ05IQURCRUFpQVp5R0ZQZmFOeWpRdmE5UnJlRXZ6bQpNR09INjE3dlE4ZDUwY2x2YWp6NkVnSWdJOW1QTUt3YTNVYSs5N0RZWEdBbzFDNzRpeHgveC9kaVVnWmdEclU1CjgwVT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=",
																"host": "orderer.example.com",
																"port": 7050,
																"server_tls_cert": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUN6akNDQW5XZ0F3SUJBZ0lVSjNKKzZnTTRWTnVKOHdYUXZ0enJYZEF1VlE4d0NnWUlLb1pJemowRUF3SXcKWWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRTVsZHlCWmIzSnJNUkV3RHdZRFZRUUhFd2hPWlhjZwpXVzl5YXpFVU1CSUdBMVVFQ2hNTFpYaGhiWEJzWlM1amIyMHhGekFWQmdOVkJBTVREbU5oTG1WNFlXMXdiR1V1ClkyOXRNQjRYRFRJeU1ESXhOakU1TXpNd01Gb1hEVEl6TURJeE5qRTVNemd3TUZvd1lERUxNQWtHQTFVRUJoTUMKVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLRXd0SWVYQmxjbXhsWkdkbApjakVRTUE0R0ExVUVDeE1IYjNKa1pYSmxjakVRTUE0R0ExVUVBeE1IYjNKa1pYSmxjakJaTUJNR0J5cUdTTTQ5CkFnRUdDQ3FHU000OUF3RUhBMElBQkxTV1p5S0ZMTjNza0VTK01jaEcyb2hmUDE4bHRmUVU3ckFaYTRrVWhqOUwKRzkzWFI3WlNpcm82VVJtSGJBUG9nT0ExaTBvZlUxbWVDa0gwUnpnQVNmMmpnZ0VKTUlJQkJUQU9CZ05WSFE4QgpBZjhFQkFNQ0E2Z3dIUVlEVlIwbEJCWXdGQVlJS3dZQkJRVUhBd0VHQ0NzR0FRVUZCd01DTUF3R0ExVWRFd0VCCi93UUNNQUF3SFFZRFZSME9CQllFRkM1dDlHUjZJenRISjZTOWhZK2gwd2xrNDNyVk1COEdBMVVkSXdRWU1CYUEKRkVaQ3VTY2sra2p2V1UxM0swQlYzMS9KN05XUE1Da0dBMVVkRVFRaU1DQ0NFMjl5WkdWeVpYSXVaWGhoYlhCcwpaUzVqYjIyQ0NXeHZZMkZzYUc5emREQmJCZ2dxQXdRRkJnY0lBUVJQZXlKaGRIUnljeUk2ZXlKb1ppNUJabVpwCmJHbGhkR2x2YmlJNklpSXNJbWhtTGtWdWNtOXNiRzFsYm5SSlJDSTZJbTl5WkdWeVpYSWlMQ0pvWmk1VWVYQmwKSWpvaWIzSmtaWEpsY2lKOWZUQUtCZ2dxaGtqT1BRUURBZ05IQURCRUFpQVp5R0ZQZmFOeWpRdmE5UnJlRXZ6bQpNR09INjE3dlE4ZDUwY2x2YWp6NkVnSWdJOW1QTUt3YTNVYSs5N0RZWEdBbzFDNzRpeHgveC9kaVVnWmdEclU1CjgwVT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo="
															}
														],

														// replace this - dsh todo
														"options": {
															"election_tick": 10,
															"heartbeat_tick": 1,
															"max_inflight_blocks": 5,
															"snapshot_interval_size": 16777216,
															"tick_interval": "500ms"
														}
													},
													"state": "STATE_NORMAL",
													"type": "etcdraft"
												},
												"version": "0"
											}
										},
										"version": "0"
									}
								},
								"mod_policy": "Admins",
								"policies": {
									"Admins": {
										"mod_policy": "Admins",
										"policy": {
											"type": 3,
											"value": {
												"rule": "MAJORITY",
												"sub_policy": "Admins"
											}
										},
										"version": "0"
									},
									"Readers": {
										"mod_policy": "Admins",
										"policy": {
											"type": 3,
											"value": {
												"rule": "ANY",
												"sub_policy": "Readers"
											}
										},
										"version": "0"
									},
									"Writers": {
										"mod_policy": "Admins",
										"policy": {
											"type": 3,
											"value": {
												"rule": "ANY",
												"sub_policy": "Writers"
											}
										},
										"version": "0"
									}
								},
								"values": {
									"BlockDataHashingStructure": {
										"mod_policy": "Admins",
										"value": {
											"width": 4294967295
										},
										"version": "0"
									},
									"Capabilities": {
										"mod_policy": "Admins",
										"value": {

											// channel capabilities
											"capabilities": {
												"V2_0": {}
											}
										},
										"version": "0"
									},
									"HashingAlgorithm": {
										"mod_policy": "Admins",
										"value": {
											"name": "SHA256"
										},
										"version": "0"
									},
									"OrdererAddresses": {
										"mod_policy": "/Channel/Orderer/Admins",
										"value": {

											// replace this - dsh todo
											"addresses": [
												"orderer.example.com:7050"
											]
										},
										"version": "0"
									}
								},
								"version": "0"
							},
							"sequence": "0"
						},


						// genesis blocks have no last update (unlike config blocks)
						"last_update": null
					},
					"header": {
						"channel_header": {

							// replace this
							"channel_id": "mychannel",


							"epoch": "0",

							"extension": null,

							// replace this
							"timestamp": "2022-02-16T19:38:24Z",

							"tls_cert_hash": null,

							// replace this - dsh todo
							"tx_id": "f3483b0ad4060b5eaac082e41e8bfd7a3ecdff4553b54338f4f12999024b411b",

							// types are defined in common.proto HeaderType (0 - 7)
							"type": 1,

							"version": 1
						},
						"signature_header": {
							"creator": null,
							"nonce": "FIBsoAadZu90sxyoTar5G6bteRqfgHra"
						}
					}
				},
				"signature": null
			}
		]
	},
	"header": {
		"data_hash": "JAxIp0y5lTO0XOkgJllLUJ1tf2lnYhsTFZtORwE+TG8=",
		"number": "0",
		"previous_hash": null
	},
	"metadata": {
		"metadata": [
			"CgIKAA==",
			"",
			"",
			"",
			""
		]
	}
}


// -------------------------------------------------------------
// tweak the template config block with the given options - dsh todo, lots of things to set!
// -------------------------------------------------------------
/*
	opts: {
		channel: 'my_first_channel',
		application_capabilities: 'V2_0',
		orderer_capabilities: 'V2_0',
		channel_capabilities: 'V2_0',
		msps: {
			Org1MSP: {
				'Admins': 'default',			// can be null or 'default'
				'Endorsement': 'default',		// can be null or 'default'
				'Readers': 'default',			// can be null or 'default'
				'Writers': 'default',			// can be null or 'default'
				'MSP': {
					fabric_node_ous: {} 		// set whole object, there are no defaults inside
					intermediate_certs: [],
					organizational_unit_identifiers: [],
					revocation_list: [],
					root_certs: []				// required - base 64 encoded pems
					signing_identity: null,
					tls_intermediate_certs: [],
					tls_root_certs: [],			// required - base 64 encoded pems
				},
			}
		}
	}
*/
function buildTemplateConfigBlock(opts: ExtTemp) {
	let app_caps: StringObj = {}, ord_caps: StringObj = {}, ch_caps: StringObj = {};

	const ret = JSON.parse(JSON.stringify(template));

	// set channel name
	ret.data.data[0].payload.header.channel_header.channel_id = opts.channel;

	// set date
	const d = new Date();
	ret.data.data[0].payload.header.channel_header.timestamp = d.toISOString();

	// set tx id
	//ret.data.data[0].payload.header.channel_header.tx_id = d.toISOString();

	// set application capabilities
	if (opts.application_capabilities) {
		app_caps[opts.application_capabilities] = {};
		ret.data.data[0].payload.data.config.channel_group.groups.Application.values.Capabilities.value.capabilities = app_caps;
	}

	// set orderer capabilities
	if (opts.orderer_capabilities) {
		ord_caps[opts.orderer_capabilities] = {};
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.Capabilities.value.capabilities = ord_caps;
	}

	// set channel capabilities
	if (opts.channel_capabilities) {
		ch_caps[opts.channel_capabilities] = {};
		ret.data.data[0].payload.data.config.channel_group.values.Capabilities.value.capabilities = ch_caps;
	}

	// set groups.Application.groups
	const defaults = ret.data.data[0].payload.data.config.channel_group.groups.Application.groups.Org1MSP;		// remember defaults
	ret.data.data[0].payload.data.config.channel_group.groups.Application.groups = {};							// clear it out
	for (let msp_id in opts.msps) {
		ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id] = buildGroup(defaults, opts.msps[msp_id], msp_id);
	}

	// set groups.Application.groups[msp_id].values.MSP
	for (let msp_id in opts.msps) {
		if (opts.msps[msp_id].MSP) {

			// set fabric_node_ous
			if (opts.msps[msp_id].MSP.fabric_node_ous) {
				ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id].values.MSP.value.config.fabric_node_ous = opts.msps[msp_id].MSP.fabric_node_ous;
			} else {
				delete ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id].values.MSP.value.config.fabric_node_ous;
			}

			// the each certificate array field
			const fields = ['intermediate_certs', 'organizational_unit_identifiers', 'revocation_list', 'root_certs', 'tls_intermediate_certs', 'tls_root_certs'];
			for (let i in fields) {
				const field = fields[i];
				if (Array.isArray(opts.msps[msp_id].MSP[field])) {
					ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id].values.MSP.value.config[field] = opts.msps[msp_id].MSP[field];
				}
			}

			// set signing_identity
			if (opts.msps[msp_id].MSP.signing_identity) {
				ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id].values.MSP.value.config.signing_identity = opts.msps[msp_id].MSP.signing_identity;
			}

			// set name
			ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id].values.MSP.value.config.name = msp_id;
		}
	}

	return ret;
}

// build the data.data[0].payload.data.config.channel_group.groups.Application.groups object up
function buildGroup(defaults: any, msp_data: any, msp_id: string) {
	const ret = JSON.parse(JSON.stringify(defaults));
	const policy_names = ['Admins', 'Endorsement', 'Readers', 'Writers'];
	for (let z in policy_names) {
		const policyName = policy_names[z];
		if (!msp_data[policyName] || msp_data[policyName] === 'default') {
			for (let i in ret.policies[policyName].policy.value.identities) {			// 'Readers' has a few entries, iter on each
				ret.policies[policyName].policy.value.identities[i].principal.msp_identifier = msp_id;
			}
		} else {
			logger.error('[config] cannot build config block for msp, only the default groups policy is supported atm. msp_id:', msp_id);
			return null;
		}
	}

	return ret;
}

interface ExtTemp {
	channel: string,
	application_capabilities: string | null;
	orderer_capabilities: string | null;
	channel_capabilities: string | null;
	msps: StringObj2;
}

interface StringObj {
	[index: string]: object;
}

interface StringObj2 {
	[index: string]: {
		MSP: any,
		/*MSP: {
			fabric_node_ous: any;
			intermediate_certs: string[];
			organizational_unit_identifiers: string[];
			revocation_list: string[];
			root_certs: string[];
			signing_identity: null,
			tls_intermediate_certs: string[];
			tls_root_certs: string[];
		}*/
	};
}
