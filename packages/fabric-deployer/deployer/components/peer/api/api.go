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
	dconfig "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"k8s.io/apimachinery/pkg/runtime"
)

type CreateRequest struct {
	Version        string                 `json:"version,omitempty"`
	Zone           string                 `json:"zone,omitempty"`
	Orgname        string                 `json:"orgname,omitempty"`
	Config         *current.SecretSpec    `json:"crypto,omitempty"`
	StateDB        string                 `json:"statedb,omitempty"`
	Resources      *current.PeerResources `json:"resources,omitempty"`
	Storage        *current.PeerStorages  `json:"storage,omitempty"`
	ConfigOverride *runtime.RawExtension  `json:"configoverride,omitempty"`
	HSM            *current.HSM           `json:"hsm,omitempty"` // DEPRECATED
	Arch           []string               `json:"arch,omitempty"`
	Region         string                 `json:"region,omitempty"`
}

type DeleteRequest struct {
	NodeType  string `json:"node_type,omitempty"`
	NodeName  string `json:"node_name,omitempty"`
	ServiceID string `json:"serviceId,omitempty"`
}

type UpdateRequest struct {
	Version        string                 `json:"version,omitempty"`
	Config         *current.SecretSpec    `json:"crypto,omitempty"`
	AdminCerts     []string               `json:"admincerts,omitempty"`
	Resources      *current.PeerResources `json:"resources,omitempty"`
	ConfigOverride *runtime.RawExtension  `json:"configoverride,omitempty"`
	HSM            *current.HSM           `json:"hsm,omitempty"` // DEPRECATED
	NodeOU         *NodeOU                `json:"nodeou,omitempty"`
	Actions        *current.PeerAction    `json:"actions,omitempty"`
	Replicas       *int32                 `json:"replicas,omitempty"`
}

type Component struct {
	Name                 string                 `json:"name,omitempty"`
	Endpoints            interface{}            `json:"endpoints,omitempty"`
	Resources            *util.ResourceReturn   `json:"resources,omitempty"`
	IndividualResources  *current.PeerResources `json:"individualResources,omitempty"`
	CRNString            string                 `json:"crnString,omitempty"`
	CRN                  *dconfig.CRN           `json:"crn,omitempty"`
	ResourcePlanID       string                 `json:"resource_plan_id,omitempty"`
	Storage              *current.PeerStorages  `json:"storage,omitempty"`
	CRStatus             *current.IBPPeerStatus `json:"crstatus,omitempty"`
	Version              string                 `json:"version,omitempty"`
	AdminCerts           []string               `json:"admincerts,omitempty"`
	Config               interface{}            `json:"config,omitempty"`
	CreationTimestamp    int64                  `json:"creation_timestamp,omitempty"`
	LastUpdatedTimestamp int64                  `json:"last_updated,omitempty"`
	NodeOU               *NodeOU                `json:"nodeou,omitempty"`
	Crypto               *current.SecretSpec    `json:"crypto,omitempty"`
	MSP                  *common.MSP            `json:"msp,omitempty"`
	Region               string                 `json:"region,omitempty"`
	Zone                 string                 `json:"zone,omitempty"`
	Replicas             int32                  `json:"replicas,omitempty"`
	HSM                  *current.HSM           `json:"hsm,omitempty"`
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

type NodeOU struct {
	Enabled *bool `json:"enabled,omitempty"`
}
