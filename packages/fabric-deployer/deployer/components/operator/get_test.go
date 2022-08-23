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

package operator_test

import (
	"encoding/json"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/pkg/errors"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/operator"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/operator/mocks"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"go.uber.org/zap"
)

var _ = Describe("Get API", func() {

	var (
		err          error
		testOperator *operator.Operator
		mockKube     *mocks.Kube
		logger       *zap.Logger
	)

	BeforeEach(func() {
		logger, err = zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		mockKube = &mocks.Kube{}

		testOperator = operator.New(logger, mockKube)

		mockKube.GetConfigMapStub = func(namespace, name string) (*corev1.ConfigMap, error) {
			type hsm struct {
				Type    string
				Version string
			}
			config := &hsm{
				Type:    "hsm",
				Version: "v1",
			}
			configBytes, _ := json.Marshal(config)
			cm := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: namespace,
				},
				Data: map[string]string{"ibp-hsm-config.yaml": string(configBytes)},
			}
			return cm, nil
		}
	})

	Context("get HSM config", func() {
		It("returns 404 status code if config map not found", func() {
			mockKube.GetConfigMapReturns(nil, k8serrors.NewNotFound(schema.GroupResource{}, "not found"))
			_, code, err := testOperator.Get(operator.HSMCONFIG, "namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(404))
		})

		It("returns 500 status code if error in getting or reading config map", func() {
			mockKube.GetConfigMapReturns(nil, errors.New("get error"))
			_, code, err := testOperator.Get(operator.HSMCONFIG, "namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(500))
		})

		It("performs get", func() {
			resp, code, err := testOperator.Get(operator.HSMCONFIG, "namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(200))
			Expect(resp.HSMConfig).NotTo(Equal(nil))
		})
	})

})
