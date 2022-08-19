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

package orderer_test

import (
	"encoding/json"
	"testing"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/pkg/errors"
	"go.uber.org/zap/zaptest"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	cfg "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/mocks"
	v2orderer "github.com/IBM-Blockchain/fabric-operator/api/orderer/v2"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("Update API", func() {
	var (
		ordererComp *orderer.Orderer
		kube        *mocks.Kube
		client      *mocks.IBPOperatorClient
	)

	BeforeEach(func() {
		kube = &mocks.Kube{}
		client = &mocks.IBPOperatorClient{}

		kube.GetConfigMapReturns(&corev1.ConfigMap{
			BinaryData: map[string][]byte{
				"profile.json": []byte{},
			},
		}, nil)

		logger := zaptest.NewLogger(&testing.T{})

		res := map[corev1.ResourceName]resource.Quantity{}
		res[corev1.ResourceCPU] = resource.MustParse("1")
		res[corev1.ResourceMemory] = resource.MustParse("1Mi")
		cfg := &config.DeployerSettingsConfig{
			Defaults: &cfg.DeployerDefaults{
				Storage: &cfg.Storage{
					Orderer: &current.OrdererStorages{
						Orderer: &current.StorageSpec{
							Size:  "1Gi",
							Class: "default",
						},
					},
				},
				Resources: &cfg.Resources{
					Orderer: &current.OrdererResources{
						Orderer: &corev1.ResourceRequirements{
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
				Orderer: map[string]cfg.VersionOrderer{"1.4.1-1": cfg.VersionOrderer{Default: true, Image: cfg.OrdererImages{}}},
			},
			Timeouts: &cfg.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
			CRN:              &config.CRN{},
		}

		client.GetCRStub = func(namespace string, kind string, name string, ordererCR runtime.Object) error {
			p := ordererCR.(*current.IBPOrderer)
			p.Spec = current.IBPOrdererSpec{
				Resources: cfg.Defaults.Resources.Orderer,
				Storage:   cfg.Defaults.Storage.Orderer,
				Secret: &current.SecretSpec{
					Enrollment: &current.EnrollmentSpec{
						Component: &current.Enrollment{
							AdminCerts: []string{"admincert"},
						},
					},
				},
			}
			return nil
		}

		ordererComp = &orderer.Orderer{
			Logger:            logger.Sugar().Named("Orderer"),
			Kube:              kube,
			IBPOperatorClient: client,
			Config:            cfg,
		}
	})

	Context("update Orderer CR", func() {
		var (
			body []byte
			err  error
		)

		Context("update", func() {
			It("returns an error if unable to find component", func() {
				client.GetCRReturns(errors.New("not found"))
				_, _, err := ordererComp.UpdateCR(orderer.CONFIG, "orderer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("not found")))
			})

			It("returns an error if unable to update component", func() {
				client.UpdateCRReturns(errors.New("update failed"))
				_, _, err := ordererComp.UpdateCR(orderer.CONFIG, "orderer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("update failed")))
			})
		})

		Context("config", func() {
			BeforeEach(func() {
				config := &v2orderer.Orderer{
					General: v2orderer.General{
						LocalMSPID: "mspid2",
					},
				}

				configBytes, err := json.Marshal(config)
				Expect(err).NotTo(HaveOccurred())

				request := &api.UpdateRequest{
					ConfigOverride: &runtime.RawExtension{Raw: configBytes},
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs update", func() {
				_, code, err := ordererComp.UpdateCR(orderer.CONFIG, "orderer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPOrderer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					config := &v2orderer.Orderer{}
					err = json.Unmarshal(cr.Spec.ConfigOverride.Raw, config)
					Expect(err).NotTo(HaveOccurred())

					Expect(config.General.LocalMSPID).To(Equal("mspid2"))
				})
			})
		})

		Context("crypto", func() {
			BeforeEach(func() {
				secret := &current.SecretSpec{
					Enrollment: &current.EnrollmentSpec{
						Component: &current.Enrollment{
							EnrollID:     "id2",
							EnrollSecret: "secret2",
						},
					},
					MSP: &current.MSPSpec{
						TLS: &current.MSP{
							SignCerts: "signcert2",
							KeyStore:  "keystore2",
						},
					},
				}

				request := &api.UpdateRequest{
					Config: secret,
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs update", func() {
				_, code, err := ordererComp.UpdateCR(orderer.CRYPTO, "orderer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPOrderer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.Secret.Enrollment.Component.EnrollID).To(Equal("id2"))
					Expect(cr.Spec.Secret.MSP.TLS.SignCerts).To(Equal("signcert2"))
					Expect(cr.Spec.Secret.Enrollment.Component.AdminCerts).To(BeNil())
				})

			})
		})

		Context("admin certs", func() {
			BeforeEach(func() {
				request := &api.UpdateRequest{
					AdminCerts: []string{"admincert1", "admincert2"},
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})
			It("returns error if secret spec doesn't exist in cr", func() {
				client.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
					o := peerCR.(*current.IBPOrderer)
					o.Spec = current.IBPOrdererSpec{}
					o.Name = "orderer1"
					return nil
				}
				_, code, err := ordererComp.UpdateCR(orderer.ADMINCERTS, "orderer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(ContainSubstring("secret spec doesn't exist for orderer1"))
				Expect(code).To(Equal(500))
			})

			It("performs update", func() {
				_, code, err := ordererComp.UpdateCR(orderer.ADMINCERTS, "orderer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPOrderer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.Secret).To(Equal(&current.SecretSpec{
						Enrollment: &current.EnrollmentSpec{
							Component: &current.Enrollment{
								AdminCerts: []string{"admincert1", "admincert2"},
							},
						},
					}))
				})
			})
		})

		Context("version", func() {
			BeforeEach(func() {
				request := &api.UpdateRequest{
					Version: "1.4.1-1",
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("returns error if invalid version passed", func() {
				request := &api.UpdateRequest{
					Version: "1.4.0",
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, _, err := ordererComp.UpdateCR(orderer.VERSION, "orderer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("version not valid")))
			})

			It("performs update", func() {
				_, code, err := ordererComp.UpdateCR(orderer.VERSION, "orderer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPOrderer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.FabricVersion).To(Equal("1.4.1-1"))
					Expect(cr.Spec.Images).To(Equal(&current.OrdererImages{}))
				})
			})
		})

		Context("replicas", func() {
			BeforeEach(func() {
				replicas := int32(1)
				request := &api.UpdateRequest{
					Replicas: &replicas,
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("returns error if invalid replicas  passed", func() {
				replicas := int32(2)
				request := &api.UpdateRequest{
					Replicas: &replicas,
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, _, err := ordererComp.UpdateCR(orderer.REPLICAS, "orderer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("failed to update replicas: replicas not valid, expecting 0 or 1"))
			})

			It("performs update", func() {
				_, code, err := ordererComp.UpdateCR(orderer.REPLICAS, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPOrderer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(*cr.Spec.Replicas).To(Equal(int32(1)))
				})
			})
		})

		Context("genesis block", func() {
			BeforeEach(func() {
				genesisBlock := &api.GenesisSpec{
					Block: "test-block",
				}
				request := &api.UpdateRequest{
					Genesis: genesisBlock,
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs update", func() {
				_, code, err := ordererComp.UpdateCR(orderer.GENESIS, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPOrderer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.GenesisBlock).To(Equal("test-block"))
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

				_, code, err := ordererComp.UpdateCR(orderer.HSM, "orderer1", "namespace", "testSID", body)
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

		Context("all", func() {
			BeforeEach(func() {
				secret := &current.SecretSpec{
					Enrollment: &current.EnrollmentSpec{
						Component: &current.Enrollment{
							EnrollID:     "id2",
							EnrollSecret: "secret2",
						},
					},
				}

				request := &api.UpdateRequest{
					Config:     secret,
					AdminCerts: []string{"admincert1", "admincert2"},
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs update", func() {
				_, code, err := ordererComp.UpdateCR(orderer.ALL, "orderer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				cr := &current.IBPOrderer{}
				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())
				})

				By("updating crypto but not admin certs since both were passed", func() {
					Expect(cr.Spec.Secret.Enrollment.Component.EnrollID).To(Equal("id2"))
					Expect(cr.Spec.Secret.Enrollment.Component.EnrollSecret).To(Equal("secret2"))
					Expect(cr.Spec.Secret.Enrollment.Component.AdminCerts).To(BeNil())
				})
			})
		})
	})
})
