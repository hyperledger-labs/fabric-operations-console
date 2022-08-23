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
	"errors"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	orderer "github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/mocks"
	"github.com/IBM-Blockchain/fabric-deployer/offering"
	ordererconfig "github.com/IBM-Blockchain/fabric-operator/api/orderer/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

var _ = Describe("Orderer", func() {
	var (
		err           error
		testOrderer   *orderer.Orderer
		mockKube      *mocks.Kube
		mockIBPClient *mocks.IBPOperatorClient
		logger        *zap.Logger
		cfg           *config.DeployerSettingsConfig
		secretData    *current.SecretSpec
		resources     *current.OrdererResources
	)

	BeforeEach(func() {
		logger, err = zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		res := map[corev1.ResourceName]resource.Quantity{}
		res[corev1.ResourceCPU] = resource.MustParse("1")
		res[corev1.ResourceMemory] = resource.MustParse("1Mi")

		resources = &current.OrdererResources{
			GRPCProxy: &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			},
			Orderer: &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			},
			Init: &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			},
			Enroller: &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			},
			HSMDaemon: &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			},
		}
		storage := &current.OrdererStorages{
			Orderer: &current.StorageSpec{
				Size:  "1Gi",
				Class: "default",
			},
		}
		cfg = &config.DeployerSettingsConfig{
			Defaults: &config.DeployerDefaults{
				Storage: &config.Storage{
					Orderer: storage,
				},
				Resources: &config.Resources{
					Orderer: resources,
				},
			},
			ServiceConfig: config.ServiceConfig{
				Type: corev1.ServiceTypeNodePort,
			},
			Versions: &config.Versions{
				CA:      map[string]config.VersionCA{"1.4.1": config.VersionCA{Default: true}},
				Peer:    map[string]config.VersionPeer{"1.4.1": config.VersionPeer{Default: true}},
				Orderer: map[string]config.VersionOrderer{"1.4.1": config.VersionOrderer{Default: true}},
			},
			ClusterType: offering.K8S,
			Timeouts: &config.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
		}
		testOrderer = orderer.New(logger, nil, nil, cfg)

		mockKube = &mocks.Kube{}
		mockIBPClient = &mocks.IBPOperatorClient{}
		testOrderer.Kube = mockKube
		testOrderer.IBPOperatorClient = mockIBPClient

		mockKube.GetPodsByLabelReturns(&corev1.Pod{}, nil)
		mockIBPClient.GetCRStub = func(namespace string, kind string, name string, ordererCR runtime.Object) error {
			o := ordererCR.(*current.IBPOrderer)
			o.Spec = current.IBPOrdererSpec{
				Resources: resources,
				Storage:   storage,
				Secret: &current.SecretSpec{
					MSP: &current.MSPSpec{
						Component: &current.MSP{
							AdminCerts: []string{"original"},
						},
					},
				},
			}
			o.Status = current.IBPOrdererStatus{
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
			type profile struct {
				Endpoints interface{}
				TLS       interface{}
				Component interface{}
			}
			connectionProfile := &profile{
				Endpoints: current.PeerEndpoints{
					API:        "fake",
					Operations: "fake",
				},
				TLS: &current.ConnectionProfileTLS{
					Cert: "byte",
				},
				Component: &current.ConnectionProfileTLS{
					Cert: "byte",
				},
			}
			connectionProfileBytes, _ := json.Marshal(connectionProfile)
			ordererYaml := &ordererconfig.Orderer{}
			ordererYamlBytes, _ := json.Marshal(ordererYaml)
			cm := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: namespace,
				},
				BinaryData: map[string][]byte{"profile.json": connectionProfileBytes, "orderer.yaml": ordererYamlBytes},
			}
			return cm, nil
		}

		secretData = &current.SecretSpec{}
	})

	Context("Create Cluster", func() {
		var (
			b    api.CreateRequest
			err  error
			body []byte
		)

		BeforeEach(func() {
			mockKube.GetServiceReturns(&corev1.Service{}, nil)

			b = api.CreateRequest{
				Resources: &current.OrdererResources{
					Orderer:   &corev1.ResourceRequirements{},
					GRPCProxy: &corev1.ResourceRequirements{},
				},
				Config: []*current.SecretSpec{secretData},
				Prefix: "node",
			}

			body, err = json.Marshal(b)
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns an error if it fails to create orderer", func() {
			mockIBPClient.CreateCRReturns(errors.New("failed to create orderer"))

			_, _, err := testOrderer.CreateCluster("0.0.0.0", "sID1", "orderer", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to create orderer"))
		})

		It("creates Orderer cluster", func() {
			_, _, err := testOrderer.CreateCluster("0.0.0.0", "sID1", "orderer", body)
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("Create Custom Resource", func() {
		var body []byte

		BeforeEach(func() {
			mockKube.GetServiceReturns(&corev1.Service{}, nil)

			b := api.CreateRequest{
				Resources: &current.OrdererResources{
					Orderer:   &corev1.ResourceRequirements{},
					GRPCProxy: &corev1.ResourceRequirements{},
				},
				Config: []*current.SecretSpec{
					&current.SecretSpec{
						Enrollment: &current.EnrollmentSpec{},
					},
				},
				Prefix: "node",
			}

			podStatus := corev1.Pod{
				Status: corev1.PodStatus{},
			}
			mockKube.GetPodsByLabelReturns(&podStatus, nil)

			body, err = json.Marshal(b)
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns an error if component name not passed", func() {
			_, _, err := testOrderer.CreateCR("0.0.0.0", "sID1", "", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("component name not valid, cannot be empty"))
		})

		It("returns an error if it fails create custom resource", func() {
			mockIBPClient.CreateCRReturns(errors.New("create CR error"))
			_, _, err := testOrderer.CreateCR("0.0.0.0", "sID1", "orderer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to create orderer: create CR error"))
		})

		It("returns an error if version passed is not valid", func() {
			b := api.CreateRequest{
				Config: []*current.SecretSpec{
					&current.SecretSpec{
						Enrollment: &current.EnrollmentSpec{},
					},
				},
				Version: "1.2.3",
				Prefix:  "node",
			}
			body, err = json.Marshal(b)
			Expect(err).NotTo(HaveOccurred())

			_, _, err := testOrderer.CreateCR("0.0.0.0", "sID1", "orderer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to create orderer: version not valid"))
		})

		It("creates Orderer custom resource", func() {
			_, _, err := testOrderer.CreateCR("0.0.0.0", "sID1", "orderer1", "default", body)
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns error if get CR timesout", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, ordererCR runtime.Object) error {
				c := ordererCR.(*current.IBPOrderer)
				c.Spec = current.IBPOrdererSpec{
					ClusterSize: 1,
					Resources:   resources,
				}
				c.Status = current.IBPOrdererStatus{
					CRStatus: current.CRStatus{
						Status: current.False,
					},
				}
				return nil
			}
			testOrderer.Config.Timeouts = &config.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testOrderer.CreateCR("0.0.0.0", "sID1", "orderer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(statusCode).Should(Equal(500))

			By("creating CR with passed component name", func() {
				_, _, cr := mockIBPClient.CreateCRArgsForCall(0)
				orderer := cr.(*current.IBPOrderer)
				Expect(orderer.Name).To(Equal("orderer1"))
			})
		})

		It("returns 500 if CR status is error", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, ordererCR runtime.Object) error {
				c := ordererCR.(*current.IBPOrderer)
				c.Spec = current.IBPOrdererSpec{
					Resources: resources,
				}
				c.Status = current.IBPOrdererStatus{
					CRStatus: current.CRStatus{
						Status: current.True,
						Type:   current.Error,
					},
				}
				return nil
			}
			testOrderer.Config.Timeouts = &config.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testOrderer.CreateCR("0.0.0.0", "sID1", "orderer1", "default", body)
			Expect(err).NotTo(HaveOccurred())
			Expect(statusCode).Should(Equal(500))
		})

		It("returns no error if CR status is deployed", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, ordererCR runtime.Object) error {
				c := ordererCR.(*current.IBPOrderer)
				res := map[corev1.ResourceName]resource.Quantity{}
				res[corev1.ResourceCPU] = resource.MustParse("1")
				res[corev1.ResourceMemory] = resource.MustParse("1Mi")
				currentResources := &corev1.ResourceRequirements{
					Requests: res,
					Limits:   res,
				}
				c.Spec = current.IBPOrdererSpec{
					Resources: &current.OrdererResources{
						GRPCProxy: currentResources,
						Init:      currentResources,
						Orderer:   currentResources,
						Enroller:  currentResources,
						HSMDaemon: currentResources,
					},
				}
				c.Status = current.IBPOrdererStatus{
					CRStatus: current.CRStatus{
						Status: current.True,
						Type:   current.Deployed,
					},
				}
				return nil
			}
			testOrderer.Config.Timeouts = &config.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testOrderer.CreateCR("0.0.0.0", "sID1", "orderer1", "default", body)
			Expect(err).NotTo(HaveOccurred())
			Expect(statusCode).Should(Equal(200))
		})
	})

	Context("Delete Custom Resource", func() {
		It("returns error if body is not json", func() {
			_, _, err := testOrderer.DeleteCR("sID", "name", "namespace", []byte{1})
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(ContainSubstring("failed to unmarshal configuration"))
		})

		It("returns error if delete CR fails", func() {
			mockIBPClient.DeleteCRReturns(errors.New("Error deleting CR"))
			_, _, err := testOrderer.DeleteCR("sID", "name", "namespace", []byte{})
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("Error deleting CR"))
		})

		It("runs fine", func() {
			resp, _, err := testOrderer.DeleteCR("sID", "name", "namespace", []byte{})
			Expect(err).To(BeNil())
			Expect(resp.Message).To(Equal("ok"))
		})
	})

	Context("Update Custom Resource", func() {
		It("returns an error if it fails to find custom resource", func() {
			mockIBPClient.GetCRReturns(errors.New("CR not found"))
			_, _, err := testOrderer.UpdateCR(orderer.ALL, "sID1", "orderer1", "default", []byte{})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to get cr for 'sID1' in namespace 'orderer1': CR not found"))
		})

		It("returns an error if it fails update custom resource", func() {
			mockIBPClient.UpdateCRReturns(errors.New("update CR error"))
			_, _, err := testOrderer.UpdateCR(orderer.ALL, "sID1", "orderer1", "default", []byte{})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed update cr 'sID1' in namespace 'orderer1': update CR error"))
		})

		It("updates custom resource", func() {
			_, _, err := testOrderer.UpdateCR(orderer.ALL, "sID1", "orderer1node1", "default", []byte{})
			Expect(err).NotTo(HaveOccurred())
		})

		Context("config map updates", func() {
			It("returns nil config fields if config map is empty", func() {
				mockKube.GetConfigMapStub = func(namespace, name string) (*corev1.ConfigMap, error) {
					return &corev1.ConfigMap{
						ObjectMeta: metav1.ObjectMeta{
							Name:      name,
							Namespace: namespace,
						},
						BinaryData: map[string][]byte{},
					}, nil
				}
				resp, _, err := testOrderer.UpdateCR(orderer.ALL, "sID1", "orderer1", "default", []byte{})
				Expect(err).NotTo(HaveOccurred())
				Expect(resp).NotTo(BeNil())

				By("returning nil connection profile fields", func() {
					Expect(resp.Endpoints).To(BeNil())
					Expect(resp.MSP).To(BeNil())
				})

				By("returning nil orderer config", func() {
					Expect(resp.Config).To(BeNil())
				})
			})
		})

		Context("update nodeOU", func() {

			BeforeEach(func() {
				f := false
				b := api.UpdateRequest{
					NodeOU: &api.NodeOU{
						Enabled: &f,
					},
				}
				_, err := json.Marshal(b)
				Expect(err).NotTo(HaveOccurred())
			})

			It("returns nodeOU enabled if not disabled in spec", func() {
				resp, _, err := testOrderer.UpdateCR(orderer.ALL, "sID1", "peer1", "default", []byte{})
				Expect(err).NotTo(HaveOccurred())
				Expect(*resp.NodeOU.Enabled).To(Equal(true))
			})
		})
	})

	Context("Get CR", func() {
		It("returns an error if unable to get CR", func() {
			mockIBPClient.GetCRReturns(errors.New("get error"))
			_, _, err := testOrderer.GetCR(orderer.ALL, "orderer1", "testNS", "default")
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("get error"))
		})

		It("successfully gets the CR", func() {
			resp, _, err := testOrderer.GetCR(orderer.ALL, "orderer1", "testNS", "default")
			Expect(err).NotTo(HaveOccurred())

			By("returning nodeOU enabled if originalCR spec doesn't disable nodeOU", func() {
				Expect(*resp.NodeOU.Enabled).To(Equal(true))
			})
		})

		It("updates custom resource", func() {
			_, _, err := testOrderer.UpdateCR(orderer.ALL, "sID1", "orderer1", "default", []byte{})
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("GetUpdateResources", func() {
		var currentResources *corev1.ResourceRequirements
		var overrideResources *corev1.ResourceRequirements
		var currenctOrdererres *current.OrdererResources
		var overrideOrdererres *current.OrdererResources

		BeforeEach(func() {
			res := map[corev1.ResourceName]resource.Quantity{}
			res[corev1.ResourceCPU] = resource.MustParse("1")
			res[corev1.ResourceMemory] = resource.MustParse("1Mi")
			currentResources = &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			}
			currenctOrdererres = &current.OrdererResources{
				Init:      currentResources.DeepCopy(),
				Orderer:   currentResources.DeepCopy(),
				GRPCProxy: currentResources.DeepCopy(),
				Enroller:  currentResources.DeepCopy(),
				HSMDaemon: currentResources.DeepCopy(),
			}

			overrideres := map[corev1.ResourceName]resource.Quantity{}
			overrideres[corev1.ResourceCPU] = resource.MustParse("2")
			overrideres[corev1.ResourceMemory] = resource.MustParse("2Mi")
			overrideResources = &corev1.ResourceRequirements{
				Requests: overrideres,
				Limits:   overrideres,
			}
			overrideOrdererres = &current.OrdererResources{
				Init:      overrideResources.DeepCopy(),
				Orderer:   overrideResources.DeepCopy(),
				GRPCProxy: overrideResources.DeepCopy(),
				Enroller:  overrideResources.DeepCopy(),
				HSMDaemon: overrideResources.DeepCopy(),
			}
		})

		It("Should return the override resources over if limits and requests are set", func() {
			finalRes, err := testOrderer.GetUpdateResources(currenctOrdererres, overrideOrdererres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Orderer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Orderer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if limits is set to nil", func() {
			overrideOrdererres.Init.Limits = nil
			overrideOrdererres.Orderer.Limits = nil
			overrideOrdererres.GRPCProxy.Limits = nil
			overrideOrdererres.Enroller.Limits = nil
			overrideOrdererres.HSMDaemon.Limits = nil

			finalRes, err := testOrderer.GetUpdateResources(currenctOrdererres, overrideOrdererres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Orderer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Orderer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if requests is set to nil", func() {
			overrideOrdererres.Init.Requests = nil
			overrideOrdererres.Orderer.Requests = nil
			overrideOrdererres.GRPCProxy.Requests = nil
			overrideOrdererres.Enroller.Requests = nil
			overrideOrdererres.HSMDaemon.Requests = nil

			finalRes, err := testOrderer.GetUpdateResources(currenctOrdererres, overrideOrdererres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Orderer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Orderer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
	})

	Context("GetResources", func() {
		var currentResources *corev1.ResourceRequirements
		var overrideResources *corev1.ResourceRequirements
		var currenctOrdererres *current.OrdererResources
		var overrideOrdererres *current.OrdererResources
		var deployerDefualt *config.DeployerDefaults

		BeforeEach(func() {
			res := map[corev1.ResourceName]resource.Quantity{}
			res[corev1.ResourceCPU] = resource.MustParse("1")
			res[corev1.ResourceMemory] = resource.MustParse("1Mi")
			currentResources = &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			}
			currenctOrdererres = &current.OrdererResources{
				Init:      currentResources.DeepCopy(),
				Orderer:   currentResources.DeepCopy(),
				GRPCProxy: currentResources.DeepCopy(),
				Enroller:  currentResources.DeepCopy(),
				HSMDaemon: currentResources.DeepCopy(),
			}
			deployerDefualt = &config.DeployerDefaults{
				Resources: &config.Resources{
					Orderer: currenctOrdererres,
				},
			}

			overrideres := map[corev1.ResourceName]resource.Quantity{}
			overrideres[corev1.ResourceCPU] = resource.MustParse("2")
			overrideres[corev1.ResourceMemory] = resource.MustParse("2Mi")
			overrideResources = &corev1.ResourceRequirements{
				Requests: overrideres,
				Limits:   overrideres,
			}
			overrideOrdererres = &current.OrdererResources{
				Init:      overrideResources.DeepCopy(),
				Orderer:   overrideResources.DeepCopy(),
				GRPCProxy: overrideResources.DeepCopy(),
				Enroller:  overrideResources.DeepCopy(),
				HSMDaemon: overrideResources.DeepCopy(),
			}
		})

		It("Should return the override resources over if limits and requests are set", func() {
			finalRes := testOrderer.GetResources(deployerDefualt, overrideOrdererres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Orderer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Orderer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if limits is set to nil", func() {
			overrideOrdererres.Init.Limits = nil
			overrideOrdererres.Orderer.Limits = nil
			overrideOrdererres.GRPCProxy.Limits = nil
			overrideOrdererres.Enroller.Limits = nil
			overrideOrdererres.HSMDaemon.Limits = nil

			finalRes := testOrderer.GetResources(deployerDefualt, overrideOrdererres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Orderer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Orderer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if requests is set to nil", func() {
			overrideOrdererres.Init.Requests = nil
			overrideOrdererres.Orderer.Requests = nil
			overrideOrdererres.GRPCProxy.Requests = nil
			overrideOrdererres.Enroller.Requests = nil
			overrideOrdererres.HSMDaemon.Requests = nil

			finalRes := testOrderer.GetResources(deployerDefualt, overrideOrdererres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Orderer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Orderer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
	})

})
