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

package operator

import (
	"net/http"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/operator/api"
	"github.com/pkg/errors"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

func (o *Operator) Get(section, namespace string) (*api.Response, int, error) {
	response, statusCode, err := o.getResponse(section, namespace)
	if err != nil {
		o.Logger.Error(errors.Wrap(err, "get err for operator"))
		return nil, 500, err
	}

	return response, statusCode, nil
}
func (o *Operator) getResponse(section, namespace string) (*api.Response, int, error) {
	statusCodeInt := 200
	statusCode := &statusCodeInt
	response := &api.Response{}

	switch section {
	case HSMCONFIG:
		o.getHSMConfig(namespace, response, statusCode)
	default:
		return nil, http.StatusBadRequest, errors.Errorf("section %s not supported: %d", section, http.StatusBadRequest)
	}

	return response, *statusCode, nil
}

func (o *Operator) getHSMConfig(namespace string, response *api.Response, statusCode *int) {
	o.Logger.Debugf("Received request to get hsm config in namespace %s", namespace)

	hsmConfig, err := o.GetHSMConfig(namespace)
	if err != nil {
		o.Logger.Warnf("Error getting hsm config for namespace: %s", namespace)
		if k8serrors.IsNotFound(err) {
			*statusCode = common.StatusCode404
		} else {
			*statusCode = common.StatusCode500
		}
	} else {
		response.HSMConfig = hsmConfig
	}
}
