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
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
)

func (ca *CA) PatchCR(section, compName, namespace, sID string, body []byte) (*api.Response, int, error) {
	err := ca.patchCR(section, compName, namespace, sID, body)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "patch err for %s", compName))
		return nil, 500, err
	}

	response, statusCode, err := ca.GetCRResponse(ALL, compName, namespace, sID)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "failed to build response for %s", compName))
		return nil, statusCode, err
	}

	return response, 200, nil
}

func (ca *CA) patchCR(section, compName, namespace, sID string, body []byte) error {
	ca.Logger.Debugf("Received patch request for '%s'", compName)

	originalCR := &current.IBPCA{}
	err := ca.IBPOperatorClient.GetCR(namespace, "ibpcas", compName, originalCR)
	if err != nil {
		return errors.Wrapf(err, "failed to get cr for '%s' in namespace '%s'", compName, namespace)
	}

	request := &api.UpdateRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			return errors.Wrapf(err, "failed to unmarshal, invalid request")
		}
	}

	switch section {
	case RESOURCES:
		ca.patchResources(originalCR, request.Resources)
	case CONFIG:
		ca.patchConfig(originalCR, request.ConfigOverride)
	case ACTIONS:
		ca.patchActions(originalCR, request.Actions)
	case ALL:
		ca.patchAll(originalCR, request)
	default:
		return errors.Errorf("section %s not supported: %d", section, http.StatusBadRequest)
	}

	crBytes, err := json.Marshal(originalCR)
	if err != nil {
		return errors.Wrapf(err, "failed to marshal, invalid request")
	}

	err = ca.IBPOperatorClient.PatchCR(namespace, "ibpcas", compName, crBytes)
	if err != nil {
		return errors.Wrapf(err, "failed patch cr '%s' in namespace '%s'", compName, namespace)
	}

	return nil

}

func (ca *CA) patchResources(originalCR *current.IBPCA, resources *current.CAResources) {
	if resources == nil {
		return
	}

	ca.Logger.Debugf("Patching resources for '%s' to %+v", originalCR.Name, resources)
	originalCR.Spec.Resources = resources
}

func (ca *CA) patchConfig(originalCR *current.IBPCA, config *current.ConfigOverride) {
	if config == nil {
		return
	}

	if config.CA != nil {
		ca.Logger.Debugf("Patching CA config for '%s' to %s", originalCR.Name, string(config.CA.Raw))
	}

	if config.TLSCA != nil {
		ca.Logger.Debugf("Patching TLS CA config for '%s' to %s", originalCR.Name, string(config.TLSCA.Raw))
	}

	originalCR.Spec.ConfigOverride = config
}

func (ca *CA) patchActions(originalCR *current.IBPCA, actions *current.CAAction) {
	if actions == nil {
		return
	}

	ca.Logger.Debugf("Patching actions for '%s' to %+v", originalCR.Name, actions)
	originalCR.Spec.Action = *actions
}

func (ca *CA) patchAll(originalCR *current.IBPCA, req *api.UpdateRequest) {
	ca.patchResources(originalCR, req.Resources)
	ca.patchConfig(originalCR, req.ConfigOverride)
	ca.patchActions(originalCR, req.Actions)
}
