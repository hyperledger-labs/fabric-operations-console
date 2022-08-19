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
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/api"
	v2orderer "github.com/IBM-Blockchain/fabric-operator/api/orderer/v2"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
)

var _ = Describe("Patch APIs", func() {
	BeforeEach(func() {
		config := &v2orderer.Orderer{
			General: v2orderer.General{
				LocalMSPDir: "msp/dir",
				LocalMSPID:  "mspid1",
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

		createOrdererReq := &api.PrecreateRequest{
			Resources: &current.OrdererResources{
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
				Orderer: &corev1.ResourceRequirements{
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
			ConfigOverride: &runtime.RawExtension{Raw: configBytes},
			Config:         secret,
			Zone:           "dal1",
			Region:         "us-south",
		}
		body, err := json.Marshal(createOrdererReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPost, "http://localhost:8080/api/v2/instance/testsid/precreate/type/orderer/component/orderer1", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		Eventually(func() bool {
			err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", &current.IBPOrderer{})
			if err == nil {
				return true
			}
			return false
		}).Should(Equal(true))
	})

	AfterEach(func() {
		err := crclient.DeleteCR(namespace, "IBPORDERERS", "orderer1")
		Expect(err).NotTo(HaveOccurred())

		Eventually(func() bool {
			err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", &current.IBPCA{})
			if err != nil {
				return true
			}
			return false
		}).Should(Equal(true))

	})

	It("patches actions", func() {
		updateReq := &api.UpdateRequest{
			Actions: &current.OrdererAction{
				Restart: true,
				Reenroll: current.OrdererReenrollAction{
					Ecert: true,
				},
			},
		}
		body, err := json.Marshal(updateReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/orderer/component/orderer1/actions", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting actions.restart to true", func() {
			Eventually(func() current.OrdererAction {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return current.OrdererAction{}
				}
				return ibporderer.Spec.Action
			}).Should(Equal(current.OrdererAction{
				Restart: true,
				Reenroll: current.OrdererReenrollAction{
					Ecert: true,
				},
			}))

			By("keeping original values", func() {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				Expect(err).NotTo(HaveOccurred())

				Expect(ibporderer.Spec.Zone).To(Equal("dal1"))
				Expect(ibporderer.Spec.Region).To(Equal("us-south"))
			})
		})
	})

	It("patches resources", func() {
		updateReq := &api.UpdateRequest{}
		addResourcesPatch(updateReq)

		body, err := json.Marshal(updateReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/orderer/component/orderer1/resources", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting new resource limits for init container", func() {
			Eventually(func() *corev1.ResourceList {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return nil
				}
				return &ibporderer.Spec.Resources.Init.Limits
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("3"),
				corev1.ResourceMemory: resource.MustParse("3Mi"),
			}))
		})

		By("setting new resource limits for orderer container", func() {
			Eventually(func() *corev1.ResourceList {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return nil
				}
				return &ibporderer.Spec.Resources.Orderer.Limits
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("3"),
				corev1.ResourceMemory: resource.MustParse("3Mi"),
			}))
		})

		By("setting new resource requests for orderer container", func() {
			Eventually(func() *corev1.ResourceList {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return nil
				}
				return &ibporderer.Spec.Resources.Orderer.Requests
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("2"),
				corev1.ResourceMemory: resource.MustParse("2Mi"),
			}))
		})

		By("setting new resource requests for grpxy proxy container", func() {
			Eventually(func() *corev1.ResourceList {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return nil
				}
				return &ibporderer.Spec.Resources.GRPCProxy.Requests
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("2"),
				corev1.ResourceMemory: resource.MustParse("2Mi"),
			}))
		})

		By("keeping original resource values", func() {
			ibporderer := &current.IBPOrderer{}
			err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
			Expect(err).NotTo(HaveOccurred())

			Expect(ibporderer.Spec.Resources.Init.Requests).To(Equal(corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("1"),
				corev1.ResourceMemory: resource.MustParse("1Mi"),
			}))

			Expect(ibporderer.Spec.Resources.GRPCProxy.Limits).To(Equal(corev1.ResourceList{
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

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/orderer/component/orderer1/config", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting new config value", func() {
			Eventually(func() string {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return ""
				}

				config := &v2orderer.Orderer{}
				err = json.Unmarshal(ibporderer.Spec.ConfigOverride.Raw, config)
				if err != nil {
					return ""
				}

				return config.General.LocalMSPID
			}).Should(Equal("mspid2"))
		})

		By("keeping original config values", func() {
			ibporderer := &current.IBPOrderer{}
			err := crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
			Expect(err).NotTo(HaveOccurred())

			config := &v2orderer.Orderer{}
			err = json.Unmarshal(ibporderer.Spec.ConfigOverride.Raw, config)
			Expect(err).NotTo(HaveOccurred())

			Expect(config.General.LocalMSPDir).To(Equal("msp/dir"))
		})
	})

	It("patches crypto", func() {
		updateReq := &api.UpdateRequest{}
		addCryptoPatch(updateReq)

		body, err := json.Marshal(updateReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/orderer/component/orderer1/crypto", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting new enrollment crypto values", func() {
			Eventually(func() *current.Enrollment {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return nil
				}

				return ibporderer.Spec.Secret.Enrollment.Component
			}).Should(Equal(&current.Enrollment{
				EnrollID:     "id2",
				EnrollSecret: "secret2",
			}))
		})

		By("setting new msp crypto values", func() {
			Eventually(func() *current.MSP {
				ibporderer := &current.IBPOrderer{}
				err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
				if err != nil {
					return nil
				}

				return ibporderer.Spec.Secret.MSP.TLS
			}).Should(Equal(&current.MSP{
				SignCerts: "signcert2",
				KeyStore:  "keystore2",
			}))
		})

		By("keeping original config values", func() {
			ibporderer := &current.IBPOrderer{}
			err := crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
			Expect(err).NotTo(HaveOccurred())

			Expect(ibporderer.Spec.Secret.Enrollment.TLS).To(Equal(&current.Enrollment{
				EnrollID:     "id1",
				EnrollSecret: "secret1",
			}))

			Expect(ibporderer.Spec.Secret.MSP.Component).To(Equal(&current.MSP{
				SignCerts:  "signcert1",
				KeyStore:   "keystore1",
				AdminCerts: []string{"cert1"},
			}))
		})
	})

	Context("node ou", func() {
		BeforeEach(func() {
			ibporderer := &current.IBPOrderer{}
			err := crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
			Expect(err).NotTo(HaveOccurred())

			t := true
			ibporderer.Spec.DisableNodeOU = &t

			crBytes, err := json.Marshal(ibporderer)
			Expect(err).NotTo(HaveOccurred())

			err = crclient.UpdateCR(namespace, "IBPORDERERS", "orderer1", crBytes)
			Expect(err).NotTo(HaveOccurred())

			By("setting spec.disableNodeOU to true", func() {
				Eventually(func() bool {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return false
					}

					return *ibporderer.Spec.DisableNodeOU
				}).Should(Equal(true))
			})
		})

		It("patches nodeou", func() {
			updateReq := &api.UpdateRequest{}
			addNodeOUPatch(updateReq)

			body, err := json.Marshal(updateReq)
			Expect(err).NotTo(HaveOccurred())

			req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/orderer/component/orderer1/nodeou", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			By("setting spec.disableNodeOU to false", func() {
				Eventually(func() bool {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return true
					}

					return *ibporderer.Spec.DisableNodeOU
				}).Should(Equal(false))
			})
		})
	})

	Context("all", func() {
		BeforeEach(func() {
			ibporderer := &current.IBPOrderer{}
			err := crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
			Expect(err).NotTo(HaveOccurred())

			t := true
			ibporderer.Spec.DisableNodeOU = &t

			crBytes, err := json.Marshal(ibporderer)
			Expect(err).NotTo(HaveOccurred())

			err = crclient.UpdateCR(namespace, "IBPORDERERS", "orderer1", crBytes)
			Expect(err).NotTo(HaveOccurred())

			By("setting spec.disableNodeOU to true", func() {
				Eventually(func() bool {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return false
					}

					return *ibporderer.Spec.DisableNodeOU
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

			req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/orderer/component/orderer1/all", bytes.NewBuffer(body))
			Expect(err).NotTo(HaveOccurred())

			do(req)

			By("setting spec.disableNodeOU to false", func() {
				Eventually(func() bool {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return true
					}

					return *ibporderer.Spec.DisableNodeOU
				}).Should(Equal(false))
			})

			By("setting new resource limits for orderer container", func() {
				Eventually(func() *corev1.ResourceList {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return nil
					}
					return &ibporderer.Spec.Resources.Orderer.Limits
				}).Should(Equal(&corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("3"),
					corev1.ResourceMemory: resource.MustParse("3Mi"),
				}))
			})

			By("setting new resource requests for orderer container", func() {
				Eventually(func() *corev1.ResourceList {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return nil
					}
					return &ibporderer.Spec.Resources.Orderer.Requests
				}).Should(Equal(&corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("2"),
					corev1.ResourceMemory: resource.MustParse("2Mi"),
				}))
			})

			By("setting new config value", func() {
				Eventually(func() string {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return ""
					}

					config := &v2orderer.Orderer{}
					err = json.Unmarshal(ibporderer.Spec.ConfigOverride.Raw, config)
					if err != nil {
						return ""
					}

					return config.General.LocalMSPID
				}).Should(Equal("mspid2"))
			})

			By("setting new msp crypto values", func() {
				Eventually(func() *current.MSP {
					ibporderer := &current.IBPOrderer{}
					err = crclient.GetCR(namespace, "IBPORDERERS", "orderer1", ibporderer)
					if err != nil {
						return nil
					}

					return ibporderer.Spec.Secret.MSP.TLS
				}).Should(Equal(&current.MSP{
					SignCerts: "signcert2",
					KeyStore:  "keystore2",
				}))
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
	req.Actions = &current.OrdererAction{
		Restart: true,
		Reenroll: current.OrdererReenrollAction{
			Ecert: true,
		},
	}
}

func addResourcesPatch(req *api.UpdateRequest) {
	req.Resources = &current.OrdererResources{
		Init: &corev1.ResourceRequirements{
			Limits: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("3"),
				corev1.ResourceMemory: resource.MustParse("3Mi"),
			},
		},
		Orderer: &corev1.ResourceRequirements{
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
	config := &v2orderer.Orderer{
		General: v2orderer.General{
			LocalMSPID: "mspid2",
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
