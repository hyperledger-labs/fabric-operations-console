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
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
)

func (ca *CA) UpdateCR(section, compName, namespace, sID string, body []byte) (*api.Response, int, error) {
	err := ca.updateCR(section, compName, namespace, sID, body)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "update err for %s", compName))
		return nil, 500, err
	}

	response, statusCode, err := ca.GetCRResponse(ALL, compName, namespace, sID)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "failed to build response for %s", compName))
		return nil, statusCode, err
	}

	return response, 200, nil
}

func (ca *CA) updateCR(section, compName, namespace, sID string, body []byte) error {
	ca.Logger.Debugf("Received update request for '%s'", compName)

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
	case CONFIG:
		ca.updateConfig(originalCR, request.ConfigOverride)
	case VERSION:
		err := ca.updateVersion(originalCR, request.Version)
		if err != nil {
			return errors.Wrap(err, "failed to update version")
		}
	case REPLICAS:
		err := ca.updateReplicas(originalCR, request.Replicas)
		if err != nil {
			return errors.Wrap(err, "failed to update replicas")
		}
	case HSM:
		ca.updateHSM(originalCR, request.HSM)
	case ALL:
		err := ca.updateAll(originalCR, request)
		if err != nil {
			return err
		}
	default:
		return errors.Errorf("section %s not supported: %d", section, http.StatusBadRequest)
	}

	crBytes, err := json.Marshal(originalCR)
	if err != nil {
		return errors.Wrapf(err, "failed to marshal, invalid request")
	}

	err = ca.IBPOperatorClient.UpdateCR(namespace, "ibpcas", compName, crBytes)
	if err != nil {
		return errors.Wrapf(err, "failed update cr '%s' in namespace '%s'", compName, namespace)
	}

	return nil
}

func (ca *CA) updateConfig(originalCR *current.IBPCA, config *current.ConfigOverride) {
	if config == nil {
		return
	}

	ca.Logger.Debugf("Updating config override for %s", originalCR.Name)
	originalCR.Spec.ConfigOverride = config
}

func (ca *CA) updateVersion(originalCR *current.IBPCA, version string) error {
	if version == "" {
		return nil
	}

	if !util.IsValidVersion("ca", version, ca.Config.Versions) {
		ca.Logger.Error("Version not valid")
		return errors.New("version not valid")
	}

	image := ca.Config.Versions.CA[version].Image
	if &image != nil {
		originalCR.Spec.Images = ca.Images(version)
	}

	originalCR.Spec.FabricVersion = version
	return nil
}

func (ca *CA) updateReplicas(originalCR *current.IBPCA, replicas *int32) error {
	err := ca.CheckReplicas(replicas, originalCR.Spec.ConfigOverride)
	if err != nil {
		return err
	}

	originalCR.Spec.Replicas = replicas

	return nil
}

func (ca *CA) updateHSM(originalCR *current.IBPCA, hsm *current.HSM) {
	if hsm == nil || hsm.PKCS11Endpoint == "" {
		return
	}

	ca.Logger.Debugf("Updating hsm section for %s", originalCR.Name)
	originalCR.Spec.HSM = hsm
}

func (ca *CA) updateAll(originalCR *current.IBPCA, request *api.UpdateRequest) error {
	ca.updateConfig(originalCR, request.ConfigOverride)
	err := ca.updateVersion(originalCR, request.Version)
	if err != nil {
		return err
	}
	err = ca.updateReplicas(originalCR, request.Replicas)
	if err != nil {
		return errors.Wrap(err, "failed to udpate replicas")
	}

	ca.updateHSM(originalCR, request.HSM)

	return nil
}
