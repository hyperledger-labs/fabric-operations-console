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

package config_test

import (
	"os"
	"path/filepath"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/offering"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

var (
	designDocs = []string{"../designdocs/components/test.json"}
)

var _ = Describe("Config", func() {
	var (
		opts     *config.Options
		cfg      *config.Config
		defaults *config.DeployerDefaults
	)

	BeforeEach(func() {
		opts = &config.Options{
			ConfigPath:      filepath.Join("../sampleconfigs", "local-config.yaml"),
			DBConnectionURL: "http://localhost:9999",
			Username:        "username",
			Password:        "password",
		}

		res := map[corev1.ResourceName]resource.Quantity{}
		res[corev1.ResourceCPU] = resource.MustParse("1")
		res[corev1.ResourceMemory] = resource.MustParse("1Mi")
		defaults = &config.DeployerDefaults{
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
			Resources: &config.Resources{
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
				Peer: &current.PeerResources{
					Init: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					Peer: &corev1.ResourceRequirements{
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
					GRPCProxy: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					FluentD: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					CCLauncher: &corev1.ResourceRequirements{
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
				Orderer: &current.OrdererResources{
					Init: &corev1.ResourceRequirements{
						Requests: res,
						Limits:   res,
					},
					Orderer: &corev1.ResourceRequirements{
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
			},
		}

		cfg = config.New(opts)
	})

	Context("read configuration file", func() {
		It("returns error if file does not exist", func() {
			cfg.Options.ConfigPath = filepath.Join("./testdata", "missing.yaml")
			_, err := cfg.ReadConfigFile()
			Expect(err).To(HaveOccurred())
		})

		It("returns no error if file does exist", func() {
			_, err := cfg.ReadConfigFile()
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("Init", func() {
		BeforeEach(func() {
			cfg.Deployer = &config.DeployerSettingsConfig{
				ClusterType: offering.K8S,
				Domain:      "0.0.0.0",
				Auth:        config.BasicAuth{},
				Defaults:    defaults,
				Versions: &config.Versions{
					CA:      map[string]config.VersionCA{"1.4.1": config.VersionCA{Default: true}},
					Peer:    map[string]config.VersionPeer{"1.4.1": config.VersionPeer{Default: true}},
					Orderer: map[string]config.VersionOrderer{"1.4.1": config.VersionOrderer{Default: true}},
				},
			}
			cfg.LocalConfig = &config.LocalConfig{}
			os.Setenv("DEPLOY_NAMESPACE", "default")
		})

		AfterEach(func() {
			os.Unsetenv("DEPLOY_NAMESPACE")
		})

		It("returns an error if missing username from both options and deployer configuration file ", func() {
			cfg.Options.Username = ""
			_, _, err := cfg.Init(cfg.Deployer)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("Username for basic auth is required"))
		})

		It("returns an error if missing password from both options and deployer configuration file ", func() {
			cfg.Options.Password = ""
			_, _, err := cfg.Init(cfg.Deployer)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("Password for basic auth is required"))
		})

		It("returns an error for a bad couch URL", func() {
			cfg.Options.DBConnectionURL = ""
			_, _, err := cfg.Init(cfg.Deployer)
			Expect(err).To(HaveOccurred())
		})

		It("returns no error if username and password are provided as options and overrides config file", func() {
			d, _, err := cfg.Init(cfg.Deployer)
			Expect(err).NotTo(HaveOccurred())

			Expect(d.Auth.Username).To(Equal("username"))
			Expect(d.Auth.Password).To(Equal("password"))
		})

		It("overrides configuration file's database string from options", func() {
			d, _, err := cfg.Init(cfg.Deployer)
			Expect(err).NotTo(HaveOccurred())

			Expect(d.Database.ConnectionURL).To(Equal("http://localhost:9999"))
		})
	})

	Context("verify default versions", func() {
		var versions *config.Versions

		BeforeEach(func() {
			versions = &config.Versions{
				CA:      map[string]config.VersionCA{"1.4.1": config.VersionCA{Default: true}},
				Peer:    map[string]config.VersionPeer{"1.4.1": config.VersionPeer{Default: true}},
				Orderer: map[string]config.VersionOrderer{"1.4.1": config.VersionOrderer{Default: true}},
			}
		})

		Context("ca", func() {
			It("returns an error if missing versions", func() {
				versions.CA = nil
				err := config.VerifyDefaultVersions(versions)
				Expect(err).NotTo(BeNil())
				Expect(err.Error()).To(Equal("No version specified for CA's configuration"))
			})

			It("returns an error if missing default version", func() {
				versions.CA = map[string]config.VersionCA{}
				err := config.VerifyDefaultVersions(versions)
				Expect(err).NotTo(BeNil())
				Expect(err.Error()).To(Equal("No default version specified for CA's configuration"))
			})
		})

		Context("peer", func() {
			It("returns an error if missing versions", func() {
				versions.Peer = nil
				err := config.VerifyDefaultVersions(versions)
				Expect(err).NotTo(BeNil())
				Expect(err.Error()).To(Equal("No version specified for Peer's configuration"))
			})

			It("returns an error if missing default version", func() {
				versions.Peer = map[string]config.VersionPeer{}
				err := config.VerifyDefaultVersions(versions)
				Expect(err).NotTo(BeNil())
				Expect(err.Error()).To(Equal("No default version specified for Peer's configuration"))
			})
		})

		Context("orderer", func() {
			It("returns an error if missing versions", func() {
				versions.Orderer = nil
				err := config.VerifyDefaultVersions(versions)
				Expect(err).NotTo(BeNil())
				Expect(err.Error()).To(Equal("No version specified for Orderer's configuration"))
			})

			It("returns an error if missing default version", func() {
				versions.Orderer = map[string]config.VersionOrderer{}
				err := config.VerifyDefaultVersions(versions)
				Expect(err).NotTo(BeNil())
				Expect(err.Error()).To(Equal("No default version specified for Orderer's configuration"))
			})
		})
	})

	Context("verify default resources and storage values", func() {
		It("returns an error if storage values not configured", func() {
			defaults.Storage = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("deployer configuration missing default storage values"))
		})

		It("returns an error if resource values not configured", func() {
			defaults.Resources = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("deployer configuration missing default resource values"))
		})

		It("returns no error if defaults configured correctly", func() {
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).To(BeNil())
		})

		It("returns an error if CA storage values not configured", func() {
			defaults.Storage.CA = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default storages set for CA"))
		})

		It("returns an error if CA.CA storage values not configured", func() {
			defaults.Storage.CA.CA = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default storage set for CA.CA"))
		})

		It("returns an error if Peer storage values not configured", func() {
			defaults.Storage.Peer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default storages set for Peer"))
		})

		It("returns an error if Peer.Peer storage values not configured", func() {
			defaults.Storage.Peer.Peer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default storage set for Peer.Peer"))
		})

		It("returns an error if Peer.StateDB storage values not configured", func() {
			defaults.Storage.Peer.StateDB = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default storage set for Peer.StateDB"))
		})

		It("returns an error if Orderer storage values not configured", func() {
			defaults.Storage.Orderer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default storages set for Orderer"))
		})

		It("returns an error if Orderer.Orderer storage values not configured", func() {
			defaults.Storage.Orderer.Orderer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default storage set for Orderer.Orderer"))
		})

		It("returns an error if CA resource values not configured", func() {
			defaults.Resources.CA = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for CA"))
		})

		It("returns an error if CA.Init resource values not configured", func() {
			defaults.Resources.CA.Init = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for CA.Init"))
		})

		It("returns an error if CA.CA resource values not configured", func() {
			defaults.Resources.CA.CA = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for CA.CA"))
		})

		It("returns an error if Peer resource values not configured", func() {
			defaults.Resources.Peer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer"))
		})

		It("returns an error if Peer.Init resource values not configured", func() {
			defaults.Resources.Peer.Init = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.Init"))
		})

		It("returns an error if Peer.Peer resource values not configured", func() {
			defaults.Resources.Peer.Peer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.Peer"))
		})

		It("returns an error if Peer.DinD resource values not configured", func() {
			defaults.Resources.Peer.DinD = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.DinD"))
		})

		It("returns an error if Peer.Fluentd resource values not configured", func() {
			defaults.Resources.Peer.FluentD = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.FluentD"))
		})

		It("returns an error if Peer.GRPCProxy resource values not configured", func() {
			defaults.Resources.Peer.GRPCProxy = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.GRPCProxy"))
		})

		It("returns an error if Peer.CouchDB resource values not configured", func() {
			defaults.Resources.Peer.CouchDB = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.CouchDB"))
		})

		It("returns an error if Peer.CCLauncher resource values not configured", func() {
			defaults.Resources.Peer.CCLauncher = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.CCLauncher"))
		})

		It("returns an error if Peer.Enroller resource values not configured", func() {
			defaults.Resources.Peer.Enroller = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.Enroller"))
		})

		It("returns an error if Peer.HSMDaemon resource values not configured", func() {
			defaults.Resources.Peer.HSMDaemon = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Peer.HSMDaemon"))
		})

		It("returns an error if Orderer resource values not configured", func() {
			defaults.Resources.Orderer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Orderer"))
		})

		It("returns an error if Orderer.Init resource values not configured", func() {
			defaults.Resources.Orderer.Init = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Orderer.Init"))
		})

		It("returns an error if Orderer.Orderer resource values not configured", func() {
			defaults.Resources.Orderer.Orderer = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Orderer.Orderer"))
		})

		It("returns an error if Orderer.Enroller resource values not configured", func() {
			defaults.Resources.Orderer.Enroller = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Orderer.Enroller"))
		})

		It("returns an error if Orderer.HSMDaemon resource values not configured", func() {
			defaults.Resources.Orderer.HSMDaemon = nil
			err := config.VerifyDefaultStorageAndResource(defaults)
			Expect(err).NotTo(BeNil())
			Expect(err.Error()).To(Equal("no default resources set for Orderer.HSMDaemon"))
		})
	})
})
