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
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/mocks"
	v2peer "github.com/IBM-Blockchain/fabric-operator/api/peer/v2"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("Patch API", func() {
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

		logger := zaptest.NewLogger(&testing.T{})

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

		client.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
			p := peerCR.(*current.IBPPeer)
			p.Spec = current.IBPPeerSpec{
				Resources: cfg.Defaults.Resources.Peer,
				Storage:   cfg.Defaults.Storage.Peer,
				Action: current.PeerAction{
					Enroll: current.PeerEnrollAction{
						Ecert: true,
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

	Context("patch Peer CR", func() {
		var (
			body []byte
			err  error
		)

		Context("patch", func() {
			It("returns an error if unable to find component", func() {
				client.GetCRReturns(errors.New("not found"))
				_, _, err := peerComp.PatchCR(peer.ACTIONS, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("not found")))
			})

			It("returns an error if unable to patch component", func() {
				client.PatchCRReturns(errors.New("patch failed"))
				_, _, err := peerComp.PatchCR(peer.ACTIONS, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(err).To(MatchError(ContainSubstring("patch failed")))
			})
		})

		Context("actions", func() {
			BeforeEach(func() {
				request := &api.UpdateRequest{
					Actions: &current.PeerAction{
						Restart: true,
						Reenroll: current.PeerReenrollAction{
							TLSCert: true,
						},
					},
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs patch", func() {
				_, code, err := peerComp.PatchCR(peer.ACTIONS, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.Action.Restart).To(Equal(true))
					Expect(cr.Spec.Action.Reenroll.TLSCert).To(Equal(true))
				})

			})

			It("returns error if try to set enroll and re-enroll ecert at same time", func() {
				request := &api.UpdateRequest{
					Actions: &current.PeerAction{
						Reenroll: current.PeerReenrollAction{
							Ecert: true,
						},
						Enroll: current.PeerEnrollAction{
							Ecert: true,
						},
					},
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, code, err := peerComp.PatchCR(peer.ACTIONS, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(code).To(Equal(500))
				Expect(err.Error()).To(ContainSubstring("cannot request to enroll and re-enroll the ecert at the same time"))
			})

			It("returns error if try to set re-enroll tlscert and re-enroll tlscert with new key at same time", func() {
				request := &api.UpdateRequest{
					Actions: &current.PeerAction{
						Reenroll: current.PeerReenrollAction{
							TLSCert:       true,
							TLSCertNewKey: true,
						},
					},
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, code, err := peerComp.PatchCR(peer.ACTIONS, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(code).To(Equal(500))
				Expect(err.Error()).To(ContainSubstring("cannot request to re-enroll the TLS cert and re-enroll the TLS cert with a new key at the same time"))
			})

			It("returns error if try to re-enroll ecert when enroll ecert action flag already set in cr spec", func() {
				request := &api.UpdateRequest{
					Actions: &current.PeerAction{
						Reenroll: current.PeerReenrollAction{
							Ecert: true,
						},
					},
				}
				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())

				_, code, err := peerComp.PatchCR(peer.ACTIONS, "peer1", "namespace", "testSID", body)
				Expect(err).To(HaveOccurred())
				Expect(code).To(Equal(500))
				Expect(err.Error()).To(ContainSubstring("cannot request to re-enroll ecert when ecert enroll action is pending"))
			})
		})

		Context("resources", func() {
			BeforeEach(func() {
				request := &api.UpdateRequest{
					Resources: &current.PeerResources{
						Init: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
						},
						Peer: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("2"),
								corev1.ResourceMemory: resource.MustParse("2Mi"),
							},
						},
						GRPCProxy: &corev1.ResourceRequirements{
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
				_, code, err := peerComp.PatchCR(peer.RESOURCES, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(*cr.Spec.Resources).To(Equal(current.PeerResources{
						Init: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
						},
						Peer: &corev1.ResourceRequirements{
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("3"),
								corev1.ResourceMemory: resource.MustParse("3Mi"),
							},
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("2"),
								corev1.ResourceMemory: resource.MustParse("2Mi"),
							},
						},
						GRPCProxy: &corev1.ResourceRequirements{
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
				config := &v2peer.Core{
					Peer: v2peer.Peer{
						ID: "peerid1",
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

			It("performs patch", func() {
				_, code, err := peerComp.PatchCR(peer.CONFIG, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					config := &v2peer.Core{}
					err = json.Unmarshal(cr.Spec.ConfigOverride.Raw, config)
					Expect(err).NotTo(HaveOccurred())

					Expect(config.Peer.ID).To(Equal("peerid1"))
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

			It("performs patch", func() {
				_, code, err := peerComp.PatchCR(peer.CRYPTO, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPPeer{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(cr.Spec.Secret.Enrollment.Component.EnrollID).To(Equal("id2"))
					Expect(cr.Spec.Secret.MSP.TLS.SignCerts).To(Equal("signcert2"))
				})
			})
		})

		Context("node ou", func() {
			BeforeEach(func() {
				t := true
				request := &api.UpdateRequest{
					NodeOU: &api.NodeOU{
						Enabled: &t,
					},
				}

				body, err = json.Marshal(request)
				Expect(err).NotTo(HaveOccurred())
			})

			It("performs patch", func() {
				_, code, err := peerComp.PatchCR(peer.NODEOU, "peer1", "namespace", "testSID", body)
				Expect(err).NotTo(HaveOccurred())
				Expect(code).To(Equal(200))

				By("calling patch on client", func() {
					Expect(client.PatchCRCallCount()).To(Equal(1))

					cr := &current.IBPOrderer{}
					_, _, _, crBytes := client.PatchCRArgsForCall(0)
					err := json.Unmarshal(crBytes, cr)
					Expect(err).NotTo(HaveOccurred())

					Expect(*cr.Spec.DisableNodeOU).To(Equal(false))
				})
			})
		})
	})
})
