/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 * 	  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package api

import (
	"encoding/json"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

type CreateRequest struct {
	Version   string               `json:"version,omitempty"`
	Resources *current.CAResources `json:"resources,omitempty"`
	Storage   *current.CAStorages  `json:"storage,omitempty"`
	Arch      []string             `json:"arch,omitempty"`
	// Purposefully a pointer to make differentiate between 0 and not passed
	Replicas       *int32                  `json:"replicas,omitempty"`
	ConfigOverride *current.ConfigOverride `json:"configoverride,omitempty"`
	HSM            *current.HSM            `json:"hsm,omitempty"` // DEPRECATED
	Zone           string                  `json:"zone,omitempty"`
	Region         string                  `json:"region,omitempty"`
}

type DeleteRequest struct {
	NodeType  string `json:"node_type"`
	NodeName  string `json:"node_name"`
	ServiceID string `json:"serviceId"`
}

type UpdateRequest struct {
	Version        string                  `json:"version,omitempty"`
	Resources      *current.CAResources    `json:"resources,omitempty"`
	Replicas       *int32                  `json:"replicas,omitempty"`
	ConfigOverride *current.ConfigOverride `json:"configoverride,omitempty"`
	Actions        *current.CAAction       `json:"actions,omitempty"`
	HSM            *current.HSM            `json:"hsm,omitempty"` // DEPRECATED
}

type Component struct {
	Name                 string                  `json:"name,omitempty"`
	CAName               string                  `json:"ca_name,omitempty"`
	TLSCAName            string                  `json:"tlsca_name,omitempty"`
	Endpoints            interface{}             `json:"endpoints,omitempty"`
	Resources            *util.ResourceReturn    `json:"resources,omitempty"`
	IndividualResources  *current.CAResources    `json:"individualResources,omitempty"`
	TLS                  interface{}             `json:"tls,omitempty"`
	CRNString            string                  `json:"crnString,omitempty"`
	CRN                  *config.CRN             `json:"crn,omitempty"`
	ResourcePlanID       string                  `json:"resource_plan_id,omitempty"`
	Storage              *current.CAStorages     `json:"storage,omitempty"`
	CRStatus             *current.IBPCAStatus    `json:"crstatus,omitempty"`
	Version              string                  `json:"version,omitempty"`
	Configs              *current.ConfigOverride `json:"configs,omitempty"`
	CreationTimestamp    int64                   `json:"creation_timestamp,omitempty"`
	LastUpdatedTimestamp int64                   `json:"last_updated,omitempty"`
	Region               string                  `json:"region,omitempty"`
	Zone                 string                  `json:"zone,omitempty"`
	Replicas             int32                   `json:"replicas,omitempty"`
	HSM                  *current.HSM            `json:"hsm,omitempty"`
	MSP                  *MSP                    `json:"msp,omitempty"`
}

type Response struct {
	Component `json:",inline"`
}

type Deleted struct {
	Timestamp string `json:"timestamp"`
	Reason    string `json:"reason"`
	Who       string `json:"who"`
}

type DeleteResponse struct {
	Message string `json:"message,omitempty"`
}

type UpdateResponse struct {
	Message string `json:"message,omitempty"`
	Response
}

type GetResponse struct {
	Message string `json:"message,omitempty"`
	Response
}

type ConfigOverride struct {
	CA    *json.RawMessage `json:"ca"`
	TLSCA *json.RawMessage `json:"tlsca"`
}

type ConnectionProfile struct {
	Endpoints interface{} `json:"endpoints"`
	TLS       interface{} `json:"tls"`
	CA        interface{} `json:"ca"`
	TLSCA     interface{} `json:"tlsca"`
}

type MSP struct {
	CA    interface{} `json:"ca"`
	TLSCA interface{} `json:"tlsca"`
}
