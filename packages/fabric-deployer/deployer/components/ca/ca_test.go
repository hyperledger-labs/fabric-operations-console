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
	"errors"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	cfg "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/mocks"
	ibpca "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	"go.uber.org/zap"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

var _ = Describe("CA", func() {
	const (
		testCert = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNwVENDQWtxZ0F3SUJBZ0lSQU1FeVZVcDRMdlYydEFUREhlWklldDh3Q2dZSUtvWkl6ajBFQXdJd2daVXgKQ3pBSkJnTlZCQVlUQWxWVE1SY3dGUVlEVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFUE1BMEdBMVVFQnhNRwpSSFZ5YUdGdE1Rd3dDZ1lEVlFRS0V3TkpRazB4RXpBUkJnTlZCQXNUQ2tKc2IyTnJZMmhoYVc0eE9UQTNCZ05WCkJBTVRNR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzFqWVM1aGNIQnpMbkIxYldGekxtOXpMbVo1Y21VdWFXSnQKTG1OdmJUQWVGdzB5TURBeE1qSXhPREExTURCYUZ3MHpNREF4TVRreE9EQTFNREJhTUlHVk1Rc3dDUVlEVlFRRwpFd0pWVXpFWE1CVUdBMVVFQ0JNT1RtOXlkR2dnUTJGeWIyeHBibUV4RHpBTkJnTlZCQWNUQmtSMWNtaGhiVEVNCk1Bb0dBMVVFQ2hNRFNVSk5NUk13RVFZRFZRUUxFd3BDYkc5amEyTm9ZV2x1TVRrd053WURWUVFERXpCcVlXNHkKTWkxdmNtUmxjbVZ5YjNKblkyRXRZMkV1WVhCd2N5NXdkVzFoY3k1dmN5NW1lWEpsTG1saWJTNWpiMjB3V1RBVApCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFTR0lHUFkvZC9tQVhMejM4SlROR3F5bldpOTJXUVB6cnN0Cm5vdEFWZlh0dHZ5QWJXdTRNbWNUMEh6UnBTWjNDcGdxYUNXcTg1MUwyV09LcnZ6L0JPREpvM2t3ZHpCMUJnTlYKSFJFRWJqQnNnakJxWVc0eU1pMXZjbVJsY21WeWIzSm5ZMkV0WTJFdVlYQndjeTV3ZFcxaGN5NXZjeTVtZVhKbApMbWxpYlM1amIyMkNPR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzF2Y0dWeVlYUnBiMjV6TG1Gd2NITXVjSFZ0CllYTXViM011Wm5seVpTNXBZbTB1WTI5dE1Bb0dDQ3FHU000OUJBTUNBMGtBTUVZQ0lRQzM3Y1pkNFY2RThPQ1IKaDloQXEyK0dyR21FVTFQU0I1eHo5RkdEWThkODZRSWhBT1crM3Urb2d4bFNWNUoyR3ZYbHRaQmpXRkpvYnJxeApwVVQ4cW4yMDA1b0wKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo="
	)

	var (
		err           error
		testCA        *ca.CA
		mockKube      *mocks.Kube
		mockIBPClient *mocks.IBPOperatorClient
		logger        *zap.Logger
		config        *cfg.DeployerSettingsConfig
	)

	BeforeEach(func() {
		logger, err = zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		res := map[corev1.ResourceName]resource.Quantity{}
		res[corev1.ResourceCPU] = resource.MustParse("1")
		res[corev1.ResourceMemory] = resource.MustParse("1Mi")
		config = &cfg.DeployerSettingsConfig{
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
		}
		testCA = ca.New(logger, nil, nil, config)

		mockKube = &mocks.Kube{}
		mockIBPClient = &mocks.IBPOperatorClient{}

		testCA.Kube = mockKube
		testCA.IBPOperatorClient = mockIBPClient
		replicas := int32(1)
		mockIBPClient.GetCRStub = func(namespace string, kind string, name string, caCR runtime.Object) error {
			c := caCR.(*current.IBPCA)
			c.Spec = current.IBPCASpec{
				Resources: &current.CAResources{
					CA: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
				},
				Storage: &current.CAStorages{
					CA: &current.StorageSpec{
						Size:  "1Gi",
						Class: "default",
					},
				},
				Replicas: &replicas,
			}
			c.Status = current.IBPCAStatus{
				CRStatus: current.CRStatus{
					Type:    current.Deployed,
					Status:  current.True,
					Reason:  "",
					Message: "",
				},
			}
			return nil
		}

		mockKube.GetConfigMapStub = func(namespace, name string) (*corev1.ConfigMap, error) {
			type tls struct {
				Cert string
			}
			connectionProfile := &api.ConnectionProfile{
				Endpoints: current.PeerEndpoints{
					API:        "fake",
					Operations: "fake",
				},
				TLS: &tls{
					Cert: testCert,
				},
				CA: &current.MSP{
					SignCerts: testCert,
				},
				TLSCA: &current.MSP{
					SignCerts: testCert,
				},
			}
			connectionProfileBytes, _ := json.Marshal(connectionProfile)
			caYaml := &ibpca.ServerConfig{}
			caYamlBytes, _ := json.Marshal(caYaml)
			cm := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: namespace,
				},
				BinaryData: map[string][]byte{"profile.json": connectionProfileBytes, "fabric-ca-server-config.yaml": caYamlBytes},
			}
			return cm, nil
		}
	})

	Context("Create Custom Resource", func() {
		var body []byte
		var createReq api.CreateRequest

		BeforeEach(func() {
			mockKube.GetServiceReturns(&corev1.Service{}, nil)

			createReq = api.CreateRequest{
				Resources: &current.CAResources{
					CA: &corev1.ResourceRequirements{},
				},
			}

			body, err = json.Marshal(createReq)
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns an error if component name not passed", func() {
			_, _, err := testCA.CreateCR("0.0.0.0", "sID1", "", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("component name not valid, cannot be empty"))
		})

		It("returns an error if it fails create custom resource", func() {
			mockIBPClient.CreateCRReturns(errors.New("create CR error"))
			_, _, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("create CR error"))
		})

		It("returns an error if version passed is not valid", func() {
			createReq.ConfigOverride = nil
			createReq.Version = "1.2.3"
			body, err = json.Marshal(createReq)
			Expect(err).NotTo(HaveOccurred())

			_, _, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("version not valid"))
		})

		It("returns valid response", func() {
			resp, _, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).NotTo(HaveOccurred())

			By("returning non-empty connection profile fields", func() {
				Expect(resp.Endpoints.(map[string]interface{})["api"]).To(Equal("fake"))
				Expect(resp.Endpoints.(map[string]interface{})["operations"]).To(Equal("fake"))

				Expect(resp.TLS).NotTo(BeNil())
				Expect(resp.MSP.CA.(map[string]interface{})["signcerts"]).To(Equal(testCert))
				Expect(resp.MSP.TLSCA.(map[string]interface{})["signcerts"]).To(Equal(testCert))
			})

		})

		It("success if replicas > 1 and CA configoverride is configured correctly", func() {
			replicas := int32(2)
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
			caJson := json.RawMessage(caBytes)

			tlscaConfig := &ibpca.ServerConfig{
				CAConfig: ibpca.CAConfig{
					DB: &ibpca.CAConfigDB{
						Type:       "postgres",
						Datasource: "fake",
					},
				},
			}
			tlscaBytes, err := json.Marshal(tlscaConfig)
			Expect(err).NotTo(HaveOccurred())
			tlscaJson := json.RawMessage(tlscaBytes)

			createReq.ConfigOverride = &current.ConfigOverride{
				CA:    &runtime.RawExtension{Raw: caJson},
				TLSCA: &runtime.RawExtension{Raw: tlscaJson},
			}
			createReq.Replicas = &replicas
			body, err = json.Marshal(createReq)
			Expect(err).NotTo(HaveOccurred())

			resp, _, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).NotTo(HaveOccurred())
			Expect(resp.Name).To(MatchRegexp(`ca1`))
		})

		It("creates CA custom resource", func() {
			_, _, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns error if get CR timesout", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, caCR runtime.Object) error {
				c := caCR.(*current.IBPCA)
				c.Spec = current.IBPCASpec{}
				c.Status = current.IBPCAStatus{
					CRStatus: current.CRStatus{
						Status: current.False,
					},
				}
				return nil
			}
			testCA.Config.Timeouts = &cfg.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(statusCode).Should(Equal(500))
		})

		It("returns 500 if CR status is error", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, caCR runtime.Object) error {
				c := caCR.(*current.IBPCA)
				c.Spec = current.IBPCASpec{}
				c.Status = current.IBPCAStatus{
					CRStatus: current.CRStatus{
						Status: current.True,
						Type:   current.Error,
					},
				}
				return nil
			}
			testCA.Config.Timeouts = &cfg.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).NotTo(HaveOccurred())
			Expect(statusCode).Should(Equal(500))
		})

		It("returns no error if CR status is deployed", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, caCR runtime.Object) error {
				c := caCR.(*current.IBPCA)
				c.Spec = current.IBPCASpec{}
				c.Status = current.IBPCAStatus{
					CRStatus: current.CRStatus{
						Status: current.True,
						Type:   current.Deployed,
					},
				}
				return nil
			}
			mockKube.GetConfigMapStub = func(namespace, name string) (*corev1.ConfigMap, error) {
				type tls struct {
					Cert string
				}
				connectionProfile := &api.ConnectionProfile{
					Endpoints: current.PeerEndpoints{
						API:        "fake",
						Operations: "fake",
					},
					TLS: &tls{
						Cert: "tlscert",
					},
					CA: &current.MSP{
						SignCerts: "cacert",
					},
					TLSCA: &current.MSP{
						SignCerts: "tlscacert",
					},
				}
				connectionProfileBytes, _ := json.Marshal(connectionProfile)
				caYaml := &ibpca.ServerConfig{}
				caYamlBytes, _ := json.Marshal(caYaml)
				cm := &corev1.ConfigMap{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					BinaryData: map[string][]byte{"profile.json": connectionProfileBytes, "fabric-ca-server-config.yaml": caYamlBytes},
				}
				return cm, nil
			}
			testCA.Config.Timeouts = &cfg.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testCA.CreateCR("0.0.0.0", "sID1", "ca1", "default", body)
			Expect(err).NotTo(HaveOccurred())
			Expect(statusCode).Should(Equal(200))
		})
	})

	Context("Delete Custom Resource", func() {
		It("returns an error if it fails delete custom resource", func() {
			mockIBPClient.DeleteCRReturns(errors.New("delete CR error"))
			_, _, err := testCA.DeleteCR("sID1", "ca1", "default", []byte{})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("delete CR error"))
		})

		It("deletes CA custom resource", func() {
			_, _, err := testCA.DeleteCR("sID1", "ca1", "default", []byte{})
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("Update Custom Resource", func() {
		It("returns an error if it fails to find custom resource", func() {
			mockIBPClient.GetCRReturns(errors.New("CR not found"))
			_, _, err := testCA.UpdateCR(ca.ALL, "sID1", "ca1", "default", []byte{})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to get cr for 'sID1' in namespace 'ca1': CR not found"))
		})

		It("returns an error if it fails update custom resource", func() {
			mockIBPClient.UpdateCRReturns(errors.New("update CR error"))
			_, _, err := testCA.UpdateCR(ca.ALL, "sID1", "ca1", "default", []byte{})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed update cr 'sID1' in namespace 'ca1': update CR error"))
		})

		It("updates CA custom resource", func() {
			_, _, err := testCA.UpdateCR(ca.ALL, "sID1", "ca1", "default", []byte{})
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("Get CR", func() {
		It("returns an error if unable to get CR", func() {
			mockIBPClient.GetCRReturns(errors.New("get error"))
			_, _, err := testCA.GetCR(ca.ALL, "ca1", "testNS", "default")
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("get error"))
		})

		It("successfully gets the CR", func() {
			_, _, err := testCA.GetCR(ca.ALL, "ca1", "testNS", "default")
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("GetResources", func() {
		var currentResources *corev1.ResourceRequirements
		var overrideResources *corev1.ResourceRequirements
		var currenctCAres *current.CAResources
		var overrideCAres *current.CAResources
		var deployerDefualt *cfg.DeployerDefaults

		BeforeEach(func() {
			res := map[corev1.ResourceName]resource.Quantity{}
			res[corev1.ResourceCPU] = resource.MustParse("1")
			res[corev1.ResourceMemory] = resource.MustParse("1Mi")
			currentResources = &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			}
			currenctCAres = &current.CAResources{
				Init: currentResources,
				CA:   currentResources.DeepCopy(),
			}
			deployerDefualt = &cfg.DeployerDefaults{
				Resources: &cfg.Resources{
					CA: currenctCAres,
				},
			}

			overrideres := map[corev1.ResourceName]resource.Quantity{}
			overrideres[corev1.ResourceCPU] = resource.MustParse("2")
			overrideres[corev1.ResourceMemory] = resource.MustParse("2Mi")
			overrideResources = &corev1.ResourceRequirements{
				Requests: overrideres,
				Limits:   overrideres,
			}
			overrideCAres = &current.CAResources{
				Init: overrideResources,
				CA:   overrideResources.DeepCopy(),
			}

		})
		It("Should return the override resources over if limits and requests are set", func() {
			finalRes := testCA.GetResources(deployerDefualt, overrideCAres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CA.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CA.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if limits is set to nil", func() {
			overrideCAres.Init.Limits = nil
			overrideCAres.CA.Limits = nil

			finalRes := testCA.GetResources(deployerDefualt, overrideCAres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CA.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CA.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if requests is set to nil", func() {
			overrideCAres.Init.Requests = nil
			overrideCAres.CA.Requests = nil

			finalRes := testCA.GetResources(deployerDefualt, overrideCAres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CA.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CA.Limits).To(Equal(overrideResources.Limits))
		})
	})

	Context("CheckReplicas", func() {
		var (
			replicas       *int32
			configOverride *current.ConfigOverride

			caConfig    *ibpca.ServerConfig
			tlscaConfig *ibpca.ServerConfig
		)

		BeforeEach(func() {
			val := int32(2)
			replicas = &val

			caConfig = &ibpca.ServerConfig{
				CAConfig: ibpca.CAConfig{
					DB: &ibpca.CAConfigDB{
						Type:       "postgres",
						Datasource: "fake",
					},
				},
			}
			caBytes, err := json.Marshal(caConfig)
			Expect(err).NotTo(HaveOccurred())
			caJson := json.RawMessage(caBytes)

			tlscaConfig = &ibpca.ServerConfig{
				CAConfig: ibpca.CAConfig{
					DB: &ibpca.CAConfigDB{
						Type:       "postgres",
						Datasource: "fake",
					},
				},
			}
			tlscaBytes, err := json.Marshal(tlscaConfig)
			Expect(err).NotTo(HaveOccurred())
			tlscaJson := json.RawMessage(tlscaBytes)

			configOverride = &current.ConfigOverride{
				CA:    &runtime.RawExtension{Raw: caJson},
				TLSCA: &runtime.RawExtension{Raw: tlscaJson},
			}
		})

		When("CA configoverride is configured for replicas > 1", func() {
			It("gives an error if replicas > 1 and configoverride is not set", func() {
				configOverride = nil

				err := testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("CA & TLSCA config override should be passed to allow replicas > 1"))
			})

			It("gives an error if replicas > 1 and Override has nil objects", func() {
				configOverride = &current.ConfigOverride{
					CA:    nil,
					TLSCA: nil,
				}

				err := testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("CA & TLSCA config override should be passed to allow replicas > 1"))
			})

			It("gives an error if replicas > 1 and TLSCA Override has nil objects", func() {
				configOverride.TLSCA = nil

				err := testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("TLSCA config override missing to allow replicas > 1"))
			})

			It("gives an error if replicas > 1 and CA & TLSCA DB Type is not postgres", func() {
				caConfig := &ibpca.ServerConfig{}
				caBytes, err := json.Marshal(caConfig)
				Expect(err).NotTo(HaveOccurred())
				caJson := json.RawMessage(caBytes)

				configOverride = &current.ConfigOverride{
					CA:    &runtime.RawExtension{Raw: caJson},
					TLSCA: &runtime.RawExtension{Raw: caJson},
				}

				err = testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("DB Type in CA & TLSCA config override should be `postgres` to allow replicas > 1"))
			})

			It("gives an error if replicas > 1 and CA DB Type is not postgres", func() {
				caConfig := &ibpca.ServerConfig{
					CAConfig: ibpca.CAConfig{
						DB: &ibpca.CAConfigDB{
							Type: "sqlite",
						},
					},
				}
				caBytes, err := json.Marshal(caConfig)
				Expect(err).NotTo(HaveOccurred())
				caJson := json.RawMessage(caBytes)

				configOverride.CA = &runtime.RawExtension{Raw: caJson}

				err = testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("DB Type in CA config override should be `postgres` to allow replicas > 1"))
			})

			It("gives an error if replicas > 1 and TLSCA DB Type is not postgres", func() {
				tlscaConfig := &ibpca.ServerConfig{
					CAConfig: ibpca.CAConfig{
						DB: &ibpca.CAConfigDB{
							Type: "sqlite",
						},
					},
				}
				tlscaBytes, err := json.Marshal(tlscaConfig)
				Expect(err).NotTo(HaveOccurred())
				tlscaJson := json.RawMessage(tlscaBytes)
				configOverride.TLSCA = &runtime.RawExtension{Raw: tlscaJson}

				err = testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("DB Type in TLSCA config override should be `postgres` to allow replicas > 1"))
			})

			It("gives an error if replicas > 1 and TLSCA Override has no datasource", func() {
				tlscaConfig := &ibpca.ServerConfig{
					CAConfig: ibpca.CAConfig{
						DB: &ibpca.CAConfigDB{
							Type: "postgres",
						},
					},
				}
				tlscaBytes, err := json.Marshal(tlscaConfig)
				Expect(err).NotTo(HaveOccurred())
				tlscaJson := json.RawMessage(tlscaBytes)

				configOverride.TLSCA = &runtime.RawExtension{Raw: tlscaJson}

				err = testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("Datasource in TLSCA config override should not be empty to allow replicas > 1"))
			})

			It("gives an error if replicas > 1 and CA Override has no datasource", func() {
				caConfig := &ibpca.ServerConfig{
					CAConfig: ibpca.CAConfig{
						DB: &ibpca.CAConfigDB{
							Type: "postgres",
						},
					},
				}
				caBytes, err := json.Marshal(caConfig)
				Expect(err).NotTo(HaveOccurred())
				caJson := json.RawMessage(caBytes)
				configOverride.CA = &runtime.RawExtension{Raw: caJson}

				err = testCA.CheckReplicas(replicas, configOverride)
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(Equal("Datasource in CA config override should not be empty to allow replicas > 1"))
			})

			It("returns nil if replicas > 1 and config override is valid", func() {
				err = testCA.CheckReplicas(replicas, configOverride)
				Expect(err).NotTo(HaveOccurred())
			})
		})
	})

})
