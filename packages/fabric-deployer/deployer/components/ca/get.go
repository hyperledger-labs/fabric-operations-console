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

package ca

import (
	"encoding/json"
	"net/http"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/runtime"
)

func (ca *CA) GetCR(section, compName, namespace, sID string) (*api.Response, int, error) {
	ca.Logger.Debugf("Received request to get ca cr %s", compName)
	response, statusCode, err := ca.GetCRResponse(section, compName, namespace, sID)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "get err for %s", compName))
		return nil, 500, err
	}

	return response, statusCode, nil
}

func (ca *CA) GetAllCR(sID, namespace string) ([]api.Response, int, error) {
	ca.Logger.Debugf("Received request to get ca all cr in namespace '%s'", namespace)
	allresponses := []api.Response{}
	caList := &current.IBPCAList{}
	err := ca.IBPOperatorClient.GetAllCR(namespace, "ibpcas", caList)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "Failed to get all ca cr for in namespace '%s'", namespace))
		return nil, 500, err
	}
	for _, caCR := range caList.Items {
		compName := caCR.Name
		response, _, err := ca.GetCRResponse(ALL, compName, namespace, sID)
		if err != nil {
			ca.Logger.Error(errors.Wrapf(err, "Failed to build response object '%s'", compName))
			return nil, 500, err
		}

		allresponses = append(allresponses, *response)
	}
	return allresponses, 200, nil
}

func (ca *CA) GetCRResponse(section, compName, namespace, sID string) (*api.Response, int, error) {
	ca.Logger.Debugf("Received get request for '%s'", compName)

	originalCR := &current.IBPCA{}
	statusCodeInt := 200
	statusCode := &statusCodeInt
	response := &api.Response{
		Component: api.Component{
			Name: compName,
		},
	}
	err := ca.IBPOperatorClient.GetCR(namespace, "ibpcas", compName, originalCR)
	if err != nil {
		return nil, *statusCode, errors.Wrapf(err, "failed to get cr for '%s' in namespace '%s'", compName, namespace)
	}

	switch section {
	case RESOURCES:
		ca.getResources(originalCR, response)
	case STORAGE:
		ca.getStorage(originalCR, response)
	case STATUS:
		ca.getStatus(originalCR, response)
	case CONFIG:
		ca.getConfig(originalCR, response, statusCode)
	case ENDPOINTS:
		ca.getEndpoints(originalCR, response, statusCode)
	case VERSION:
		ca.getVersion(originalCR, response)
	case REPLICAS:
		ca.getReplicas(originalCR, response)
	case HSM:
		ca.getHSM(originalCR, response)
	case CRYPTO:
		ca.getCrypto(originalCR, response, statusCode)
	case ALL:
		ca.getResources(originalCR, response)
		ca.getStorage(originalCR, response)
		ca.getStatus(originalCR, response)
		ca.getConfig(originalCR, response, statusCode)
		ca.getEndpoints(originalCR, response, statusCode)
		ca.getVersion(originalCR, response)
		ca.getReplicas(originalCR, response)
		ca.getHSM(originalCR, response)
		ca.getCrypto(originalCR, response, statusCode)
		ca.getOther(originalCR, response)
	default:
		return nil, http.StatusBadRequest, errors.Errorf("section %s not supported: %d", section, http.StatusBadRequest)
	}

	return response, *statusCode, nil

}

func (ca *CA) getResources(originalCR *current.IBPCA, response *api.Response) {
	var totalResources *util.ResourceReturn
	var individualResources *current.CAResources
	caResources := ca.GetResources(ca.Config.Defaults, originalCR.Spec.Resources)
	totalResources, individualResources = ca.GetResourceForResponse(caResources)
	response.Resources = totalResources
	response.IndividualResources = individualResources
}

func (ca *CA) getStorage(originalCR *current.IBPCA, response *api.Response) {
	response.Storage = originalCR.Spec.Storage
}

func (ca *CA) getStatus(originalCR *current.IBPCA, response *api.Response) {
	response.CRStatus = &originalCR.Status
}

func (ca *CA) getConfig(originalCR *current.IBPCA, response *api.Response, statusCode *int) {
	configs := &current.ConfigOverride{}
	// get the ca configmap
	caConfig, err := ca.GetConfig(originalCR.Name, originalCR.Namespace, "ca")
	if err != nil {
		ca.Logger.Warnf("Error getting config for ca: %s", err)
		*statusCode = common.StatusCode500
	} else {
		caBytes, err := json.Marshal(caConfig)
		if err != nil {
			ca.Logger.Warnf("Error marshalling config for ca: %s", err)
			*statusCode = common.StatusCode500
		} else {
			caJson := json.RawMessage(caBytes)
			configs.CA = &runtime.RawExtension{Raw: caJson}
		}
	}

	// get the tlsca configmap
	tlscaConfig, err := ca.GetConfig(originalCR.Name, originalCR.Namespace, "tlsca")
	if err != nil {
		ca.Logger.Warnf("Error getting config for tlsca: %s", err)
		*statusCode = common.StatusCode500
	} else {
		tlscaBytes, err := json.Marshal(tlscaConfig)
		if err != nil {
			ca.Logger.Warnf("Error marshalling config for tlsca: %s", err)
			*statusCode = common.StatusCode500
		} else {
			tlscaJson := json.RawMessage(tlscaBytes)
			configs.TLSCA = &runtime.RawExtension{Raw: tlscaJson}
		}
	}

	response.Configs = configs
}

func (ca *CA) getEndpoints(originalCR *current.IBPCA, response *api.Response, statusCode *int) {
	connectionProfile, err := ca.GetConnectionProfile(originalCR.Name, originalCR.Namespace)
	if err != nil {
		ca.Logger.Warnf("Connection profile get error: %s", err)
		*statusCode = common.StatusCode500
	}
	if connectionProfile != nil {
		if connectionProfile.Endpoints != nil {
			response.Endpoints = connectionProfile.Endpoints
		} else {
			ca.Logger.Warnf("Connection profile is missing fields endpoints")
			*statusCode = common.StatusCode500
		}
		if connectionProfile.TLS != nil {
			response.TLS = connectionProfile.TLS
		} else {
			ca.Logger.Warnf("Connection profile is missing fields TLS")
			*statusCode = common.StatusCode500
		}
	} else {
		ca.Logger.Warnf("Connection profile is empty")
		*statusCode = common.StatusCode500
	}
}

func (ca *CA) getCrypto(originalCR *current.IBPCA, response *api.Response, statusCode *int) {
	connectionProfile, err := ca.GetConnectionProfile(originalCR.Name, originalCR.Namespace)
	if err != nil {
		ca.Logger.Warnf("Connection profile get error: %s", err)
		*statusCode = common.StatusCode500
	}
	if connectionProfile != nil {
		response.MSP = &api.MSP{}
		if connectionProfile.CA != nil {
			response.MSP.CA = connectionProfile.CA
		} else {
			ca.Logger.Warnf("Connection profile is missing fields CA")
			*statusCode = common.StatusCode500
		}
		if connectionProfile.TLSCA != nil {
			response.MSP.TLSCA = connectionProfile.TLSCA
		} else {
			ca.Logger.Warnf("Connection profile is missing fields TLSCA")
			*statusCode = common.StatusCode500
		}
	} else {
		ca.Logger.Warnf("Connection profile is empty")
		*statusCode = common.StatusCode500
	}
}

func (ca *CA) getVersion(originalCR *current.IBPCA, response *api.Response) {
	if util.IsFullFabricVersion(originalCR.Spec.FabricVersion) {
		response.Version = originalCR.Spec.FabricVersion
		return
	}

	if originalCR.Spec.Images != nil {
		specVersion := originalCR.Spec.FabricVersion
		tag := originalCR.Spec.Images.CATag
		response.Version = util.GetFullFabricVersion(specVersion, tag)
		ca.Logger.Infof("%s Spec.FabricVersion: %s, Spec.Images.CATag: %s, Full Fabric Version: %s", originalCR.Name, specVersion, tag, response.Version)
	} else {
		ca.Logger.Warnf("CA tag is missing, unable to get full fabric version")
	}

}

func (ca *CA) getReplicas(originalCR *current.IBPCA, response *api.Response) {
	if originalCR.Spec.Replicas != nil {
		response.Replicas = *originalCR.Spec.Replicas
	}
}

func (ca *CA) getHSM(originalCR *current.IBPCA, response *api.Response) {
	response.HSM = originalCR.Spec.HSM
}

func (ca *CA) getOther(originalCR *current.IBPCA, response *api.Response) {
	caName, tlscaName, _ := ca.GetCANames(originalCR.Spec)
	response.CAName = caName
	response.TLSCAName = tlscaName
	response.Region = originalCR.Spec.Region
	response.Zone = originalCR.Spec.Zone
}
