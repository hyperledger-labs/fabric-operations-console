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

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/pkg/errors"
	"go.uber.org/zap"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	cfg "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/mocks"
	v1ca "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
)

var _ = Describe("Patch API", func() {
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
		cfg := &config.DeployerSettingsConfig{
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
				CA:      map[string]cfg.VersionCA{"1.4.1": cfg.VersionCA{Default: true}},
				Peer:    map[string]cfg.VersionPeer{"1.4.1": cfg.VersionPeer{Default: true}},
				Orderer: map[string]cfg.VersionOrderer{"1.4.1": cfg.VersionOrderer{Default: true}},
			},
			Timeouts: &cfg.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
			CRN:              &config.CRN{},
		}

		caComp = &ca.CA{
			Logger:            logger.Sugar().Named("CA"),
			Kube:              kube,
			IBPOperatorClient: client,
			Config:            cfg,
		}
	})

	Context("patch CA CR", func() {
		var (
			body []byte
			err  error
		)

		Context("patch", func() {
			It("returns an error if unable to find component", func() {
				client.GetCRReturns(errors.New("not found"))
				_, _, err := caComp.PatchCR(ca.ACTIONS, "ca1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("not found")))
			})

			It("returns an error if unable to patch component", func() {
				client.PatchCRReturns(errors.New("patch failed"))
				_, _, err := caComp.PatchCR(ca.ACTIONS, "ca1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("patch failed")))
			})
		})

		Context("actions", func() {
			BeforeEach(func() {
				request := &api.UpdateRequest{
					Actions: &current.CAAction{
						Restart: true,
						Renew: current.Renew{
							TLSCert: true,
						},
					},
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs patch", func() {
				_, code, err := caComp.PatchCR(ca.ACTIONS, "ca1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPCA{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.Action.Restart).To(Equal(true))
					Expect(cr.Spec.Action.Renew.TLSCert).To(Equal(true))
				})
			})
		})

		Context("resources", func() {
			BeforeEach(func() {
				request := &api.UpdateRequest{
					Resources: &current.CAResources{
						Init: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
						},
						CA: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("2"),
								corev1.ResourceMemory: resource.MustParse("2Mi"),
							},
						},
					},
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs patch", func() {
				_, code, err := caComp.PatchCR(ca.RESOURCES, "ca1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPCA{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(*cr.Spec.Resources).To(Equal(current.CAResources{
						Init: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
						},
						CA: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("2"),
								corev1.ResourceMemory: resource.MustParse("2Mi"),
							},
						},
					}))
				})
			})
		})

		Context("config", func() {
			BeforeEach(func() {
				config := &v1ca.ServerConfig{
					CAConfig: v1ca.CAConfig{
						CA: v1ca.CAInfo{
							Name: "ca1",
						},
					},
				}

				configBytes, err := json.Marshal(config)
				Expect(err).NotTo(HaveOccurred())

				request := &api.UpdateRequest{
					ConfigOverride: &current.ConfigOverride{
						CA: &runtime.RawExtension{Raw: configBytes},
					},
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs patch", func() {
				_, code, err := caComp.PatchCR(ca.CONFIG, "ca1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPCA{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					config := &v1ca.ServerConfig{}
					err = json.Unmarshal(cr.Spec.ConfigOverride.CA.Raw, config)
					Expect(err).NotTo(HaveOccurred())

					Expect(config.CAConfig.CA.Name).To(Equal("ca1"))
				})
			})
		})
	})
})
