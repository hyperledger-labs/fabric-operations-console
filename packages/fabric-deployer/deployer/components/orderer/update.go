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
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/runtime"
)

func (o *Orderer) UpdateCR(section, compName, namespace, sID string, body []byte) (*api.Response, int, error) {
	err := o.updateCR(section, compName, namespace, sID, body)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "update err for %s", compName))
		return nil, 500, err
	}

	response, statusCode, err := o.GetCRResponse(ALL, compName, namespace, sID)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "failed to build response for %s", compName))
		return nil, statusCode, err
	}

	return response, 200, nil
}

func (o *Orderer) updateCR(section, compName, namespace, sID string, body []byte) error {
	o.Logger.Debugf("Received update request for '%s'", compName)

	originalCR := &current.IBPOrderer{}
	err := o.IBPOperatorClient.GetCR(namespace, "ibporderers", compName, originalCR)
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
		o.updateConfig(originalCR, request.ConfigOverride)
	case CRYPTO:
		o.updateCrypto(originalCR, request.Config)
	case ADMINCERTS:
		err := o.updateAdminCerts(originalCR, request.AdminCerts)
		if err != nil {
			return errors.Wrap(err, "failed to update admin certs")
		}
	case NODEOU:
		o.updateNodeOU(originalCR, request.NodeOU)
	case VERSION:
		err := o.updateVersion(originalCR, request.Version)
		if err != nil {
			return errors.Wrap(err, "failed to update version")
		}
	case REPLICAS:
		err := o.updateReplicas(originalCR, request.Replicas)
		if err != nil {
			return errors.Wrap(err, "failed to update replicas")
		}
	case GENESIS:
		o.updateGenesisBlock(originalCR, request.Genesis)
	case HSM:
		o.updateHSM(originalCR, request.HSM)
	case ALL:
		err := o.updateAll(originalCR, request)
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

	err = o.IBPOperatorClient.UpdateCR(namespace, "ibporderers", compName, crBytes)
	if err != nil {
		return errors.Wrapf(err, "failed update cr '%s' in namespace '%s'", compName, namespace)
	}

	return nil
}

func (o *Orderer) updateConfig(originalCR *current.IBPOrderer, configOverride *runtime.RawExtension) {
	if configOverride == nil {
		return
	}

	o.Logger.Debugf("Updating config override for %s", originalCR.Name)
	originalCR.Spec.ConfigOverride = configOverride
}

func (o *Orderer) updateCrypto(originalCR *current.IBPOrderer, cryptoConfig *current.SecretSpec) {
	if cryptoConfig == nil {
		return
	}

	o.Logger.Debugf("Updating crypto for %s", originalCR.Name)
	originalCR.Spec.Secret = cryptoConfig
}

func (o *Orderer) updateAdminCerts(originalCR *current.IBPOrderer, adminCerts []string) error {
	if adminCerts == nil || len(adminCerts) == 0 {
		return nil
	}

	if originalCR.Spec.Secret == nil {
		return fmt.Errorf("secret spec doesn't exist for %s", originalCR.Name)
	}

	if originalCR.Spec.Secret.Enrollment != nil && originalCR.Spec.Secret.Enrollment.Component != nil {
		o.Logger.Debugf("Updating admin certs for enrollment section of %s", originalCR.Name)
		originalCR.Spec.Secret.Enrollment.Component.AdminCerts = adminCerts
	}
	if originalCR.Spec.Secret.MSP != nil && originalCR.Spec.Secret.MSP.Component != nil {
		o.Logger.Debugf("Update admin certs for msp section of %s", originalCR.Name)
		originalCR.Spec.Secret.MSP.Component.AdminCerts = adminCerts
	}

	return nil
}

func (o *Orderer) updateVersion(originalCR *current.IBPOrderer, version string) error {
	if version == "" {
		return nil
	}

	if !util.IsValidVersion("orderer", version, o.Config.Versions) {
		o.Logger.Error("Version not valid")
		return errors.New("version not valid")
	}

	image := o.Config.Versions.Orderer[version].Image
	if &image != nil {
		originalCR.Spec.Images = o.Images(version)
	}

	originalCR.Spec.FabricVersion = version

	return nil
}

func (o *Orderer) updateReplicas(originalCR *current.IBPOrderer, replicas *int32) error {
	if replicas == nil {
		return nil
	}

	if *replicas < 0 || *replicas > 1 {
		return errors.New("replicas not valid, expecting 0 or 1")
	}

	originalCR.Spec.Replicas = replicas
	return nil
}

func (o *Orderer) updateGenesisBlock(originalCR *current.IBPOrderer, genesis *api.GenesisSpec) {
	if genesis == nil || genesis.Block == "" || len(genesis.Block) == 0 {
		return
	}

	originalCR.Spec.GenesisBlock = genesis.Block
	boolFalse := false
	originalCR.Spec.IsPrecreate = &boolFalse
}

func (o *Orderer) updateHSM(originalCR *current.IBPOrderer, hsm *current.HSM) {
	if hsm == nil || hsm.PKCS11Endpoint == "" {
		return
	}

	originalCR.Spec.HSM = hsm
}

func (o *Orderer) updateNodeOU(originalCR *current.IBPOrderer, nodeOU *api.NodeOU) {
	if nodeOU == nil || nodeOU.Enabled == nil {
		return
	}

	if *nodeOU.Enabled {
		f := false
		originalCR.Spec.DisableNodeOU = &f
	} else {
		t := true
		originalCR.Spec.DisableNodeOU = &t
	}
}

func (o *Orderer) updateAll(originalCR *current.IBPOrderer, request *api.UpdateRequest) error {
	o.updateConfig(originalCR, request.ConfigOverride)
	o.updateCrypto(originalCR, request.Config)
	o.updateNodeOU(originalCR, request.NodeOU)

	if request.Config == nil {
		// Only update admin certs if whole secret config was not updated
		err := o.updateAdminCerts(originalCR, request.AdminCerts)
		if err != nil {
			return errors.Wrap(err, "failed to update admin certs")
		}
	}

	err := o.updateVersion(originalCR, request.Version)
	if err != nil {
		return errors.Wrap(err, "failed to update version")
	}

	err = o.updateReplicas(originalCR, request.Replicas)
	if err != nil {
		return errors.Wrap(err, "failed to update replicas")
	}

	o.updateGenesisBlock(originalCR, request.Genesis)
	o.updateHSM(originalCR, request.HSM)

	return nil
}
