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
	"errors"
	"fmt"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/mocks"
	configpeer "github.com/IBM-Blockchain/fabric-operator/api/peer/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

var _ = Describe("Peer", func() {
	var (
		err           error
		testPeer      *peer.Peer
		mockKube      *mocks.Kube
		mockIBPClient *mocks.IBPOperatorClient
		logger        *zap.Logger
		cfg           *config.DeployerSettingsConfig
		resources     *current.PeerResources
	)

	BeforeEach(func() {
		logger, err = zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		storage := &current.PeerStorages{
			StateDB: &current.StorageSpec{
				Size:  "1Gi",
				Class: "default",
			},
			Peer: &current.StorageSpec{
				Size:  "1Gi",
				Class: "default",
			},
		}
		res := map[corev1.ResourceName]resource.Quantity{}
		res[corev1.ResourceCPU] = resource.MustParse("1")
		res[corev1.ResourceMemory] = resource.MustParse("1Mi")
		resources = &current.PeerResources{
			DinD: &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			},
			CouchDB: &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			},
			Peer: &corev1.ResourceRequirements{
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
		}
		cfg = &config.DeployerSettingsConfig{
			Defaults: &config.DeployerDefaults{
				Storage: &config.Storage{
					Peer: storage,
				},
				Resources: &config.Resources{
					Peer: resources,
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
			Timeouts: &config.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
		}
		testPeer = peer.New(logger, nil, nil, cfg)

		mockKube = &mocks.Kube{}
		mockIBPClient = &mocks.IBPOperatorClient{}
		testPeer.Kube = mockKube
		testPeer.IBPOperatorClient = mockIBPClient

		mockIBPClient.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
			p := peerCR.(*current.IBPPeer)
			p.Spec = current.IBPPeerSpec{
				Resources: resources,
				Storage:   storage,
			}
			p.Status = current.IBPPeerStatus{
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
			connectionProfile := &common.ConnectionProfile{
				Endpoints: current.PeerEndpoints{
					API:        "fake",
					Operations: "fake",
				},
				TLS: &tls{
					Cert: "tlscert",
				},
				Component: &tls{
					Cert: "ecert",
				},
			}
			connectionProfileBytes, _ := json.Marshal(connectionProfile)

			coreYaml := &configpeer.Core{}
			coreYamlBytes, _ := json.Marshal(coreYaml)
			cm := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: namespace,
				},
				BinaryData: map[string][]byte{"profile.json": connectionProfileBytes, "core.yaml": coreYamlBytes},
			}
			return cm, nil
		}
	})

	Context("Create Custom Resource", func() {
		var body []byte

		BeforeEach(func() {
			mockKube.GetServiceReturns(&corev1.Service{}, nil)

			res := map[corev1.ResourceName]resource.Quantity{}
			res[corev1.ResourceCPU] = resource.MustParse("1")
			res[corev1.ResourceMemory] = resource.MustParse("1Mi")

			b := api.CreateRequest{
				Resources: &current.PeerResources{
					Peer: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					GRPCProxy: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					DinD: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					CouchDB: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					FluentD: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
				},
			}
			body, err = json.Marshal(b)
			Expect(err).NotTo(HaveOccurred())

		})

		It("returns an error if component name not passed", func() {
			_, _, err := testPeer.CreateCR("0.0.0.0", "sID1", "", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("component name not valid, cannot be empty"))
		})

		It("returns an error if it fails create custom resource", func() {
			mockIBPClient.CreateCRReturns(errors.New("create CR error"))
			_, _, err := testPeer.CreateCR("0.0.0.0", "sID1", "peer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("create CR error"))
		})

		It("returns an error if version passed is not valid", func() {
			b := api.CreateRequest{
				Version: "1.2.3",
			}
			body, err = json.Marshal(b)
			Expect(err).NotTo(HaveOccurred())
			_, _, err := testPeer.CreateCR("0.0.0.0", "sID1", "peer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("version not valid"))
		})

		It("creates Peer custom resource", func() {
			testPeer.Config.Timeouts = &config.Timeouts{
				Deployment: 1 * 100,
			}
			_, _, err := testPeer.CreateCR("0.0.0.0", "sID1", "peer1", "default", body)
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns error if get CR timesout", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
				c := peerCR.(*current.IBPPeer)
				c.Spec = current.IBPPeerSpec{}
				c.Status = current.IBPPeerStatus{
					CRStatus: current.CRStatus{
						Status: current.False,
					},
				}
				return nil
			}
			testPeer.Config.Timeouts = &config.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testPeer.CreateCR("0.0.0.0", "sID1", "peer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(statusCode).Should(Equal(500))
		})

		It("returns 500 if CR status is error", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
				c := peerCR.(*current.IBPPeer)
				c.Spec = current.IBPPeerSpec{
					Resources: resources,
				}
				c.Status = current.IBPPeerStatus{
					CRStatus: current.CRStatus{
						Status: current.True,
						Type:   current.Error,
					},
				}
				return nil
			}
			testPeer.Config.Timeouts = &config.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testPeer.CreateCR("0.0.0.0", "sID1", "peer1", "default", body)
			Expect(err).NotTo(HaveOccurred())
			Expect(statusCode).Should(Equal(500))
		})

		It("returns no error if CR status is deployed", func() {
			mockIBPClient.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
				res := map[corev1.ResourceName]resource.Quantity{}
				res[corev1.ResourceCPU] = resource.MustParse("1")
				res[corev1.ResourceMemory] = resource.MustParse("1Mi")
				c := peerCR.(*current.IBPPeer)
				c.Spec = current.IBPPeerSpec{
					Resources: &current.PeerResources{
						Peer: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						CCLauncher: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						CouchDB: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						DinD: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						FluentD: &corev1.ResourceRequirements{
							Requests: res,
							Limits:   res,
						},
						GRPCProxy: &corev1.ResourceRequirements{
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
					},
				}
				c.Status = current.IBPPeerStatus{
					CRStatus: current.CRStatus{
						Status: current.True,
						Type:   current.Deployed,
					},
				}
				return nil
			}
			testPeer.Config.Timeouts = &config.Timeouts{
				Deployment: 1 * 100,
			}
			_, statusCode, err := testPeer.CreateCR("0.0.0.0", "sID1", "peer1", "default", body)
			Expect(err).NotTo(HaveOccurred())
			Expect(statusCode).Should(Equal(200))
		})
	})

	Context("Delete Custom Resource", func() {
		It("returns error if component name is not passed", func() {
			_, _, err := testPeer.DeleteCR("sID", "", "namespace", nil)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("Name of the component to be delete is required"))
		})

		It("returns error if body is not json", func() {
			_, _, err := testPeer.DeleteCR("sID", "name", "namespace", []byte{1})
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(ContainSubstring("failed to unmarshal configuration"))
		})

		It("returns error if delete CR fails", func() {
			mockIBPClient.DeleteCRReturns(errors.New("Error deleting CR"))
			_, _, err := testPeer.DeleteCR("sID", "name", "namespace", []byte{})
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("Error deleting CR"))
		})

		It("runs fine", func() {
			resp, _, err := testPeer.DeleteCR("sID", "name", "namespace", []byte{})
			Expect(err).To(BeNil())
			Expect(resp.Message).To(Equal("ok"))
		})
	})

	Context("Update Custom Resource", func() {
		var body []byte

		BeforeEach(func() {
			b := api.UpdateRequest{
				Resources: &current.PeerResources{
					Peer:       &corev1.ResourceRequirements{},
					GRPCProxy:  &corev1.ResourceRequirements{},
					DinD:       &corev1.ResourceRequirements{},
					CouchDB:    &corev1.ResourceRequirements{},
					FluentD:    &corev1.ResourceRequirements{},
					CCLauncher: &corev1.ResourceRequirements{},
					Enroller:   &corev1.ResourceRequirements{},
					HSMDaemon:  &corev1.ResourceRequirements{},
				},
			}
			body, err = json.Marshal(b)
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns an error if it fails to find custom resource", func() {
			mockIBPClient.GetCRReturns(errors.New("CR not found"))
			_, _, err := testPeer.UpdateCR(peer.ALL, "sID1", "peer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to get cr for 'sID1' in namespace 'peer1': CR not found"))
		})

		It("returns an error if it fails update custom resource", func() {
			mockIBPClient.UpdateCRReturns(errors.New("update CR error"))
			_, _, err := testPeer.UpdateCR(peer.ALL, "sID1", "peer1", "default", body)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed update cr 'sID1' in namespace 'peer1': update CR error"))
		})

		It("updates custom resource", func() {
			_, _, err := testPeer.UpdateCR(peer.ALL, "sID1", "peer1", "default", body)
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
				resp, _, err := testPeer.UpdateCR(peer.ALL, "sID1", "peer1", "default", body)
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

		Context("update node OU", func() {
			BeforeEach(func() {
				f := false
				b := api.UpdateRequest{
					NodeOU: &api.NodeOU{
						Enabled: &f,
					},
				}
				body, err = json.Marshal(b)
				Expect(err).NotTo(HaveOccurred())
			})

			It("returns nodeOU disabled", func() {
				disableNodeou := true
				storage := &current.PeerStorages{
					StateDB: &current.StorageSpec{
						Size:  "1Gi",
						Class: "default",
					},
					Peer: &current.StorageSpec{
						Size:  "1Gi",
						Class: "default",
					},
				}
				res := map[corev1.ResourceName]resource.Quantity{}
				res[corev1.ResourceCPU] = resource.MustParse("1")
				res[corev1.ResourceMemory] = resource.MustParse("1Mi")
				resources := &current.PeerResources{
					DinD: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					CouchDB: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					Peer: &corev1.ResourceRequirements{
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
				}
				mockIBPClient.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
					p := peerCR.(*current.IBPPeer)
					p.Spec = current.IBPPeerSpec{
						DisableNodeOU: &disableNodeou,
						Resources:     resources,
						Storage:       storage,
					}
					p.Status = current.IBPPeerStatus{
						CRStatus: current.CRStatus{
							Type:    current.Deployed,
							Status:  current.True,
							Reason:  "",
							Message: "",
						},
					}
					return nil
				}
				resp, _, err := testPeer.UpdateCR(peer.ALL, "sID1", "peer1", "default", body)
				Expect(err).NotTo(HaveOccurred())
				fmt.Printf("%+v", resp)
				fmt.Printf("node ou is %+v", resp.NodeOU)
				Expect(*resp.NodeOU.Enabled).To(Equal(false))
			})
		})

		Context("update msp config", func() {
			BeforeEach(func() {
				b := api.UpdateRequest{
					Config: &current.SecretSpec{
						MSP: &current.MSPSpec{
							Component: &current.MSP{
								AdminCerts: []string{"cert"},
							},
						},
					},
				}
				body, err = json.Marshal(b)
				Expect(err).NotTo(HaveOccurred())
			})

			It("returns admin certs from original CR if none passed in request.Config or request.AdminCerts", func() {
				resp, _, err := testPeer.UpdateCR(peer.ALL, "sID1", "peer1", "default", []byte{})
				Expect(err).NotTo(HaveOccurred())
				Expect(resp.AdminCerts).To(BeNil())
			})
		})
	})

	Context("Get CR", func() {
		It("returns an error if unable to get CR", func() {
			mockIBPClient.GetCRReturns(errors.New("get error"))
			_, _, err := testPeer.GetCR(ca.ALL, "peer1", "testNS", "default")
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("get error"))
		})

		It("successfully gets the CR", func() {
			resp, _, err := testPeer.GetCR(ca.ALL, "peer1", "testNS", "default")
			Expect(err).NotTo(HaveOccurred())

			By("returning nodeOU enabled if originalCR spec doesn't disable nodeOU", func() {
				Expect(*resp.NodeOU.Enabled).To(Equal(true))
			})
		})
	})

	Describe("GetUpdateResources", func() {
		var currentResources *corev1.ResourceRequirements
		var overrideResources *corev1.ResourceRequirements
		var currentPeerres *current.PeerResources
		var overridePeerres *current.PeerResources

		BeforeEach(func() {
			res := map[corev1.ResourceName]resource.Quantity{}
			res[corev1.ResourceCPU] = resource.MustParse("1")
			res[corev1.ResourceMemory] = resource.MustParse("1Mi")
			currentResources = &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			}
			currentPeerres = &current.PeerResources{
				Init:       currentResources.DeepCopy(),
				Peer:       currentResources.DeepCopy(),
				GRPCProxy:  currentResources.DeepCopy(),
				FluentD:    currentResources.DeepCopy(),
				DinD:       currentResources.DeepCopy(),
				CouchDB:    currentResources.DeepCopy(),
				CCLauncher: currentResources.DeepCopy(),
				Enroller:   currentResources.DeepCopy(),
				HSMDaemon:  currentResources.DeepCopy(),
			}

			overrideres := map[corev1.ResourceName]resource.Quantity{}
			overrideres[corev1.ResourceCPU] = resource.MustParse("2")
			overrideres[corev1.ResourceMemory] = resource.MustParse("2Mi")
			overrideResources = &corev1.ResourceRequirements{
				Requests: overrideres,
				Limits:   overrideres,
			}
			overridePeerres = &current.PeerResources{
				Init:       overrideResources.DeepCopy(),
				Peer:       overrideResources.DeepCopy(),
				GRPCProxy:  overrideResources.DeepCopy(),
				FluentD:    overrideResources.DeepCopy(),
				DinD:       overrideResources.DeepCopy(),
				CouchDB:    overrideResources.DeepCopy(),
				CCLauncher: overrideResources.DeepCopy(),
				Enroller:   overrideResources.DeepCopy(),
				HSMDaemon:  overrideResources.DeepCopy(),
			}

		})
		It("Should return the override resources over if limits and requests are set", func() {
			finalRes, err := testPeer.GetUpdateResources(currentPeerres, overridePeerres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Peer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Peer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.FluentD.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.FluentD.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.DinD.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.DinD.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CouchDB.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CouchDB.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CCLauncher.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CCLauncher.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if limits is set to nil", func() {
			overridePeerres.Init.Limits = nil
			overridePeerres.Peer.Limits = nil
			overridePeerres.GRPCProxy.Limits = nil
			overridePeerres.FluentD.Limits = nil
			overridePeerres.DinD.Limits = nil
			overridePeerres.CouchDB.Limits = nil
			overridePeerres.CCLauncher.Limits = nil
			overridePeerres.Enroller.Limits = nil
			overridePeerres.HSMDaemon.Limits = nil

			finalRes, err := testPeer.GetUpdateResources(currentPeerres, overridePeerres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Peer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Peer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.FluentD.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.FluentD.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.DinD.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.DinD.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CouchDB.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CouchDB.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CCLauncher.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CCLauncher.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
		It("Should copy the resources over if requests is set to nil", func() {
			overridePeerres.Init.Requests = nil
			overridePeerres.Peer.Requests = nil
			overridePeerres.GRPCProxy.Requests = nil
			overridePeerres.FluentD.Requests = nil
			overridePeerres.DinD.Requests = nil
			overridePeerres.CouchDB.Requests = nil
			overridePeerres.CCLauncher.Requests = nil
			overridePeerres.Enroller.Requests = nil
			overridePeerres.HSMDaemon.Requests = nil

			finalRes, err := testPeer.GetUpdateResources(currentPeerres, overridePeerres)
			Expect(err).ToNot(HaveOccurred())
			Expect(finalRes).NotTo(BeNil())

			Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Peer.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Peer.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.FluentD.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.FluentD.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.DinD.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.DinD.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CouchDB.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CouchDB.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.CCLauncher.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.CCLauncher.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
			Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
			Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
		})
	})

	Describe("GetResources", func() {
		var currentResources *corev1.ResourceRequirements
		var overrideResources *corev1.ResourceRequirements
		var currentPeerres *current.PeerResources
		var overridePeerres *current.PeerResources
		var deployerDefualt *config.DeployerDefaults

		BeforeEach(func() {
			res := map[corev1.ResourceName]resource.Quantity{}
			res[corev1.ResourceCPU] = resource.MustParse("1")
			res[corev1.ResourceMemory] = resource.MustParse("1Mi")
			currentResources = &corev1.ResourceRequirements{
				Requests: res,
				Limits:   res,
			}
			currentPeerres = &current.PeerResources{
				Init:       currentResources.DeepCopy(),
				Peer:       currentResources.DeepCopy(),
				GRPCProxy:  currentResources.DeepCopy(),
				FluentD:    currentResources.DeepCopy(),
				DinD:       currentResources.DeepCopy(),
				CouchDB:    currentResources.DeepCopy(),
				CCLauncher: currentResources.DeepCopy(),
				Enroller:   currentResources.DeepCopy(),
				HSMDaemon:  currentResources.DeepCopy(),
			}
			deployerDefualt = &config.DeployerDefaults{
				Resources: &config.Resources{
					Peer: currentPeerres,
				},
			}

			overrideres := map[corev1.ResourceName]resource.Quantity{}
			overrideres[corev1.ResourceCPU] = resource.MustParse("2")
			overrideres[corev1.ResourceMemory] = resource.MustParse("2Mi")
			overrideResources = &corev1.ResourceRequirements{
				Requests: overrideres,
				Limits:   overrideres,
			}
			overridePeerres = &current.PeerResources{
				Init:       overrideResources.DeepCopy(),
				Peer:       overrideResources.DeepCopy(),
				GRPCProxy:  overrideResources.DeepCopy(),
				FluentD:    overrideResources.DeepCopy(),
				DinD:       overrideResources.DeepCopy(),
				CouchDB:    overrideResources.DeepCopy(),
				CCLauncher: overrideResources.DeepCopy(),
				Enroller:   overrideResources.DeepCopy(),
				HSMDaemon:  overrideResources.DeepCopy(),
			}

		})

		Context("v2.x peer", func() {
			Context("couchdb", func() {
				commonAssertsion := func(finalRes *current.PeerResources) {
					Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Peer.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Peer.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.CouchDB.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.CouchDB.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.CCLauncher.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.CCLauncher.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.DinD).To(BeNil())
					Expect(finalRes.FluentD).To(BeNil())
				}

				It("Should return the override resources over if limits and requests are set", func() {
					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "couchdb", "2.0.0")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if limits is set to nil", func() {
					overridePeerres.Init.Limits = nil
					overridePeerres.Peer.Limits = nil
					overridePeerres.GRPCProxy.Limits = nil
					overridePeerres.FluentD.Limits = nil
					overridePeerres.DinD.Limits = nil
					overridePeerres.CouchDB.Limits = nil
					overridePeerres.CCLauncher.Limits = nil
					overridePeerres.Enroller.Limits = nil
					overridePeerres.HSMDaemon.Limits = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "couchdb", "2.0.0")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if requests is set to nil", func() {
					overridePeerres.Init.Requests = nil
					overridePeerres.Peer.Requests = nil
					overridePeerres.GRPCProxy.Requests = nil
					overridePeerres.FluentD.Requests = nil
					overridePeerres.DinD.Requests = nil
					overridePeerres.CouchDB.Requests = nil
					overridePeerres.CCLauncher.Requests = nil
					overridePeerres.Enroller.Requests = nil
					overridePeerres.HSMDaemon.Requests = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "couchdb", "2.0.0")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})
			})

			Context("leveldb", func() {
				commonAssertsion := func(finalRes *current.PeerResources) {
					Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Peer.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Peer.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.CCLauncher.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.CCLauncher.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.DinD).To(BeNil())
					Expect(finalRes.FluentD).To(BeNil())
					Expect(finalRes.CouchDB).To(BeNil())
				}

				It("Should return the override resources over if limits and requests are set", func() {
					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "leveldb", "2.0.0")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if limits is set to nil", func() {
					overridePeerres.Init.Limits = nil
					overridePeerres.Peer.Limits = nil
					overridePeerres.GRPCProxy.Limits = nil
					overridePeerres.FluentD.Limits = nil
					overridePeerres.DinD.Limits = nil
					overridePeerres.CouchDB.Limits = nil
					overridePeerres.CCLauncher.Limits = nil
					overridePeerres.Enroller.Limits = nil
					overridePeerres.HSMDaemon.Limits = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "leveldb", "2.0.0")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if requests is set to nil", func() {
					overridePeerres.Init.Requests = nil
					overridePeerres.Peer.Requests = nil
					overridePeerres.GRPCProxy.Requests = nil
					overridePeerres.FluentD.Requests = nil
					overridePeerres.DinD.Requests = nil
					overridePeerres.CouchDB.Requests = nil
					overridePeerres.CCLauncher.Requests = nil
					overridePeerres.Enroller.Requests = nil
					overridePeerres.HSMDaemon.Requests = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "leveldb", "2.0.0")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})
			})
		})

		Context("v1.4.x peer", func() {
			Context("couchdb", func() {
				commonAssertsion := func(finalRes *current.PeerResources) {
					Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Peer.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Peer.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.CouchDB.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.CouchDB.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.DinD.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.DinD.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.FluentD.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.FluentD.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.CCLauncher).To(BeNil())
				}

				It("Should return the override resources over if limits and requests are set", func() {
					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "couchdb", "1.4.9")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if limits is set to nil", func() {
					overridePeerres.Init.Limits = nil
					overridePeerres.Peer.Limits = nil
					overridePeerres.GRPCProxy.Limits = nil
					overridePeerres.FluentD.Limits = nil
					overridePeerres.DinD.Limits = nil
					overridePeerres.CouchDB.Limits = nil
					overridePeerres.CCLauncher.Limits = nil
					overridePeerres.Enroller.Limits = nil
					overridePeerres.HSMDaemon.Limits = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "couchdb", "1.4.9")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if requests is set to nil", func() {
					overridePeerres.Init.Requests = nil
					overridePeerres.Peer.Requests = nil
					overridePeerres.GRPCProxy.Requests = nil
					overridePeerres.FluentD.Requests = nil
					overridePeerres.DinD.Requests = nil
					overridePeerres.CouchDB.Requests = nil
					overridePeerres.CCLauncher.Requests = nil
					overridePeerres.Enroller.Requests = nil
					overridePeerres.HSMDaemon.Requests = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "couchdb", "1.4.9")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})
			})

			Context("leveldb", func() {
				commonAssertsion := func(finalRes *current.PeerResources) {
					Expect(finalRes.Init.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Init.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Peer.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Peer.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.GRPCProxy.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.GRPCProxy.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.DinD.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.DinD.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.FluentD.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.FluentD.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.Enroller.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.Enroller.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.HSMDaemon.Requests).To(Equal(overrideResources.Requests))
					Expect(finalRes.HSMDaemon.Limits).To(Equal(overrideResources.Limits))
					Expect(finalRes.CCLauncher).To(BeNil())
					Expect(finalRes.CouchDB).To(BeNil())
				}

				It("Should return the override resources over if limits and requests are set", func() {
					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "leveldb", "1.4.9")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if limits is set to nil", func() {
					overridePeerres.Init.Limits = nil
					overridePeerres.Peer.Limits = nil
					overridePeerres.GRPCProxy.Limits = nil
					overridePeerres.FluentD.Limits = nil
					overridePeerres.DinD.Limits = nil
					overridePeerres.CouchDB.Limits = nil
					overridePeerres.CCLauncher.Limits = nil
					overridePeerres.Enroller.Limits = nil
					overridePeerres.HSMDaemon.Limits = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "leveldb", "1.4.9")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})

				It("Should copy the resources over if requests is set to nil", func() {
					overridePeerres.Init.Requests = nil
					overridePeerres.Peer.Requests = nil
					overridePeerres.GRPCProxy.Requests = nil
					overridePeerres.FluentD.Requests = nil
					overridePeerres.DinD.Requests = nil
					overridePeerres.CouchDB.Requests = nil
					overridePeerres.CCLauncher.Requests = nil
					overridePeerres.Enroller.Requests = nil
					overridePeerres.HSMDaemon.Requests = nil

					finalRes := testPeer.GetResources(*deployerDefualt.Resources.Peer, overridePeerres, "leveldb", "1.4.9")
					Expect(err).ToNot(HaveOccurred())
					Expect(finalRes).NotTo(BeNil())

					commonAssertsion(finalRes)
				})
			})
		})
	})
})
