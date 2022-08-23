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

package ca_test

import (
	"bytes"
	"encoding/json"
	"net/http"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	v1 "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("Update APIs", func() {
	Context("config", func() {
		BeforeEach(func() {
			createCAReq := &api.CreateRequest{
				Zone:   "dal1",
				Region: "us-south",
			}
			body, err := json.Marshal(createCAReq)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPost, "http://localhost:8080/api/v2/instance/testsid/type/ca/component/ca1", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			Eventually(func() bool {
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", &current.IBPCA{})
				if err == nil {
					return true
				}
				return false
			}).Should(Equal(true))
		})

		It("udpates config", func() {
			caConfig := &v1.ServerConfig{
				CAConfig: v1.CAConfig{
					CA: v1.CAInfo{
						Name: "newca",
					},
				},
			}
			caBytes, err := json.Marshal(caConfig)
			Expect(err).NotTo(HaveOccurred())

			request := &api.UpdateRequest{
				ConfigOverride: &current.ConfigOverride{
					CA:    &runtime.RawExtension{Raw: caBytes},
					TLSCA: nil,
				},
			}
			body, err := json.Marshal(request)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPut, "http://localhost:8080/api/v3/instance/testsid/type/ca/component/ca1/config", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			By("replacing spec.ConfigOverrides", func() {
				Eventually(func() *current.ConfigOverride {
					ibpca := &current.IBPCA{}
					err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
					if err != nil {
						return &current.ConfigOverride{}
					}
					return ibpca.Spec.ConfigOverride
				}).Should(Equal(&current.ConfigOverride{
					CA:    &runtime.RawExtension{Raw: caBytes},
					TLSCA: nil,
				}))

				By("keeping original values", func() {
					ibpca := &current.IBPCA{}
					err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
					Expect(err).NotTo(HaveOccurred())

					Expect(ibpca.Spec.Zone).To(Equal("dal1"))
					Expect(ibpca.Spec.Region).To(Equal("us-south"))
				})
			})
		})
	})
})
