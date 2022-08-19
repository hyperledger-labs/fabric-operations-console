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
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	v1ca "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
)

var _ = Describe("Patch APIs", func() {
	BeforeEach(func() {
		caConfig := &v1ca.ServerConfig{
			CAConfig: v1ca.CAConfig{
				CA: v1ca.CAInfo{
					Name: "ca1",
				},
				CSP: &v1ca.BCCSP{
					ProviderName: "sw",
				},
			},
		}

		configBytes, err := json.Marshal(caConfig)
		Expect(err).NotTo(HaveOccurred())

		createCAReq := &api.CreateRequest{
			Zone:   "dal1",
			Region: "us-south",
			ConfigOverride: &current.ConfigOverride{
				CA: &runtime.RawExtension{Raw: configBytes},
			},
			Resources: &current.CAResources{
				Init: &corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("1"),
						corev1.ResourceMemory: resource.MustParse("1Mi"),
					},
				},
			},
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

	AfterEach(func() {
		err := crclient.DeleteCR(namespace, "IBPCAS", "ca1")
		Expect(err).NotTo(HaveOccurred())

		Eventually(func() bool {
			err = crclient.GetCR(namespace, "IBPCAS", "ca1", &current.IBPCA{})
			if err != nil {
				return true
			}
			return false
		}).Should(Equal(true))

	})

	It("patches actions", func() {
		updateReq := &api.UpdateRequest{}
		addActionPatch(updateReq)

		body, err := json.Marshal(updateReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/ca/component/ca1/actions", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting actions to new values", func() {
			Eventually(func() current.CAAction {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return current.CAAction{}
				}
				return ibpca.Spec.Action
			}).Should(Equal(current.CAAction{
				Restart: true,
				Renew: current.Renew{
					TLSCert: true,
				},
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

	It("patches config", func() {
		updateReq := &api.UpdateRequest{}
		addConfigPatch(updateReq)

		body, err := json.Marshal(updateReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/ca/component/ca1/config", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting new CA config values", func() {
			Eventually(func() string {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return ""
				}

				config := &v1ca.ServerConfig{}
				err = json.Unmarshal(ibpca.Spec.ConfigOverride.CA.Raw, config)
				if err != nil {
					return ""
				}

				return config.CAConfig.CSP.ProviderName
			}).Should(Equal("pkcs11"))
		})

		By("setting new CA config values", func() {
			Eventually(func() string {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return ""
				}

				config := &v1ca.ServerConfig{}
				err = json.Unmarshal(ibpca.Spec.ConfigOverride.TLSCA.Raw, config)
				if err != nil {
					return ""
				}

				return config.CAConfig.CA.Name
			}).Should(Equal("tlsca1"))
		})

		By("keeping original config values", func() {
			ibpca := &current.IBPCA{}
			err := crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
			Expect(err).NotTo(HaveOccurred())

			config := &v1ca.ServerConfig{}
			err = json.Unmarshal(ibpca.Spec.ConfigOverride.CA.Raw, config)
			Expect(err).NotTo(HaveOccurred())

			Expect(config.CAConfig.CA.Name).To(Equal("ca1"))
		})
	})

	It("patches resources", func() {
		updateReq := &api.UpdateRequest{}
		addResourcesPatch(updateReq)

		body, err := json.Marshal(updateReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/ca/component/ca1/resources", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting new resource limits for init container", func() {
			Eventually(func() *corev1.ResourceList {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return nil
				}
				return &ibpca.Spec.Resources.Init.Limits
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("3"),
				corev1.ResourceMemory: resource.MustParse("3Mi"),
			}))
		})

		By("setting new resource limits for ca container", func() {
			Eventually(func() *corev1.ResourceList {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return nil
				}
				return &ibpca.Spec.Resources.CA.Limits
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("3"),
				corev1.ResourceMemory: resource.MustParse("3Mi"),
			}))
		})

		By("setting new resource requests for ca container", func() {
			Eventually(func() *corev1.ResourceList {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return nil
				}
				return &ibpca.Spec.Resources.CA.Requests
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("2"),
				corev1.ResourceMemory: resource.MustParse("2Mi"),
			}))
		})

		By("keeping original resource values", func() {
			ibpca := &current.IBPCA{}
			err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
			Expect(err).NotTo(HaveOccurred())

			Expect(ibpca.Spec.Resources.Init.Requests).To(Equal(corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("1"),
				corev1.ResourceMemory: resource.MustParse("1Mi"),
			}))
		})
	})

	It("patches all", func() {
		updateReq := &api.UpdateRequest{}
		addActionPatch(updateReq)
		addResourcesPatch(updateReq)
		addConfigPatch(updateReq)

		body, err := json.Marshal(updateReq)
		Expect(err).NotTo(HaveOccurred())

		req, err := http.NewRequest(http.MethodPatch, "http://localhost:8080/api/v3/instance/testsid/type/ca/component/ca1/all", bytes.NewBuffer(body))
		Expect(err).NotTo(HaveOccurred())

		do(req)

		By("setting actions to new values", func() {
			Eventually(func() current.CAAction {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return current.CAAction{}
				}
				return ibpca.Spec.Action
			}).Should(Equal(current.CAAction{
				Restart: true,
				Renew: current.Renew{
					TLSCert: true,
				},
			}))
		})

		By("setting new resource limits for ca container", func() {
			Eventually(func() *corev1.ResourceList {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return nil
				}
				return &ibpca.Spec.Resources.CA.Limits
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("3"),
				corev1.ResourceMemory: resource.MustParse("3Mi"),
			}))
		})

		By("setting new resource requests for ca container", func() {
			Eventually(func() *corev1.ResourceList {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return nil
				}
				return &ibpca.Spec.Resources.CA.Requests
			}).Should(Equal(&corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("2"),
				corev1.ResourceMemory: resource.MustParse("2Mi"),
			}))
		})

		By("setting new CA config values", func() {
			Eventually(func() string {
				ibpca := &current.IBPCA{}
				err = crclient.GetCR(namespace, "IBPCAS", "ca1", ibpca)
				if err != nil {
					return ""
				}

				config := &v1ca.ServerConfig{}
				err = json.Unmarshal(ibpca.Spec.ConfigOverride.CA.Raw, config)
				if err != nil {
					return ""
				}

				return config.CAConfig.CSP.ProviderName
			}).Should(Equal("pkcs11"))
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
	req.Actions = &current.CAAction{
		Restart: true,
		Renew: current.Renew{
			TLSCert: true,
		},
	}
}

func addConfigPatch(req *api.UpdateRequest) {
	caConfig := &v1ca.ServerConfig{
		CAConfig: v1ca.CAConfig{
			CSP: &v1ca.BCCSP{
				ProviderName: "pkcs11",
			},
		},
	}

	caBytes, err := json.Marshal(caConfig)
	Expect(err).NotTo(HaveOccurred())

	tlscaConfig := &v1ca.ServerConfig{
		CAConfig: v1ca.CAConfig{
			CA: v1ca.CAInfo{
				Name: "tlsca1",
			},
		},
	}

	tlscaBytes, err := json.Marshal(tlscaConfig)
	Expect(err).NotTo(HaveOccurred())

	req.ConfigOverride = &current.ConfigOverride{
		CA:    &runtime.RawExtension{Raw: caBytes},
		TLSCA: &runtime.RawExtension{Raw: tlscaBytes},
	}
}

func addResourcesPatch(req *api.UpdateRequest) {
	req.Resources = &current.CAResources{
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
	}
}
