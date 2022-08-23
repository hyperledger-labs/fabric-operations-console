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

package common

import "github.com/IBM-Blockchain/fabric-deployer/config"

var (
	StatusCode500 = 500
	StatusCode404 = 404
)

const (
	NODE = "node"
)

type ConnectionProfile struct {
	Endpoints interface{} `json:"endpoints"`
	TLS       interface{} `json:"tls"`
	Component interface{} `json:"component"`
}

type MSP struct {
	TLS   interface{} `json:"tls"`
	Ecert interface{} `json:"component"`
}

type VersionResponseCA struct {
	Versions map[string]config.VersionCA `json:"versions"`
}

type VersionResponsePeer struct {
	Versions map[string]config.VersionPeer `json:"versions"`
}

type VersionResponseOrderer struct {
	Versions map[string]config.VersionOrderer `json:"versions"`
}

type AllVersionsResponse struct {
	Versions config.Versions `json:"versions"`
}
