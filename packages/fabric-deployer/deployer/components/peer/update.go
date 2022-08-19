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
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/runtime"
)

func (p *Peer) UpdateCR(section, compName, namespace, sID string, body []byte) (*api.Response, int, error) {
	err := p.updateCR(section, compName, namespace, sID, body)
	if err != nil {
		p.Logger.Error(errors.Wrapf(err, "update err for %s", compName))
		return nil, 500, err
	}

	response, statusCode, err := p.GetCRResponse(ALL, compName, namespace, sID)
	if err != nil {
		p.Logger.Error(errors.Wrapf(err, "failed to build response for %s", compName))
		return nil, statusCode, err
	}

	return response, 200, nil
}

func (p *Peer) updateCR(section, compName, namespace, sID string, body []byte) error {
	p.Logger.Debugf("Received update request for '%s'", compName)

	originalCR := &current.IBPPeer{}
	err := p.IBPOperatorClient.GetCR(namespace, "ibppeers", compName, originalCR)
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
		p.updateConfig(originalCR, request.ConfigOverride)
	case CRYPTO:
		p.updateCrypto(originalCR, request.Config)
	case NODEOU:
		p.updateNodeOU(originalCR, request.NodeOU)
	case ADMINCERTS:
		err := p.updateAdminCerts(originalCR, request.AdminCerts)
		if err != nil {
			return errors.Wrap(err, "failed to update admin certs")
		}
	case VERSION:
		err := p.updateVersion(originalCR, request.Version)
		if err != nil {
			return errors.Wrap(err, "failed to update version")
		}
	case REPLICAS:
		err := p.updateReplicas(originalCR, request.Replicas)
		if err != nil {
			return errors.Wrap(err, "failed to update replicas")
		}
	case HSM:
		p.updateHSM(originalCR, request.HSM)
	case ALL:
		err := p.updateAll(originalCR, request)
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

	err = p.IBPOperatorClient.UpdateCR(namespace, "ibppeers", compName, crBytes)
	if err != nil {
		return errors.Wrapf(err, "failed update cr '%s' in namespace '%s'", compName, namespace)
	}

	return nil
}

func (p *Peer) updateConfig(originalCR *current.IBPPeer, configOverride *runtime.RawExtension) {
	if configOverride == nil {
		return
	}

	p.Logger.Debugf("Updating config override for %s", originalCR.Name)
	originalCR.Spec.ConfigOverride = configOverride
}

func (p *Peer) updateCrypto(originalCR *current.IBPPeer, cryptoConfig *current.SecretSpec) {
	if cryptoConfig == nil {
		return
	}

	p.Logger.Debugf("Updating crypto for %s", originalCR.Name)
	originalCR.Spec.Secret = cryptoConfig
}

func (p *Peer) updateAdminCerts(originalCR *current.IBPPeer, adminCerts []string) error {
	if adminCerts == nil || len(adminCerts) == 0 {
		return nil
	}

	if originalCR.Spec.Secret == nil {
		return fmt.Errorf("secret spec doesn't exist for %s", originalCR.Name)
	}

	if originalCR.Spec.Secret.Enrollment != nil && originalCR.Spec.Secret.Enrollment.Component != nil {
		p.Logger.Debugf("Updating admin certs for enrollment section of %s", originalCR.Name)
		originalCR.Spec.Secret.Enrollment.Component.AdminCerts = adminCerts
	}
	if originalCR.Spec.Secret.MSP != nil && originalCR.Spec.Secret.MSP.Component != nil {
		p.Logger.Debugf("Update admin certs for msp section of %s", originalCR.Name)
		originalCR.Spec.Secret.MSP.Component.AdminCerts = adminCerts
	}

	return nil
}

func (p *Peer) updateVersion(originalCR *current.IBPPeer, version string) error {
	if version == "" {
		return nil
	}

	if !util.IsValidVersion("peer", version, p.Config.Versions) {
		p.Logger.Error("Version not valid")
		return errors.New("version not valid")
	}

	image := p.Config.Versions.Peer[version].Image
	if &image != nil {
		originalCR.Spec.Images = p.Images(version)
	}

	originalCR.Spec.FabricVersion = version

	return nil
}

func (p *Peer) updateReplicas(originalCR *current.IBPPeer, replicas *int32) error {
	if replicas == nil {
		return nil
	}

	if *replicas < 0 || *replicas > 1 {
		return errors.New("replicas not valid, expecting 0 or 1")
	}

	originalCR.Spec.Replicas = replicas
	return nil
}

func (p *Peer) updateHSM(originalCR *current.IBPPeer, hsm *current.HSM) {
	if hsm == nil || hsm.PKCS11Endpoint == "" {
		return
	}

	p.Logger.Debugf("Updating hsm section for %s", originalCR.Name)
	originalCR.Spec.HSM = hsm
}

func (p *Peer) updateNodeOU(originalCR *current.IBPPeer, nodeOU *api.NodeOU) {
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

func (p *Peer) updateAll(originalCR *current.IBPPeer, request *api.UpdateRequest) error {
	p.updateConfig(originalCR, request.ConfigOverride)
	p.updateCrypto(originalCR, request.Config)
	p.updateNodeOU(originalCR, request.NodeOU)

	if request.Config == nil {
		// Only update admin certs if whole secret config was not updated
		err := p.updateAdminCerts(originalCR, request.AdminCerts)
		if err != nil {
			return errors.Wrap(err, "failed to update admin certs")
		}
	}

	err := p.updateVersion(originalCR, request.Version)
	if err != nil {
		return errors.Wrap(err, "failed to update version")
	}

	err = p.updateReplicas(originalCR, request.Replicas)
	if err != nil {
		return errors.Wrap(err, "failed to update replicas")
	}

	p.updateHSM(originalCR, request.HSM)

	return nil
}
