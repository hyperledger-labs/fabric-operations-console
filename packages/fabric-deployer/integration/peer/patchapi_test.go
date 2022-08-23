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
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/api"
	v2peer "github.com/IBM-Blockchain/fabric-operator/api/peer/v2"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	corev1 "k8s.io/api/core/v1"
)

var _ = Describe("Patch APIs", func() {
	Context("actions", func() {
		BeforeEach(func() {
			config := &v2peer.Core{
				Peer: v2peer.Peer{
					ID:        "peerid0",
					NetworkID: "networkid1",
				},
			}

			configBytes, err := json.Marshal(config)
			Expect(err).NotTo(HaveOccurred())

			secret := &current.SecretSpec{
				Enrollment: &current.EnrollmentSpec{
					TLS: &current.Enrollment{
						EnrollID:     "id1",
						EnrollSecret: "secret1",
					},
				},
				MSP: &current.MSPSpec{
					Component: &current.MSP{
						SignCerts:  "signcert1",
						KeyStore:   "keystore1",
						AdminCerts: []string{"cert1"},
					},
				},
			}

			createPeerReq := &api.CreateRequest{
				Resources: &current.PeerResources{
					Init: &corev1.ResourceRequirements{
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("2"),
							corev1.ResourceMemory: resource.MustParse("2Mi"),
						},
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("1"),
							corev1.ResourceMemory: resource.MustParse("1Mi"),
						},
					},
					Peer: &corev1.ResourceRequirements{
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("2"),
							corev1.ResourceMemory: resource.MustParse("2Mi"),
						},
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("1"),
							corev1.ResourceMemory: resource.MustParse("1Mi"),
						},
					},
					GRPCProxy: &corev1.ResourceRequirements{
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("3"),
							corev1.ResourceMemory: resource.MustParse("3Mi"),
						},
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("1"),
							corev1.ResourceMemory: resource.MustParse("1Mi"),
						},
					},
				},
				Config:         secret,
				ConfigOverride: &runtime.RawExtension{Raw: configBytes},
				Zone:           "dal1",
				Region:         "us-south",
			}
			body, err := json.Marshal(createPeerReq)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPost, "http://localhost:8080/api/v2/instance/testsid/type/peer/component/peer1", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			Eventually(func() bool {
				err = crclient.GetCR(namespace, "IBPPEERS", "peer1", &current.IBPPeer{})
				if err == nil {
					return true
				}
				return false
			}).Should(Equal(true))
		})

		It("patches actions", func() {
			updateReq := &api.UpdateRequest{
				Actions: &current.PeerAction{
					Restart: true,
					Reenroll: current.PeerReenrollAction{
						Ecert:   true,
						TLSCert: true,
					},
				},
			}
			body, err := json.Marshal(updateReq)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/peer/component/peer1/actions", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			By("setting actions.restart to true", func() {
				Eventually(func() current.PeerAction {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return current.PeerAction{}
					}
					return ibppeer.Spec.Action
				}).Should(Equal(current.PeerAction{
					Restart: true,
					Reenroll: current.PeerReenrollAction{
						Ecert:   true,
						TLSCert: true,
					},
				}))

				By("keeping original values", func() {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					Expect(err).NotTo(HaveOccurred())

					Expect(ibppeer.Spec.Zone).To(Equal("dal1"))
					Expect(ibppeer.Spec.Region).To(Equal("us-south"))
				})
			})
		})

		It("patches resources", func() {
			updateReq := &api.UpdateRequest{}
			addResourcesPatch(updateReq)

			body, err := json.Marshal(updateReq)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/peer/component/peer1/resources", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			By("setting new resource limits for init container", func() {
				Eventually(func() *corev1.ResourceList {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return nil
					}
					return &ibppeer.Spec.Resources.Init.Limits
				}).Should(Equal(&corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("3"),
					corev1.ResourceMemory: resource.MustParse("3Mi"),
				}))
			})

			By("setting new resource limits for peer container", func() {
				Eventually(func() *corev1.ResourceList {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return nil
					}
					return &ibppeer.Spec.Resources.Peer.Limits
				}).Should(Equal(&corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("3"),
					corev1.ResourceMemory: resource.MustParse("3Mi"),
				}))
			})

			By("setting new resource requests for peer container", func() {
				Eventually(func() *corev1.ResourceList {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return nil
					}
					return &ibppeer.Spec.Resources.Peer.Requests
				}).Should(Equal(&corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("2"),
					corev1.ResourceMemory: resource.MustParse("2Mi"),
				}))
			})

			By("setting new resource requests for grpxy proxy container", func() {
				Eventually(func() *corev1.ResourceList {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return nil
					}
					return &ibppeer.Spec.Resources.GRPCProxy.Requests
				}).Should(Equal(&corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("2"),
					corev1.ResourceMemory: resource.MustParse("2Mi"),
				}))
			})

			By("keeping original resource values", func() {
				ibppeer := &current.IBPPeer{}
				err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
				Expect(err).NotTo(HaveOccurred())

				Expect(ibppeer.Spec.Resources.Init.Requests).To(Equal(corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("1"),
					corev1.ResourceMemory: resource.MustParse("1Mi"),
				}))

				Expect(ibppeer.Spec.Resources.GRPCProxy.Limits).To(Equal(corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("3"),
					corev1.ResourceMemory: resource.MustParse("3Mi"),
				}))
			})
		})

		It("patches config", func() {
			updateReq := &api.UpdateRequest{}
			addConfigPatch(updateReq)

			body, err := json.Marshal(updateReq)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/peer/component/peer1/config", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			By("setting new config value", func() {
				Eventually(func() string {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return ""
					}

					config := &v2peer.Core{}
					err = json.Unmarshal(ibppeer.Spec.ConfigOverride.Raw, config)
					if err != nil {
						return ""
					}

					return config.Peer.ID
				}).Should(Equal("peerid1"))
			})

			By("keeping original config values", func() {
				ibppeer := &current.IBPPeer{}
				err := crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
				Expect(err).NotTo(HaveOccurred())

				config := &v2peer.Core{}
				err = json.Unmarshal(ibppeer.Spec.ConfigOverride.Raw, config)
				Expect(err).NotTo(HaveOccurred())

				Expect(config.Peer.NetworkID).To(Equal("networkid1"))
			})
		})

		It("patches crypto", func() {
			updateReq := &api.UpdateRequest{}
			addCryptoPatch(updateReq)

			body, err := json.Marshal(updateReq)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/peer/component/peer1/crypto", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			By("setting new enrollment crypto values", func() {
				Eventually(func() *current.Enrollment {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return nil
					}

					return ibppeer.Spec.Secret.Enrollment.Component
				}).Should(Equal(&current.Enrollment{
					EnrollID:     "id2",
					EnrollSecret: "secret2",
				}))
			})

			By("setting new msp crypto values", func() {
				Eventually(func() *current.MSP {
					ibppeer := &current.IBPPeer{}
					err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
					if err != nil {
						return nil
					}

					return ibppeer.Spec.Secret.MSP.TLS
				}).Should(Equal(&current.MSP{
					SignCerts: "signcert2",
					KeyStore:  "keystore2",
				}))
			})

			By("keeping original config values", func() {
				ibppeer := &current.IBPPeer{}
				err := crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
				Expect(err).NotTo(HaveOccurred())

				Expect(ibppeer.Spec.Secret.Enrollment.TLS).To(Equal(&current.Enrollment{
					EnrollID:     "id1",
					EnrollSecret: "secret1",
				}))
			})
		})

		Context("node ou", func() {
			BeforeEach(func() {
				ibppeer := &current.IBPPeer{}
				err := crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
				Expect(err).NotTo(HaveOccurred())

				t := true
				ibppeer.Spec.DisableNodeOU = &t

				crBytes, err := json.Marshal(ibppeer)
				Expect(err).NotTo(HaveOccurred())

				err = crclient.UpdateCR(namespace, "IBPPEERS", "peer1", crBytes)
				Expect(err).NotTo(HaveOccurred())

				By("setting spec.disableNodeOU to true", func() {
					Eventually(func() bool {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return false
						}

						return *ibppeer.Spec.DisableNodeOU
					}).Should(Equal(true))
				})
			})

			It("patches nodeou", func() {
				updateReq := &api.UpdateRequest{}
				addNodeOUPatch(updateReq)

				body, err := json.Marshal(updateReq)
				Expect(err).NotTo(HaveOccurred())

				req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/peer/component/peer1/nodeou", bytes.NewBuffer(body))
				Expect(err).NotTo(HaveOccurred())

				do(req)

				By("setting spec.disableNodeOU to false", func() {
					Eventually(func() bool {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return true
						}

						return *ibppeer.Spec.DisableNodeOU
					}).Should(Equal(false))
				})
			})
		})

		Context("all", func() {
			BeforeEach(func() {
				ibppeer := &current.IBPPeer{}
				err := crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
				Expect(err).NotTo(HaveOccurred())

				t := true
				ibppeer.Spec.DisableNodeOU = &t

				crBytes, err := json.Marshal(ibppeer)
				Expect(err).NotTo(HaveOccurred())

				err = crclient.UpdateCR(namespace, "IBPPEERS", "peer1", crBytes)
				Expect(err).NotTo(HaveOccurred())

				By("setting spec.disableNodeOU to true", func() {
					Eventually(func() bool {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return false
						}

						return *ibppeer.Spec.DisableNodeOU
					}).Should(Equal(true))
				})
			})

			It("patches all", func() {
				updateReq := &api.UpdateRequest{}
				addActionPatch(updateReq)
				addResourcesPatch(updateReq)
				addConfigPatch(updateReq)
				addCryptoPatch(updateReq)
				addNodeOUPatch(updateReq)

				body, err := json.Marshal(updateReq)
				Expect(err).NotTo(HaveOccurred())

				req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/peer/component/peer1/all", bytes.NewBuffer(body))
				Expect(err).NotTo(HaveOccurred())

				do(req)

				By("setting spec.disableNodeOU to false", func() {
					Eventually(func() bool {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return true
						}

						return *ibppeer.Spec.DisableNodeOU
					}).Should(Equal(false))
				})

				By("setting new resource limits for peer container", func() {
					Eventually(func() *corev1.ResourceList {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return nil
						}
						return &ibppeer.Spec.Resources.Peer.Limits
					}).Should(Equal(&corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("3"),
						corev1.ResourceMemory: resource.MustParse("3Mi"),
					}))
				})

				By("setting new resource requests for peer container", func() {
					Eventually(func() *corev1.ResourceList {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return nil
						}
						return &ibppeer.Spec.Resources.Peer.Requests
					}).Should(Equal(&corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("2"),
						corev1.ResourceMemory: resource.MustParse("2Mi"),
					}))
				})

				By("setting new config value", func() {
					Eventually(func() string {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return ""
						}

						config := &v2peer.Core{}
						err = json.Unmarshal(ibppeer.Spec.ConfigOverride.Raw, config)
						if err != nil {
							return ""
						}

						return config.Peer.ID
					}).Should(Equal("peerid1"))
				})

				By("setting new msp crypto values", func() {
					Eventually(func() *current.MSP {
						ibppeer := &current.IBPPeer{}
						err = crclient.GetCR(namespace, "IBPPEERS", "peer1", ibppeer)
						if err != nil {
							return nil
						}

						return ibppeer.Spec.Secret.MSP.TLS
					}).Should(Equal(&current.MSP{
						SignCerts: "signcert2",
						KeyStore:  "keystore2",
					}))
				})
			})
		})
	})
})

func do(req *http.Request) {
	req.Header.Set("Content-Tye", "application/json")
	req.SetBasicAuth("admin", "admin")

	_, err := deployerClient.Do(req)
	if err != nil {
		fmt.Println("Error: ", err)
	}
}

func addActionPatch(req *api.UpdateRequest) {
	req.Actions = &current.PeerAction{
		Restart: true,
		Reenroll: current.PeerReenrollAction{
			Ecert: true,
		},
	}
}

func addResourcesPatch(req *api.UpdateRequest) {
	req.Resources = &current.PeerResources{
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
	}
}

func addConfigPatch(req *api.UpdateRequest) {
	config := &v2peer.Core{
		Peer: v2peer.Peer{
			ID: "peerid1",
		},
	}

	configBytes, err := json.Marshal(config)
	Expect(err).NotTo(HaveOccurred())

	req.ConfigOverride = &runtime.RawExtension{Raw: configBytes}
}

func addCryptoPatch(req *api.UpdateRequest) {
	req.Config = &current.SecretSpec{
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
}

func addNodeOUPatch(req *api.UpdateRequest) {
	t := true
	req.NodeOU = &api.NodeOU{
		Enabled: &t,
	}
}
