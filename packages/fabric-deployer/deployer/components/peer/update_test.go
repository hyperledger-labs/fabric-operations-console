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

package peer_test

import (
	"encoding/json"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	cfg "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/mocks"
	v1 "github.com/IBM-Blockchain/fabric-operator/api/peer/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("Update API", func() {
	var (
		peerComp *peer.Peer
		kube     *mocks.Kube
		client   *mocks.IBPOperatorClient
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
					Peer: &current.PeerStorages{
						Peer: &current.StorageSpec{
							Size:  "1Gi",
							Class: "default",
						},
					},
				},
				Resources: &cfg.Resources{
					Peer: &current.PeerResources{
						DinD: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						Peer: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						CouchDB: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						GRPCProxy: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						FluentD: &corev1.ResourceRequirements{
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
				Peer:    map[string]cfg.VersionPeer{"1.4.1-1": cfg.VersionPeer{Default: true, Image: cfg.PeerImages{}}},
				Orderer: map[string]cfg.VersionOrderer{"1.4.1": cfg.VersionOrderer{Default: true}},
			},
			Timeouts: &cfg.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
			CRN:              &config.CRN{},
		}

		coreConfig := &v1.Core{
			Peer: v1.Peer{
				ID: "corepeer",
			},
		}
		coreBytes, err := json.Marshal(coreConfig)
		Expect(err).NotTo(HaveOccurred())

		client.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
			p := peerCR.(*current.IBPPeer)
			p.Spec = current.IBPPeerSpec{
				Resources:      cfg.Defaults.Resources.Peer,
				Storage:        cfg.Defaults.Storage.Peer,
				ConfigOverride: &runtime.RawExtension{Raw: coreBytes},
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

		peerComp = &peer.Peer{
			Logger:            logger.Sugar().Named("Peer"),
			Kube:              kube,
			IBPOperatorClient: client,
			Config:            cfg,
		}
	})

	Context("update Peer CR", func() {
		var (
			body       []byte
			err        error
			crypto     *current.SecretSpec
			adminCerts []string
		)

		BeforeEach(func() {
			coreConfig := &v1.Core{
				Peer: v1.Peer{
					ID: "corepeer-updated",
				},
			}
			coreBytes, err := json.Marshal(coreConfig)
			Expect(err).NotTo(HaveOccurred())

			crypto = &current.SecretSpec{
				MSP: &current.MSPSpec{
					Component: &current.MSP{
						SignCerts: "newcert",
					},
				},
			}

			adminCerts = []string{"admincert1", "admincert2"}

			replicas := int32(1)
			request := &api.UpdateRequest{
				ConfigOverride: &runtime.RawExtension{Raw: coreBytes},
				Config:         crypto,
				AdminCerts:     adminCerts,
				Version:        "1.4.1-1",
				Replicas:       &replicas,
			}
			body, err = json.Marshal(request)
			Expect(err).NotTo(HaveOccurred())
		})

		Context("config", func() {
			It("returns an error if unable to find component", func() {
				client.GetCRReturns(errors.New("not found"))
				_, _, err := peerComp.UpdateCR(peer.CONFIG, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("not found")))
			})

			It("returns an error if unable to update component", func() {
				client.UpdateCRReturns(errors.New("update failed"))
				_, _, err := peerComp.UpdateCR(peer.CONFIG, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("update failed")))
			})

			It("performs update", func() {
				_, code, err := peerComp.UpdateCR(peer.CONFIG, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					// Expect(cr.Spec.ConfigOverride).To(Equal(&coreJson))
					// No other fields should be updated
					Expect(cr.Spec.Secret).To(Equal(&current.SecretSpec{
						Enrollment: &current.EnrollmentSpec{
							Component: &current.Enrollment{
								AdminCerts: []string{"admincert"},
							},
						},
					}))
				})
			})
		})

		Context("crypto", func() {
			It("performs update", func() {
				_, code, err := peerComp.UpdateCR(peer.CRYPTO, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.Secret).To(Equal(crypto))
					// No other fields should be updated
					core := &v1.Core{}
					err = json.Unmarshal(cr.Spec.ConfigOverride.Raw, core)
					Expect(core.Peer.ID).To(Equal("corepeer"))
				})
			})
		})

		Context("admin certs", func() {
			It("returns error if secret spec doesn't exist in cr", func() {
				client.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
					p := peerCR.(*current.IBPPeer)
					p.Spec = current.IBPPeerSpec{}
					p.Name = "peer1"
					return nil
				}
				_, code, err := peerComp.UpdateCR(peer.ADMINCERTS, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(ContainSubstring("secret spec doesn't exist for peer1"))
				Expect(code).To(Equal(500))
			})

			It("performs update", func() {
				_, code, err := peerComp.UpdateCR(peer.ADMINCERTS, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
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
					// No other fields should be updated
					core := &v1.Core{}
					err = json.Unmarshal(cr.Spec.ConfigOverride.Raw, core)
					Expect(core.Peer.ID).To(Equal("corepeer"))
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

				_, _, err := peerComp.UpdateCR(peer.VERSION, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("version not valid")))
			})

			It("performs update", func() {
				_, code, err := peerComp.UpdateCR(peer.VERSION, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.FabricVersion).To(Equal("1.4.1-1"))
					Expect(cr.Spec.Images).To(Equal(&current.PeerImages{}))
				})
			})
		})

		Context("replicas", func() {
			It("returns error if invalid replicas  passed", func() {
				replicas := int32(2)
				request := &api.UpdateRequest{
					Replicas: &replicas,
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, _, err := peerComp.UpdateCR(peer.REPLICAS, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("failed to update replicas: replicas not valid, expecting 0 or 1"))
			})

			It("performs update", func() {
				_, code, err := peerComp.UpdateCR(peer.REPLICAS, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(*cr.Spec.Replicas).To(Equal(int32(1)))
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

				_, code, err := peerComp.UpdateCR(peer.HSM, "peer1", "namespace", "testSID", body)
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
			It("performs update", func() {
				_, code, err := peerComp.UpdateCR(peer.ALL, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				cr := &current.IBPPeer{}
				By("calling update on client", func() {
					Expect(client.UpdateCRCallCount()).To(Equal(1))

					_, _, _, crBytes := client.UpdateCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())
				})
				coreConfig := &v1.Core{
					Peer: v1.Peer{
						ID: "corepeer-updated",
					},
				}
				coreBytes, err := json.Marshal(coreConfig)
				Expect(err).NotTo(HaveOccurred())
				By("updating config override", func() {
					Expect(cr.Spec.ConfigOverride.Raw).To(Equal(coreBytes))
				})

				By("updating crypto but not admin certs since both were passed", func() {
					Expect(cr.Spec.Secret).To(Equal(crypto))
				})
			})
		})
	})
})
