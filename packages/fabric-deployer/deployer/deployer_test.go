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
package deployer_test

import (
	"crypto/tls"
	"io/ioutil"
	"net/http"
	"net/http/httptest"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/kube"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/rest"
)

var _ = Describe("Deployer", func() {
	var d *deployer.Deployer
	var cfg *config.DeployerSettingsConfig

	BeforeEach(func() {
		logger, err := zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())
		cfg = &config.DeployerSettingsConfig{
			DashboardURL: "dashboardURL",
			Database: config.Database{
				ConnectionURL: "fakeurl",
				Components: config.IndividualDatabase{
					Name: "fakename",
				},
			},
			Defaults: &config.DeployerDefaults{
				Resources: &config.Resources{
					CA: &current.CAResources{
						CA: &corev1.ResourceRequirements{},
					},
					Peer: &current.PeerResources{
						Peer:      &corev1.ResourceRequirements{},
						DinD:      &corev1.ResourceRequirements{},
						CouchDB:   &corev1.ResourceRequirements{},
						GRPCProxy: &corev1.ResourceRequirements{},
					},
					Orderer: &current.OrdererResources{
						Orderer: &corev1.ResourceRequirements{},
					},
				},

				Storage: &config.Storage{
					CA: &current.CAStorages{
						CA: &current.StorageSpec{},
					},
					Peer: &current.PeerStorages{
						Peer:    &current.StorageSpec{},
						StateDB: &current.StorageSpec{},
					},
					Orderer: &current.OrdererStorages{
						Orderer: &current.StorageSpec{},
					},
				},
			},
			Auth: config.BasicAuth{
				Username: "admin",
				Password: "adminpw",
			},
			Timeouts: &config.Timeouts{
				APIServer:  1000,
				Deployment: 1000,
			},
		}

		client, err := kube.NewForConfig(&rest.Config{})
		Expect(err).NotTo((HaveOccurred()))
		localcfg := &config.LocalConfig{
			Logger:     logger,
			KubeConfig: &rest.Config{},
		}
		d = deployer.New(cfg, localcfg, false)
		d.K8SClient = client
		Expect(d).NotTo(BeNil())
		Expect(d.Config).To(Equal(cfg))
	})

	Context("Init", func() {
		It("Initializes the deployer with an http listener", func() {
			err := d.Init()
			Expect(err).NotTo(HaveOccurred())
		})

		When("TLS is enabled", func() {
			BeforeEach(func() {
				d.Config.TLS.Enabled = true
				d.Config.TLS.CertPath = "./testdata/tls-cert.pem"
				d.Config.TLS.KeyPath = "./testdata/tls-key.pem"
			})

			It("returns an error if missing cert path", func() {
				d.Config.TLS.CertPath = ""
				err := d.Init()
				Expect(err).To(HaveOccurred())
			})

			It("returns an error if missing key path", func() {
				d.Config.TLS.KeyPath = ""
				err := d.Init()
				Expect(err).To(HaveOccurred())
			})

			It("initializes the deployer with an https listener", func() {
				err := d.Init()
				Expect(err).NotTo(HaveOccurred())
			})
		})
	})

	Context("authorization", func() {
		var (
			testReq *http.Request
			err     error
		)

		BeforeEach(func() {
			testReq, err = http.NewRequest("GET", "0.0.0.0", nil)
			Expect(err).To(BeNil())
		})

		It("fails with incorrect credentials", func() {
			testReq.SetBasicAuth("admin", "badpass")
			_, err := d.BasicAuth(testReq)
			Expect(err).NotTo(BeNil())
		})

		It("passes with correct credentials", func() {
			testReq.SetBasicAuth("admin", "adminpw")
			_, err := d.BasicAuth(testReq)
			Expect(err).To(BeNil())
		})
	})

	Context("Create Listener", func() {
		It("returns an error if failed to create secure listener", func() {
			err := d.CreateListener("0.0.0.0:9999", &tls.Config{})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("error creating TLS listener"))
		})

		It("returns an error if failed to create non-secure listener", func() {
			err := d.CreateListener("xyz", nil)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("error creating listener: listen tcp: address xyz: missing port in address"))
		})
	})

	Context("Add HSTS Header", func() {
		var (
			req *http.Request
			w   *httptest.ResponseRecorder
		)

		BeforeEach(func() {
			req = httptest.NewRequest(http.MethodHead, "http://localhost:8080", nil)
			w = httptest.NewRecorder()
		})

		It("adds HSTS header to the calls", func() {
			h := d.AddHSTSHeaderMiddleware(&fakeHandler{})
			h.ServeHTTP(w, req)

			result := w.Result()
			Expect(result.Header.Get("Strict-Transport-Security")).To(Equal("max-age=31536000; includeSubDomains"))
		})
	})

	Context("Basic Auth Middleware", func() {
		var (
			req *http.Request
			w   *httptest.ResponseRecorder
		)

		BeforeEach(func() {
			req = httptest.NewRequest(http.MethodHead, "http://localhost:8080", nil)
			w = httptest.NewRecorder()
		})

		It("returns an error if missing authorization header", func() {
			h := d.BasicAuthMiddleware(&missingAuthHandler{})
			h.ServeHTTP(w, req)

			result := w.Result()
			Expect(result.StatusCode).To(Equal(http.StatusUnauthorized))
			body, err := ioutil.ReadAll(result.Body)
			Expect(err).NotTo(HaveOccurred())
			Expect(string(body)).To(Equal("Unauthorized"))
		})

		It("sets the request context with user name", func() {
			d.Config.Auth = config.BasicAuth{
				Username: "admin",
				Password: "adminpw",
			}

			req.SetBasicAuth("admin", "adminpw")
			h := d.BasicAuthMiddleware(&properAuthHandler{})
			h.ServeHTTP(w, req)
		})
	})

	Context("Basic Auth", func() {
		It("returns an error if missing authorization header", func() {
			req, err := http.NewRequest(http.MethodHead, "http://localhost:8080", nil)
			Expect(err).NotTo(HaveOccurred())

			_, err = d.BasicAuth(req)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to authorize"))
		})

		It("returns an error if incorrect username and password used", func() {
			d.Config.Auth = config.BasicAuth{
				Username: "admin",
				Password: "adminpw",
			}
			req, err := http.NewRequest(http.MethodHead, "http://localhost:8080", nil)
			req.SetBasicAuth("a", "b")
			Expect(err).NotTo(HaveOccurred())

			_, err = d.BasicAuth(req)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("unauthorized"))
		})
	})

	Context("Kubernetes API version", func() {
		It("returns an error if unable to get version", func() {
			_, code, err := d.ClusterVersionHandler(nil, nil)
			Expect(err).To(MatchError(ContainSubstring("failed to get kubernetes server version")))
			Expect(code).To(Equal(500))
		})
	})
})

type fakeHandler struct{}

func (f *fakeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {}

type missingAuthHandler struct{}

func (m *missingAuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {}

type properAuthHandler struct{}

func (m *properAuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := ctx.Value("user")
	Expect(user.(string)).To(Equal("admin"))
}
