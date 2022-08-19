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
	"encoding/json"
	"reflect"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"

	cfg "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/mocks"
	ibpca "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("Update API", func() {
	var (
		caComp *ca.CA
		kube   *mocks.Kube
		client *mocks.IBPOperatorClient
	)

	BeforeEach(func() {
		kube = &mocks.Kube{}
		client = &mocks.IBPOperatorClient{}

		kube.GetConfigMapReturns(&corev1.ConfigMap{
			BinaryData: map[string][]byte{
				"profile.json": []byte{},
			},
		}, nil)

		logger, err := zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		res := map[corev1.ResourceName]resource.Quantity{}
		res[corev1.ResourceCPU] = resource.MustParse("1")
		res[corev1.ResourceMemory] = resource.MustParse("1Mi")
		cfg := &cfg.DeployerSettingsConfig{
			Defaults: &cfg.DeployerDefaults{
				Storage: &cfg.Storage{
					CA: &current.CAStorages{
						CA: &current.StorageSpec{
							Size:  "1Gi",
							Class: "default",
						},
					},
				},
				Resources: &cfg.Resources{
					CA: &current.CAResources{
						CA: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						Init: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
					},
				},
			},
			ServiceConfig: cfg.ServiceConfig{
				Type: corev1.ServiceTypeNodePort,
			},
			Versions: &cfg.Versions{
				CA:      map[string]cfg.VersionCA{"1.4.1-1": cfg.VersionCA{Default: true, Image: cfg.CAImages{}}},
				Peer:    map[string]cfg.VersionPeer{"1.4.1-1": cfg.VersionPeer{Default: true}},
				Orderer: map[string]cfg.VersionOrderer{"1.4.1-1": cfg.VersionOrderer{Default: true}},
			},
			Timeouts: &cfg.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
			CRN:              &cfg.CRN{},
		}

		caComp = &ca.CA{
			Logger:            logger.Sugar().Named("CA"),
			Kube:              kube,
			IBPOperatorClient: client,
			Config:            cfg,
		}
	})

	Context("update CA CR", func() {
		var (
			body []byte
			err  error
		)

		BeforeEach(func() {
			caConfig := &ibpca.ServerConfig{}
			caBytes, err := json.Marshal(caConfig)
			Expect(err).NotTo(HaveOccurred())

			replicas := int32(2)
			request := &api.UpdateRequest{
				ConfigOverride: &current.ConfigOverride{
					CA:    &runtime.RawExtension{Raw: caBytes},
					TLSCA: nil,
				},
				Version:  "1.4.1-1",
				Replicas: &replicas,
			}
			body, err = json.Marshal(request)
			Expect(err).NotTo(HaveOccurred())
		})

		Context("config", func() {
			It("returns an error if unable to find component", func() {
				client.GetCRReturns(errors.New("not found"))
				_, _, err := caComp.UpdateCR(ca.CONFIG, "ca1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("not found")))
			})

			It("returns an error if unable to update component", func() {
				client.UpdateCRReturns(errors.New("update failed"))
				_, _, err := caComp.UpdateCR(ca.CONFIG, "ca1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("update failed")))
			})

			It("performs update", func() {
				_, code, err := caComp.UpdateCR(ca.CONFIG, "ca1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPCA{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())
					caConfig := &ibpca.ServerConfig{}
					caBytes, _ := json.Marshal(caConfig)
					Expect(reflect.DeepEqual(cr.Spec.ConfigOverride.CA.Raw, caBytes)).To(Equal(true))
				})
			})
		})

		Context("version", func() {
			It("returns error if invalid version passed", func() {
				request := &api.UpdateRequest{
					Version: "1.4.0",
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, _, err := caComp.UpdateCR(ca.VERSION, "ca1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("version not valid")))
			})

			It("performs update", func() {
				_, code, err := caComp.UpdateCR(ca.VERSION, "ca1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPCA{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.FabricVersion).To(Equal("1.4.1-1"))
					Expect(cr.Spec.Images).To(Equal(&current.CAImages{}))
				})
			})
		})

		Context("replicas", func() {
			BeforeEach(func() {
				caConfig := &ibpca.ServerConfig{
					CAConfig: ibpca.CAConfig{
						DB: &ibpca.CAConfigDB{
							Type:       "postgres",
							Datasource: "fake",
						},
					},
				}
				caBytes, err := json.Marshal(caConfig)
				Expect(err).NotTo(HaveOccurred())

				configOverride := &current.ConfigOverride{
					CA:    &runtime.RawExtension{Raw: caBytes},
					TLSCA: &runtime.RawExtension{Raw: caBytes},
				}

				client.GetCRStub = func(namespace string, kind string, name string, caCR runtime.Object) error {
					c := caCR.(*current.IBPCA)
					c.Spec = current.IBPCASpec{
						ConfigOverride: configOverride,
					}
					return nil
				}
			})

			It("returns error if check replicas fails", func() {
				client.GetCRStub = func(namespace string, kind string, name string, caCR runtime.Object) error {
					c := caCR.(*current.IBPCA)
					c.Spec = current.IBPCASpec{}
					return nil
				}

				_, _, err := caComp.UpdateCR(ca.REPLICAS, "ca1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("failed to update replicas: CA & TLSCA config override should be passed to allow replicas > 1"))
			})

			It("updates replicas", func() {
				_, code, err := caComp.UpdateCR(ca.REPLICAS, "ca1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPCA{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(*cr.Spec.Replicas).To(Equal(int32(2)))
				})
			})
		})

		Context("hsm", func() {
			It("performs update", func() {
				request := &api.UpdateRequest{
					HSM: &current.HSM{
						PKCS11Endpoint: "test:1234",
					},
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, code, err := caComp.UpdateCR(ca.HSM, "ca1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPCA{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.HSM).NotTo(BeNil())
					Expect(cr.Spec.HSM.PKCS11Endpoint).To(Equal("test:1234"))
				})
			})
		})
	})
})
