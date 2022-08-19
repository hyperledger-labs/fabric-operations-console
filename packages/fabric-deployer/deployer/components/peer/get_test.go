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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	cfg "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/mocks"
	configpeer "github.com/IBM-Blockchain/fabric-operator/api/peer/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("GET API", func() {
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
				Peer:    map[string]cfg.VersionPeer{"1.4.1": cfg.VersionPeer{Default: true}},
				Orderer: map[string]cfg.VersionOrderer{"1.4.1": cfg.VersionOrderer{Default: true}},
			},
			Timeouts: &cfg.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
			ImagePullSecrets: []string{"imagepullsecret"},
		}

		t := true
		client.GetCRStub = func(namespace string, kind string, name string, peerCR runtime.Object) error {
			p := peerCR.(*current.IBPPeer)
			p.Spec = current.IBPPeerSpec{
				Resources:     cfg.Defaults.Resources.Peer,
				Storage:       cfg.Defaults.Storage.Peer,
				DisableNodeOU: &t,
				FabricVersion: "1.4.6-2",
			}
			return nil
		}

		client.GetAllCRStub = func(namespace string, kind string, crList runtime.Object) error {
			list := crList.(*current.IBPPeerList)
			p := &current.IBPPeer{}
			p.Spec = current.IBPPeerSpec{
				Resources: cfg.Defaults.Resources.Peer,
				Storage:   cfg.Defaults.Storage.Peer,
			}
			p1 := p.DeepCopy()
			list.Items = append(list.Items, *p)
			list.Items = append(list.Items, *p1)
			return nil
		}

		kube.GetConfigMapStub = func(namespace, name string) (*corev1.ConfigMap, error) {
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

		peerComp = &peer.Peer{
			Logger:            logger.Sugar().Named("Peer"),
			Kube:              kube,
			IBPOperatorClient: client,
			Config:            cfg,
		}
	})

	Context("get Peer CR", func() {
		It("returns an error if unable to find component", func() {
			client.GetCRReturns(errors.New("not found"))
			_, _, err := peerComp.GetCR(peer.ALL, "peer1", "namespace", "testSID")
			Expect(err).To(HaveOccurred())
			Expect(err).To(MatchError(ContainSubstring("not found")))
		})

		It("performs get for one peer", func() {
			resp, code, err := peerComp.GetCR(peer.ALL, "peer1", "namespace", "testSID")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(200))
			Expect(client.GetCRCallCount()).To(Equal(1))

			By("returning replicas = 1 if not set in sepc", func() {
				Expect(resp.Replicas).To(Equal(int32(1)))

			})

			By("returning node ou not enabled if disabled in spec", func() {
				Expect(*resp.NodeOU.Enabled).To(Equal(false))
			})

			By("returning full fabric version", func() {
				Expect(resp.Version).To(Equal("1.4.6-2"))
			})
		})
	})

	Context("getall Peer CR", func() {
		It("performs get for all peer", func() {
			_, code, err := peerComp.GetAllCR("testSID", "namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(200))
			Expect(client.GetCRCallCount()).To(Equal(2))
		})
	})
})
