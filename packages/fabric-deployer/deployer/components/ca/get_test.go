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
	"strings"

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
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/mocks"
	ibpca "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	v1 "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("Get API", func() {
	const (
		testCert = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNwVENDQWtxZ0F3SUJBZ0lSQU1FeVZVcDRMdlYydEFUREhlWklldDh3Q2dZSUtvWkl6ajBFQXdJd2daVXgKQ3pBSkJnTlZCQVlUQWxWVE1SY3dGUVlEVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFUE1BMEdBMVVFQnhNRwpSSFZ5YUdGdE1Rd3dDZ1lEVlFRS0V3TkpRazB4RXpBUkJnTlZCQXNUQ2tKc2IyTnJZMmhoYVc0eE9UQTNCZ05WCkJBTVRNR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzFqWVM1aGNIQnpMbkIxYldGekxtOXpMbVo1Y21VdWFXSnQKTG1OdmJUQWVGdzB5TURBeE1qSXhPREExTURCYUZ3MHpNREF4TVRreE9EQTFNREJhTUlHVk1Rc3dDUVlEVlFRRwpFd0pWVXpFWE1CVUdBMVVFQ0JNT1RtOXlkR2dnUTJGeWIyeHBibUV4RHpBTkJnTlZCQWNUQmtSMWNtaGhiVEVNCk1Bb0dBMVVFQ2hNRFNVSk5NUk13RVFZRFZRUUxFd3BDYkc5amEyTm9ZV2x1TVRrd053WURWUVFERXpCcVlXNHkKTWkxdmNtUmxjbVZ5YjNKblkyRXRZMkV1WVhCd2N5NXdkVzFoY3k1dmN5NW1lWEpsTG1saWJTNWpiMjB3V1RBVApCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFTR0lHUFkvZC9tQVhMejM4SlROR3F5bldpOTJXUVB6cnN0Cm5vdEFWZlh0dHZ5QWJXdTRNbWNUMEh6UnBTWjNDcGdxYUNXcTg1MUwyV09LcnZ6L0JPREpvM2t3ZHpCMUJnTlYKSFJFRWJqQnNnakJxWVc0eU1pMXZjbVJsY21WeWIzSm5ZMkV0WTJFdVlYQndjeTV3ZFcxaGN5NXZjeTVtZVhKbApMbWxpYlM1amIyMkNPR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzF2Y0dWeVlYUnBiMjV6TG1Gd2NITXVjSFZ0CllYTXViM011Wm5seVpTNXBZbTB1WTI5dE1Bb0dDQ3FHU000OUJBTUNBMGtBTUVZQ0lRQzM3Y1pkNFY2RThPQ1IKaDloQXEyK0dyR21FVTFQU0I1eHo5RkdEWThkODZRSWhBT1crM3Urb2d4bFNWNUoyR3ZYbHRaQmpXRkpvYnJxeApwVVQ4cW4yMDA1b0wKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo="
	)

	var (
		caComp   *ca.CA
		mockKube *mocks.Kube
		client   *mocks.IBPOperatorClient
	)

	BeforeEach(func() {
		mockKube = &mocks.Kube{}
		client = &mocks.IBPOperatorClient{}
		client = &mocks.IBPOperatorClient{}

		res := map[corev1.ResourceName]resource.Quantity{}
		res[corev1.ResourceCPU] = resource.MustParse("1")
		res[corev1.ResourceMemory] = resource.MustParse("1Mi")
		replicas := int32(1)
		client.GetCRStub = func(namespace string, kind string, name string, caCR runtime.Object) error {
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
				Images: &current.CAImages{
					CATag: "2.1.1-20201001-amd64",
				},
				FabricVersion: "V2.0",
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

		client.GetAllCRStub = func(namespace string, kind string, crList runtime.Object) error {
			list := crList.(*current.IBPCAList)
			c := &current.IBPCA{}
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
				Images: &current.CAImages{
					CATag: "2.1.1-20201001-amd64",
				},
				FabricVersion: "V2.0",
			}
			c1 := c.DeepCopy()
			list.Items = append(list.Items, *c)
			list.Items = append(list.Items, *c1)
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
					SignCerts: "testCAcert",
				},
				TLSCA: &current.MSP{
					SignCerts: "testTLSCAcert",
				},
			}
			connectionProfileBytes, _ := json.Marshal(connectionProfile)

			caYaml := &ibpca.ServerConfig{}

			// This is just to test that tlsca and ca are correctly set - need to distinguish their configs
			if strings.Contains(name, "-tlsca-config") {
				caYaml.Version = "2.1.1"
			} else if strings.Contains(name, "-ca-config") {
				caYaml.Version = "1.4.1"
			}
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

		logger, err := zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		cfg := &config.DeployerSettingsConfig{
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

		caComp = &ca.CA{
			Logger:            logger.Sugar().Named("CA"),
			Kube:              mockKube,
			IBPOperatorClient: client,
			Config:            cfg,
		}
	})

	Context("get CA CR", func() {
		It("returns an error if unable to find component", func() {
			client.GetCRReturns(errors.New("not found"))
			_, _, err := caComp.GetCR(ca.ALL, "peer1", "namespace", "testSID")
			Expect(err).To(HaveOccurred())
			Expect(err).To(MatchError(ContainSubstring("not found")))
		})

		It("performs get for one CA", func() {
			resp, code, err := caComp.GetCR(ca.ALL, "peer1", "namespace", "testSID")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(200))
			Expect(client.GetCRCallCount()).To(Equal(1))

			By("getting config override", func() {
				bytes, err := json.Marshal(resp.Configs.CA)
				Expect(err).NotTo(HaveOccurred())

				ca := &v1.ServerConfig{}
				err = json.Unmarshal(bytes, ca)
				Expect(err).NotTo(HaveOccurred())
				Expect(ca.CAConfig.Version).To(Equal("1.4.1"))

				bytes, err = json.Marshal(resp.Configs.TLSCA)
				Expect(err).NotTo(HaveOccurred())

				tlsca := &v1.ServerConfig{}
				err = json.Unmarshal(bytes, tlsca)
				Expect(err).NotTo(HaveOccurred())
				Expect(tlsca.CAConfig.Version).To(Equal("2.1.1"))
			})

			By("getting crypto", func() {
				bytes, err := json.Marshal(resp.MSP.CA)
				Expect(err).NotTo(HaveOccurred())

				ca := &current.MSP{}
				err = json.Unmarshal(bytes, ca)
				Expect(err).NotTo(HaveOccurred())
				Expect(ca.SignCerts).To(Equal("testCAcert"))

				bytes, err = json.Marshal(resp.MSP.TLSCA)
				Expect(err).NotTo(HaveOccurred())

				tlsca := &current.MSP{}
				err = json.Unmarshal(bytes, tlsca)
				Expect(err).NotTo(HaveOccurred())
				Expect(tlsca.SignCerts).To(Equal("testTLSCAcert"))
			})

			By("getting full fabric version", func() {
				Expect(resp.Version).To(Equal("2.1.1-3"))
			})
		})
	})

	Context("getall CA CR", func() {
		It("performs get for all CA", func() {
			_, code, err := caComp.GetAllCR("testSID", "namespace")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(200))
			Expect(client.GetCRCallCount()).To(Equal(2))
		})
	})

	Context("get endpoints", func() {
		It("returns 500 status code if fails to get connection profile", func() {
			mockKube.GetConfigMapReturns(nil, errors.New("get error"))
			_, code, err := caComp.GetCR(ca.ENDPOINTS, "peer1", "namespace", "testSID")
			Expect(err).NotTo(HaveOccurred())
			Expect(code).To(Equal(500))
		})
	})
})
