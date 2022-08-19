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

package orderer

import (
	"net/http"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
)

func (o *Orderer) GetCR(section, compName, namespace, sID string) (*api.Response, int, error) {
	o.Logger.Debugf("Received request to get orderer cr %s", compName)
	response, statusCode, err := o.GetCRResponse(section, compName, namespace, sID)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "get err for %s", compName))
		return nil, 500, err
	}

	return response, statusCode, nil
}

func (o *Orderer) GetAllCR(sID, namespace string) ([]api.Response, int, error) {
	o.Logger.Debugf("Received request to get all orderer cr in namespace '%s'", namespace)

	allresponses := []api.Response{}
	ordererList := &current.IBPOrdererList{}
	err := o.IBPOperatorClient.GetAllCR(namespace, "IBPOrderers", ordererList)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "Failed to get all orderer cr for in namespace '%s'", namespace))
		return nil, 500, err
	}
	for _, originalCR := range ordererList.Items {
		compName := originalCR.Name

		response, _, err := o.GetCRResponse(ALL, compName, namespace, sID)
		if err != nil {
			o.Logger.Error(errors.Wrapf(err, "Failed to build response object '%s'", compName))
			return nil, 500, err
		}

		allresponses = append(allresponses, *response)
	}
	return allresponses, 200, nil
}

func (o *Orderer) GetCRResponse(section, compName, namespace, sID string) (*api.Response, int, error) {
	o.Logger.Debugf("Received get request for '%s'", compName)

	originalCR := &current.IBPOrderer{}
	statusCodeInt := 200
	statusCode := &statusCodeInt
	response := &api.Response{
		Component: api.Component{
			Name: compName,
		},
	}
	err := o.IBPOperatorClient.GetCR(namespace, "IBPOrderers", compName, originalCR)
	if err != nil {
		return nil, common.StatusCode500, errors.Wrapf(err, "failed to get cr for '%s' in namespace '%s'", compName, namespace)
	}

	switch section {
	case RESOURCES:
		o.getResources(originalCR, response)
	case STORAGE:
		o.getStorage(originalCR, response)
	case STATUS:
		err := o.getStatus(originalCR, response)
		if err != nil {
			return nil, common.StatusCode500, err
		}
	case CONFIG:
		o.getConfig(originalCR, response, statusCode)
	case ENDPOINTS:
		o.getEndpoints(originalCR, response, statusCode)
	case CRYPTO:
		o.getCrypto(originalCR, response, statusCode)
	case VERSION:
		o.getVersion(originalCR, response)
	case ADMINCERTS:
		o.getAdmincerts(originalCR, response)
	case NODEOU:
		o.getNodeOU(originalCR, response)
	case HSM:
		o.getHSM(originalCR, response)
	case REPLICAS:
		o.getReplicas(originalCR, response)
	case ALL:
		o.getResources(originalCR, response)
		o.getStorage(originalCR, response)
		err := o.getStatus(originalCR, response)
		if err != nil {
			return nil, common.StatusCode500, err
		}
		o.getConfig(originalCR, response, statusCode)
		o.getEndpoints(originalCR, response, statusCode)
		o.getCrypto(originalCR, response, statusCode)
		o.getVersion(originalCR, response)
		o.getAdmincerts(originalCR, response)
		o.getNodeOU(originalCR, response)
		o.getHSM(originalCR, response)
		o.getReplicas(originalCR, response)
		o.getOther(originalCR, response)
		o.getChannelLess(originalCR, response)
	default:
		return nil, http.StatusBadRequest, errors.Errorf("section %s not supported: %d", section, http.StatusBadRequest)
	}

	return response, *statusCode, nil

}

func (o *Orderer) getResources(originalCR *current.IBPOrderer, response *api.Response) {
	var totalResources *util.ResourceReturn
	var individualResources *current.OrdererResources
	ordererResources := []*corev1.ResourceRequirements{}
	if originalCR.Spec.Resources != nil {
		if originalCR.Spec.Resources.Orderer != nil {
			ordererResources = append(ordererResources, originalCR.Spec.Resources.Orderer)
		}
		if originalCR.Spec.Resources.GRPCProxy != nil {
			ordererResources = append(ordererResources, originalCR.Spec.Resources.GRPCProxy)
		}
		if originalCR.Spec.Resources.Init != nil {
			ordererResources = append(ordererResources, originalCR.Spec.Resources.Init)
		}
	}
	totalResources = util.GetTotalDeploymentResources(ordererResources)
	individualResources = o.GetIndividualResources(originalCR.Spec.Resources)
	response.Resources = totalResources
	response.IndividualResources = individualResources
}

func (o *Orderer) getStorage(originalCR *current.IBPOrderer, response *api.Response) {
	response.Storage = originalCR.Spec.Storage
}

func (o *Orderer) getStatus(originalCR *current.IBPOrderer, response *api.Response) error {
	response.CRStatus = &originalCR.Status
	parentCR := &current.IBPOrderer{}
	parentName := originalCR.ObjectMeta.Labels["parent"]
	if parentName != "" {
		err := o.IBPOperatorClient.GetCR(o.Config.Namespace, "IBPOrderers", parentName, parentCR)
		if err != nil {
			return errors.Wrapf(err, "failed to get cr for '%s'", parentName)
		}

		response.Parent = &api.Parent{
			CRStatus: &parentCR.Status,
			Name:     parentCR.Name,
		}
	}

	return nil
}

func (o *Orderer) getConfig(originalCR *current.IBPOrderer, response *api.Response, statusCode *int) {
	ordererYaml, err := o.GetConfig(originalCR.Name, originalCR.Namespace, originalCR.Spec.FabricVersion)
	if err != nil {
		o.Logger.Warnf("Error getting config for peer: %s", err)
		*statusCode = common.StatusCode500
		return
	}
	response.Config = ordererYaml
}

func (o *Orderer) getEndpoints(originalCR *current.IBPOrderer, response *api.Response, statusCode *int) {
	connectionProfile, err := o.GetConnectionProfile(originalCR.Name, originalCR.Namespace)
	if err != nil {
		o.Logger.Warnf("Connection profile get error: %s", err)
		*statusCode = common.StatusCode500
	}
	if connectionProfile != nil {
		if connectionProfile.Endpoints != nil {
			response.Endpoints = connectionProfile.Endpoints
		} else {
			o.Logger.Warnf("Connection profile is missing fields endpoints")
			*statusCode = common.StatusCode500
		}
	} else {
		o.Logger.Warnf("Connection profile is empty")
		*statusCode = common.StatusCode500
	}
}

func (o *Orderer) getCrypto(originalCR *current.IBPOrderer, response *api.Response, statusCode *int) {
	response.Crypto = originalCR.Spec.Secret
	common.RemoveSensitiveDataFromCrypto(response.Crypto)

	connectionProfile, err := o.GetConnectionProfile(originalCR.Name, originalCR.Namespace)
	if err != nil {
		o.Logger.Warnf("Connection profile get error: %s", err)
		*statusCode = common.StatusCode500
	}
	if connectionProfile != nil {
		response.MSP = &common.MSP{}
		if connectionProfile.TLS != nil {
			response.MSP.TLS = connectionProfile.TLS
		} else {
			o.Logger.Warnf("Connection profile is missing fields TLS")
			*statusCode = common.StatusCode500
		}
		if connectionProfile.Component != nil {
			response.MSP.Ecert = connectionProfile.Component
		} else {
			o.Logger.Warnf("Connection profile is missing fields Component")
			*statusCode = common.StatusCode500
		}
	} else {
		o.Logger.Warnf("Connection profile is empty")
		*statusCode = common.StatusCode500
	}
}

func (o *Orderer) getVersion(originalCR *current.IBPOrderer, response *api.Response) {
	if util.IsFullFabricVersion(originalCR.Spec.FabricVersion) {
		response.Version = originalCR.Spec.FabricVersion
		return
	}

	if originalCR.Spec.Images != nil {
		specVersion := originalCR.Spec.FabricVersion
		tag := originalCR.Spec.Images.OrdererTag
		response.Version = util.GetFullFabricVersion(specVersion, tag)
		o.Logger.Infof("%s Spec.FabricVersion: %s, Spec.Images.OrdererTag: %s, Full Fabric Version: %s", originalCR.Name, specVersion, tag, response.Version)
	} else {
		o.Logger.Warnf("Orderer tag is missing, unable to get full fabric version")
	}
}

func (o *Orderer) getAdmincerts(originalCR *current.IBPOrderer, response *api.Response) {
	adminCerts := common.AdminCertsFromConfig(originalCR.Spec.Secret)
	response.AdminCerts = adminCerts
}

func (o *Orderer) getNodeOU(originalCR *current.IBPOrderer, response *api.Response) {
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

func (o *Orderer) getHSM(originalCR *current.IBPOrderer, response *api.Response) {
	response.HSM = originalCR.Spec.HSM
}

func (o *Orderer) getReplicas(originalCR *current.IBPOrderer, response *api.Response) {
	if originalCR.Spec.Replicas != nil {
		response.Replicas = *originalCR.Spec.Replicas
	} else {
		response.Replicas = 1
	}
}

func (o *Orderer) getOther(originalCR *current.IBPOrderer, response *api.Response) {
	response.Region = originalCR.Spec.Region
	response.Zone = originalCR.Spec.Zone
}

func (o *Orderer) getChannelLess(originalCR *current.IBPOrderer, response *api.Response) {
	isSystemChannelEnabled := true
	if originalCR.Spec.UseChannelLess != nil && *originalCR.Spec.UseChannelLess {
		isSystemChannelEnabled = false
	}

	// channel less only if system channel is not enabled
	response.ChannelLess = !isSystemChannelEnabled
}
