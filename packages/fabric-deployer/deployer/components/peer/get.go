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

package peer

import (
	"net/http"
	"strings"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
)

func (peer *Peer) GetCR(section, compName, namespace, sID string) (*api.Response, int, error) {
	peer.Logger.Debugf("Received request to get peer cr %s", compName)
	response, statusCode, err := peer.GetCRResponse(section, compName, namespace, sID)
	if err != nil {
		peer.Logger.Error(errors.Wrapf(err, "get err for %s", compName))
		return nil, 500, err
	}

	return response, statusCode, nil
}

func (peer *Peer) GetAllCR(sID, namespace string) ([]api.Response, int, error) {
	peer.Logger.Debugf("Received request to get all peer cr in namespace '%s'", namespace)

	allresponses := []api.Response{}
	peerList := &current.IBPPeerList{}
	err := peer.IBPOperatorClient.GetAllCR(namespace, "ibppeers", peerList)
	if err != nil {
		peer.Logger.Error(errors.Wrapf(err, "Failed to get all peer cr for in namespace '%s'", namespace))
		return nil, 500, err
	}
	for _, originalCR := range peerList.Items {
		compName := originalCR.Name

		response, _, err := peer.GetCRResponse(ALL, compName, namespace, sID)
		if err != nil {
			peer.Logger.Error(errors.Wrapf(err, "Failed to build response object '%s'", compName))
			return nil, 500, err
		}

		allresponses = append(allresponses, *response)
	}
	return allresponses, 200, nil
}

func (peer *Peer) GetCRResponse(section, compName, namespace, sID string) (*api.Response, int, error) {
	peer.Logger.Debugf("Received get request for '%s'", compName)

	originalCR := &current.IBPPeer{}
	statusCodeInt := 200
	statusCode := &statusCodeInt
	response := &api.Response{
		Component: api.Component{
			Name: compName,
		},
	}
	err := peer.IBPOperatorClient.GetCR(namespace, "ibppeers", compName, originalCR)
	if err != nil {
		return nil, *statusCode, errors.Wrapf(err, "failed to get cr for '%s' in namespace '%s'", compName, namespace)
	}

	switch section {
	case RESOURCES:
		peer.getResources(originalCR, response)
	case STORAGE:
		peer.getStorage(originalCR, response)
	case STATUS:
		peer.getStatus(originalCR, response)
	case CONFIG:
		peer.getConfig(originalCR, response, statusCode)
	case ENDPOINTS:
		peer.getEndpoints(originalCR, response, statusCode)
	case CRYPTO:
		peer.getCrypto(originalCR, response, statusCode)
	case VERSION:
		peer.getVersion(originalCR, response)
	case ADMINCERTS:
		peer.getAdmincerts(originalCR, response)
	case NODEOU:
		peer.getNodeOU(originalCR, response)
	case HSM:
		peer.getHSM(originalCR, response)
	case REPLICAS:
		peer.getReplicas(originalCR, response)
	case ALL:
		peer.getResources(originalCR, response)
		peer.getStorage(originalCR, response)
		peer.getStatus(originalCR, response)
		peer.getConfig(originalCR, response, statusCode)
		peer.getEndpoints(originalCR, response, statusCode)
		peer.getCrypto(originalCR, response, statusCode)
		peer.getVersion(originalCR, response)
		peer.getAdmincerts(originalCR, response)
		peer.getNodeOU(originalCR, response)
		peer.getHSM(originalCR, response)
		peer.getReplicas(originalCR, response)
		peer.getOther(originalCR, response)
	default:
		return nil, http.StatusBadRequest, errors.Errorf("section %s not supported: %d", section, http.StatusBadRequest)
	}

	return response, *statusCode, nil

}

func (peer *Peer) getResources(originalCR *current.IBPPeer, response *api.Response) {
	var totalResources *util.ResourceReturn
	var individualResources *current.PeerResources
	peerResources := []*corev1.ResourceRequirements{}
	if originalCR.Spec.Resources != nil {
		if originalCR.Spec.Resources.Peer != nil {
			peerResources = append(peerResources, originalCR.Spec.Resources.Peer)
		}
		if strings.ToLower(originalCR.Spec.StateDb) == "couchdb" {
			if originalCR.Spec.Resources.CouchDB != nil {
				peerResources = append(peerResources, originalCR.Spec.Resources.CouchDB)
			}
		}
		if originalCR.Spec.Resources.GRPCProxy != nil {
			peerResources = append(peerResources, originalCR.Spec.Resources.GRPCProxy)
		}
	}
	if util.GetMajorRelease(originalCR.Spec.FabricVersion) == 1 {
		if originalCR.Spec.Resources.DinD != nil {
			peerResources = append(peerResources, originalCR.Spec.Resources.DinD)
		}
		if originalCR.Spec.Resources.FluentD != nil {
			peerResources = append(peerResources, originalCR.Spec.Resources.FluentD)
		}
	}
	if util.GetMajorRelease(originalCR.Spec.FabricVersion) == 2 {
		if originalCR.Spec.Resources != nil {
			if originalCR.Spec.Resources.CCLauncher != nil {
				peerResources = append(peerResources, originalCR.Spec.Resources.CCLauncher)
			}
		}
	}
	totalResources = util.GetTotalDeploymentResources(peerResources)
	individualResources = peer.GetIndividualResources("peer", originalCR.Spec.Resources, originalCR.Spec.FabricVersion, originalCR.Spec.StateDb)
	response.Resources = totalResources
	response.IndividualResources = individualResources
}

func (peer *Peer) getStorage(originalCR *current.IBPPeer, response *api.Response) {
	response.Storage = originalCR.Spec.Storage
}

func (peer *Peer) getStatus(originalCR *current.IBPPeer, response *api.Response) {
	response.CRStatus = &originalCR.Status
}

func (peer *Peer) getConfig(originalCR *current.IBPPeer, response *api.Response, statusCode *int) {
	coreYaml, err := peer.GetConfig(originalCR.Name, originalCR.Namespace, originalCR.Spec.FabricVersion)
	if err != nil {
		peer.Logger.Warnf("Error getting config for peer: %s", err)
		*statusCode = common.StatusCode500
		return
	}
	response.Config = coreYaml
}

func (peer *Peer) getEndpoints(originalCR *current.IBPPeer, response *api.Response, statusCode *int) {
	connectionProfile, err := peer.GetConnectionProfile(originalCR.Name, originalCR.Namespace)
	if err != nil {
		peer.Logger.Warnf("Connection profile get error: %s", err)
		*statusCode = common.StatusCode500
	}
	if connectionProfile != nil {
		if connectionProfile.Endpoints != nil {
			response.Endpoints = connectionProfile.Endpoints
		} else {
			peer.Logger.Warnf("Connection profile is missing fields endpoints")
			*statusCode = common.StatusCode500
		}
	} else {
		peer.Logger.Warnf("Connection profile is empty")
		*statusCode = common.StatusCode500
	}
}

func (peer *Peer) getCrypto(originalCR *current.IBPPeer, response *api.Response, statusCode *int) {
	response.Crypto = originalCR.Spec.Secret
	common.RemoveSensitiveDataFromCrypto(response.Crypto)

	connectionProfile, err := peer.GetConnectionProfile(originalCR.Name, originalCR.Namespace)
	if err != nil {
		peer.Logger.Warnf("Connection profile get error: %s", err)
		*statusCode = common.StatusCode500
	}
	if connectionProfile != nil {
		response.MSP = &common.MSP{}
		if connectionProfile.TLS != nil {
			response.MSP.TLS = connectionProfile.TLS
		} else {
			peer.Logger.Warnf("Connection profile is missing fields TLS")
			*statusCode = common.StatusCode500
		}
		if connectionProfile.Component != nil {
			response.MSP.Ecert = connectionProfile.Component
		} else {
			peer.Logger.Warnf("Connection profile is missing fields Component")
			*statusCode = common.StatusCode500
		}
	} else {
		peer.Logger.Warnf("Connection profile is empty")
		*statusCode = common.StatusCode500
	}
}

func (peer *Peer) getVersion(originalCR *current.IBPPeer, response *api.Response) {
	if util.IsFullFabricVersion(originalCR.Spec.FabricVersion) {
		response.Version = originalCR.Spec.FabricVersion
		return
	}

	if originalCR.Spec.Images != nil {
		specVersion := originalCR.Spec.FabricVersion
		tag := originalCR.Spec.Images.PeerTag
		response.Version = util.GetFullFabricVersion(specVersion, tag)
		peer.Logger.Infof("%s Spec.FabricVersion: %s, Spec.Images.PeerTag: %s, Full Fabric Version: %s", originalCR.Name, specVersion, tag, response.Version)
	} else {
		peer.Logger.Warnf("Peer tag is missing, unable to get full fabric version")
	}
}

func (peer *Peer) getAdmincerts(originalCR *current.IBPPeer, response *api.Response) {
	adminCerts := common.AdminCertsFromConfig(originalCR.Spec.Secret)
	response.AdminCerts = adminCerts
}

func (peer *Peer) getNodeOU(originalCR *current.IBPPeer, response *api.Response) {
	// If DisableNodeOU is not set, operator enables NodeOU by default
	isNodeOUEnabled := true
	if originalCR.Spec.DisableNodeOU != nil && *originalCR.Spec.DisableNodeOU {
		isNodeOUEnabled = false
	}
	nodeOU := &api.NodeOU{
		Enabled: &isNodeOUEnabled,
		// TODO in future add Config
	}
	response.NodeOU = nodeOU
}

func (peer *Peer) getHSM(originalCR *current.IBPPeer, response *api.Response) {
	response.HSM = originalCR.Spec.HSM
}

func (peer *Peer) getReplicas(originalCR *current.IBPPeer, response *api.Response) {
	if originalCR.Spec.Replicas != nil {
		response.Replicas = *originalCR.Spec.Replicas
	} else {
		response.Replicas = 1
	}
}

func (peer *Peer) getOther(originalCR *current.IBPPeer, response *api.Response) {
	response.Region = originalCR.Spec.Region
	response.Zone = originalCR.Spec.Zone
}
