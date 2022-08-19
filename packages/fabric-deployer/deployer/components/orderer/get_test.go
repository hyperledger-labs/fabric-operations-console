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

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	cfg "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/mocks"
	ordererconfig "github.com/IBM-Blockchain/fabric-operator/api/orderer/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("GET API", func() {
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

		logger, err := zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

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
				Orderer: map[string]cfg.VersionOrderer{"1.4.1": cfg.VersionOrderer{Default: true}},
			},
			Timeouts: &cfg.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
		}

		client.GetCRStub = func(namespace string, kind string, name string, ordererCR runtime.Object) error {
			p := ordererCR.(*current.IBPOrderer)
			p.Spec = current.IBPOrdererSpec{
				Resources: cfg.Defaults.Resources.Orderer,
				Storage:   cfg.Defaults.Storage.Orderer,
				Images: &current.OrdererImages{
					OrdererTag: "1.4.7-20200714-amd64",
				},
				FabricVersion: "V1.4",
			}
			return nil
		}

		ordererComp = &orderer.Orderer{
			Logger:            logger.Sugar().Named("Orderer"),
			Kube:              kube,
			IBPOperatorClient: client,
			Config:            cfg,
		}

		client.GetAllCRStub = func(namespace string, kind string, crList runtime.Object) error {
			list := crList.(*current.IBPOrdererList)
			p := &current.IBPOrderer{}
			p.Spec = current.IBPOrdererSpec{
				Resources: cfg.Defaults.Resources.Orderer,
				Storage:   cfg.Defaults.Storage.Orderer,
			}
			p1 := p.DeepCopy()
			list.Items = append(list.Items, *p)
			list.Items = append(list.Items, *p1)
			return nil
		}

		kube.GetConfigMapStub = func(namespace, name string) (*corev1.ConfigMap, error) {
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

	})

	Context("get Orderer CR", func() {
		It("returns an error if unable to find component", func() {
			client.GetCRReturns(errors.New("not found"))
			_, _, err := ordererComp.GetCR(orderer.ALL, "orderer1", "namespace", "testSID")
			Expect(err).To(HaveOccurred())
			Expect(err).To(MatchError(ContainSubstring("not found")))
		})

		It("performs get for one orderer", func() {
			resp, code, err := ordererComp.GetCR(orderer.ALL, "orderer1", "namespace", "testSID")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(200))
			Expect(client.GetCRCallCount()).To(Equal(1))

			By("returning full fabric version", func() {
				Expect(resp.Version).To(Equal("1.4.7-1"))
			})
		})
	})

	Context("getall orderer CR", func() {
		It("performs get for all orderer", func() {
			_, code, err := ordererComp.GetAllCR("testSID", "namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(200))
			Expect(client.GetCRCallCount()).To(Equal(2))
		})
	})
})
