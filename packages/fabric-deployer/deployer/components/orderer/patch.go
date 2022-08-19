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
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/runtime"
)

func (o *Orderer) PatchCR(section, compName, namespace, sID string, body []byte) (*api.Response, int, error) {
	err := o.patchCR(section, compName, namespace, sID, body)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "patch err for %s", compName))
		return nil, 500, err
	}

	response, statusCode, err := o.GetCRResponse(ALL, compName, namespace, sID)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "failed to build response for %s", compName))
		return nil, statusCode, err
	}

	return response, 200, nil
}

func (o *Orderer) patchCR(section, compName, namespace, sID string, body []byte) error {
	o.Logger.Debugf("Received patch request for '%s'", compName)

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
	case RESOURCES:
		o.patchResources(originalCR, request.Resources)
	case CONFIG:
		o.patchConfig(originalCR, request.ConfigOverride)
	case CRYPTO:
		o.patchCrypto(originalCR, request.Config)
	// case ADMINCERTS:
	// TODO: Currently with out patch type strategy, patching admin certs replaces
	// all existing strings in the slice and hence pretty much works as an update
	// call. Extra logic needed for this to work as a true patch
	case NODEOU:
		o.patchNodeOU(originalCR, request.NodeOU)
	case ACTIONS:
		err = o.patchActions(originalCR, request.Actions)
		if err != nil {
			return errors.Wrap(err, "failed to patch actions")
		}
	case ALL:
		err = o.patchAll(originalCR, request)
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

	err = o.IBPOperatorClient.PatchCR(namespace, "ibporderers", compName, crBytes)
	if err != nil {
		return errors.Wrapf(err, "failed patch cr '%s' in namespace '%s'", compName, namespace)
	}

	return nil

}

func (o *Orderer) patchResources(originalCR *current.IBPOrderer, resources *current.OrdererResources) {
	if resources == nil {
		return
	}

	o.Logger.Debugf("Patching resources for '%s' to %+v", originalCR.Name, resources)
	originalCR.Spec.Resources = resources
}

func (o *Orderer) patchConfig(originalCR *current.IBPOrderer, config *runtime.RawExtension) {
	if config == nil {
		return
	}

	o.Logger.Debugf("Patching config for '%s' to %s", originalCR.Name, string(config.Raw))
	originalCR.Spec.ConfigOverride = config
}

func (o *Orderer) patchCrypto(originalCR *current.IBPOrderer, crypto *current.SecretSpec) {
	if crypto == nil {
		return
	}

	// NOTE: Not logging crypto to prevent sensitive data from being printed in logs
	originalCR.Spec.Secret = crypto
}

func (o *Orderer) patchNodeOU(originalCR *current.IBPOrderer, nodeOU *api.NodeOU) {
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

func (o *Orderer) patchActions(originalCR *current.IBPOrderer, actions *current.OrdererAction) error {
	if actions == nil {
		return nil
	}

	// Check actions we want to patch
	if actions.Enroll.Ecert && actions.Reenroll.Ecert {
		return fmt.Errorf("cannot request to enroll and re-enroll the ecert at the same time")
	}
	if actions.Enroll.TLSCert && actions.Reenroll.TLSCert {
		return fmt.Errorf("cannot request to enroll and re-enroll the TLS cert at the same time")
	}
	if actions.Reenroll.Ecert && actions.Reenroll.EcertNewKey {
		return fmt.Errorf("cannot request to re-enroll the ecert and re-enroll the ecert with a new key at the same time")
	}
	if actions.Reenroll.TLSCert && actions.Reenroll.TLSCertNewKey {
		return fmt.Errorf("cannot request to re-enroll the TLS cert and re-enroll the TLS cert with a new key at the same time")
	}

	// Check new actions against existing actions
	originalActions := originalCR.Spec.Action
	if actions.Enroll.Ecert {
		if originalActions.Reenroll.Ecert || originalActions.Reenroll.EcertNewKey {
			return fmt.Errorf("cannot request to enroll ecert when ecert re-enroll action is pending")
		}
	}
	if actions.Enroll.TLSCert {
		if originalActions.Reenroll.TLSCert || originalActions.Reenroll.TLSCertNewKey {
			return fmt.Errorf("cannot request to enroll TLS cert when TLS cert re-enroll action is pending")
		}
	}
	if actions.Reenroll.Ecert || actions.Reenroll.EcertNewKey {
		if originalActions.Enroll.Ecert {
			return fmt.Errorf("cannot request to re-enroll ecert when ecert enroll action is pending")
		}
	}
	if actions.Reenroll.TLSCert || actions.Reenroll.TLSCertNewKey {
		if originalActions.Enroll.TLSCert {
			return fmt.Errorf("cannot request to re-enroll TLS cert when TLS cert enroll action is pending")
		}
	}

	o.Logger.Debugf("Patching actions for '%s' to %+v", originalCR.Name, actions)
	originalCR.Spec.Action = *actions

	return nil
}

func (o *Orderer) patchAll(originalCR *current.IBPOrderer, request *api.UpdateRequest) error {
	o.patchResources(originalCR, request.Resources)
	o.patchConfig(originalCR, request.ConfigOverride)
	o.patchCrypto(originalCR, request.Config)
	o.patchNodeOU(originalCR, request.NodeOU)

	err := o.patchActions(originalCR, request.Actions)
	if err != nil {
		return errors.Wrap(err, "failed to patch actions")
	}

	return nil
}
