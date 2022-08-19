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
	"errors"

	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// Supported actions for Operator-related requests
const (
	HSMCONFIG = "hsmconfig"
	ALL       = "all"
)

//go:generate counterfeiter -o mocks/kube.go -fake-name Kube . Kube

type Kube interface {
	GetService(namespace, name string) (*corev1.Service, error)
	GetConfigMap(namespace, name string) (*corev1.ConfigMap, error)
	GetPort(namespace, name string) (int32, error)
	GetPorts(namespace, name string) ([]corev1.ServicePort, error)
}

//go:generate counterfeiter -o mocks/ibp_client.go -fake-name IBPOperatorClient . IBPOperatorClient

type IBPOperatorClient interface {
	GetCR(namespace string, kind string, name string, cr runtime.Object) error
	GetAllCR(namespace string, kind string, crlist runtime.Object) error
	CreateCR(namespace string, kind string, cr interface{}) error
	DeleteCR(namespace string, kind string, name string) error
	UpdateCR(namespace string, kind string, name string, bytes []byte) error
	PatchCR(namespace string, kind string, name string, bytes []byte) error
}

type Operator struct {
	Kube   Kube
	Logger *zap.SugaredLogger
}

func New(logger *zap.Logger, k8sClient Kube) *Operator {
	return &Operator{
		Kube:   k8sClient,
		Logger: logger.Sugar().Named("Operator"),
	}
}

func (o *Operator) GetHSMConfig(namespace string) (interface{}, error) {
	cmName := "ibp-hsm-config"
	cm, err := o.Kube.GetConfigMap(namespace, cmName)
	if err != nil {
		return nil, err
	}
	data := cm.Data["ibp-hsm-config.yaml"]
	if data == "" {
		return nil, errors.New("ibp-hsm-config.yaml not found in configmap")
	}

	return data, nil
}
