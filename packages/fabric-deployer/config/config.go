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

package config

import (
	"fmt"
	"io/ioutil"
	"net/url"
	"os"

	"github.com/pkg/errors"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/tools/clientcmd"

	"sigs.k8s.io/yaml"
)

const (
	NamespaceEnvVar = "DEPLOY_NAMESPACE"
)

type Logger interface {
	Errorw(msg string, keysAndValues ...interface{})
	Debugw(msg string, keysAndValues ...interface{})
}

type Config struct {
	Options     *Options
	Deployer    *DeployerSettingsConfig
	LocalConfig *LocalConfig
}

func New(options *Options) *Config {
	return &Config{
		Options: options,
	}
}

func (c *Config) ReadConfigFile() (*DeployerSettingsConfig, error) {
	cfile, err := ioutil.ReadFile(c.Options.ConfigPath)
	if err != nil {
		return nil, errors.Wrapf(err, "unable to read in configuration file from: '%s'", c.Options.ConfigPath)
	}

	deployer := &DeployerSettingsConfig{}
	err = yaml.Unmarshal(cfile, deployer)
	if err != nil {
		return nil, err
	}

	return deployer, nil
}

// Init initializes the configuration of the deployer
func (c *Config) Init(deployerConfig *DeployerSettingsConfig) (*DeployerSettingsConfig, *LocalConfig, error) {
	var err error

	options := c.Options
	c.LocalConfig = &LocalConfig{}
	c.LocalConfig.Logger, err = setupLogging(deployerConfig.Loglevel)
	if err != nil {
		return nil, nil, err
	}

	log := c.LocalConfig.Logger.Sugar().Named("init")

	if deployerConfig.Timeouts == nil {
		deployerConfig.Timeouts = &Timeouts{}
	}

	if deployerConfig.Timeouts.Deployment == 0 {
		deployerConfig.Timeouts.Deployment = DefaultDeploymentTimeout
	}
	if deployerConfig.Timeouts.APIServer == 0 {
		deployerConfig.Timeouts.APIServer = deployerConfig.Timeouts.Deployment + 30*1000
		if deployerConfig.Timeouts.APIServer < DefaultAPIServerTimeout {
			deployerConfig.Timeouts.APIServer = DefaultAPIServerTimeout
		}
	}

	if deployerConfig.Timeouts.OrdererFailureCount == 0 {
		deployerConfig.Timeouts.OrdererFailureCount = DefaultOrdererFailureCount
	}

	if deployerConfig.ServiceConfig.Type == "" {
		deployerConfig.ServiceConfig.Type = corev1.ServiceTypeNodePort
	}
	log.Info("Configuring deployer for cluster type: %s", deployerConfig.ClusterType)

	if deployerConfig.Domain == "" {
		return nil, nil, errors.New("Domain is not provided")
	}

	if options.DBConnectionURL != "" {
		deployerConfig.Database.ConnectionURL = options.DBConnectionURL
	}

	_, err = url.ParseRequestURI(deployerConfig.Database.ConnectionURL)
	if err != nil {
		return nil, nil, err
	}

	if options.Username == "" && deployerConfig.Auth.Username == "" {
		return nil, nil, errors.New("Username for basic auth is required")
	}

	if options.Password == "" && deployerConfig.Auth.Password == "" {
		return nil, nil, errors.New("Password for basic auth is required")
	}

	if options.Username != "" {
		deployerConfig.Auth.Username = options.Username
	}
	if options.Password != "" {
		deployerConfig.Auth.Password = options.Password
	}

	if options.KubeConfig != "" {
		cfg, err := clientcmd.BuildConfigFromFlags("", options.KubeConfig)
		if err != nil {
			return nil, nil, err
		}
		c.LocalConfig.KubeConfig = cfg
	}

	namespace, err := GetNamespace()
	if err != nil {
		return nil, nil, err
	}
	deployerConfig.Namespace = namespace

	err = VerifyDefaultVersions(deployerConfig.Versions)
	if err != nil {
		return nil, nil, err
	}

	err = verifyDefaultStorage(deployerConfig.Defaults.Storage)
	if err != nil {
		return nil, nil, err
	}

	return deployerConfig, c.LocalConfig, nil
}

func setupLogging(loglevel string) (*zap.Logger, error) {
	// set up logging
	var level zapcore.Level
	err := level.Set(loglevel)
	if err != nil {
		return nil, err
	}
	zapConfig := zap.NewProductionConfig()
	zapConfig.Level = zap.NewAtomicLevelAt(level)
	zapConfig.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, err := zapConfig.Build()
	defer logger.Sync()
	if err != nil {
		return nil, err
	}
	// redirect uses of standard logger
	zap.RedirectStdLog(logger)

	return logger, nil
}

func GetNamespace() (string, error) {
	ns, found := os.LookupEnv(NamespaceEnvVar)
	if !found {
		return "", fmt.Errorf("%s must be set", NamespaceEnvVar)
	}
	return ns, nil
}

func VerifyDefaultVersions(versions *Versions) error {
	if versions.CA == nil {
		return errors.New("No version specified for CA's configuration")
	} else {
		if !foundDefaultVersionCA(versions.CA) {
			return errors.New("No default version specified for CA's configuration")
		}
	}

	if versions.Peer == nil {
		return errors.New("No version specified for Peer's configuration")
	} else {
		if !foundDefaultVersionPeer(versions.Peer) {
			return errors.New("No default version specified for Peer's configuration")
		}
	}

	if versions.Orderer == nil {
		return errors.New("No version specified for Orderer's configuration")
	} else {
		if !foundDefaultVersionOrderer(versions.Orderer) {
			return errors.New("No default version specified for Orderer's configuration")
		}
	}

	return nil
}

func VerifyDefaultStorageAndResource(defaults *DeployerDefaults) error {
	err := verifyDefaultStorage(defaults.Storage)
	if err != nil {
		return err
	}

	err = verifyDefaultResources(defaults.Resources)
	if err != nil {
		return err
	}

	return nil
}

func foundDefaultVersionCA(comp map[string]VersionCA) bool {
	for _, version := range comp {
		if version.Default == true {
			return true
		}
	}
	return false
}

func foundDefaultVersionPeer(comp map[string]VersionPeer) bool {
	for _, version := range comp {
		if version.Default == true {
			return true
		}
	}
	return false
}

func foundDefaultVersionOrderer(comp map[string]VersionOrderer) bool {
	for _, version := range comp {
		if version.Default == true {
			return true
		}
	}
	return false
}

func verifyDefaultStorage(storage *Storage) error {
	if storage == nil {
		return errors.New("deployer configuration missing default storage values")
	}

	if storage.CA == nil {
		return errors.New("no default storages set for CA")
	} else {
		if storage.CA.CA == nil {
			return errors.New("no default storage set for CA.CA")
		}
	}

	if storage.Peer == nil {
		return errors.New("no default storages set for Peer")
	} else {
		if storage.Peer.Peer == nil {
			return errors.New("no default storage set for Peer.Peer")
		}
		if storage.Peer.StateDB == nil {
			return errors.New("no default storage set for Peer.StateDB")
		}
	}

	if storage.Orderer == nil {
		return errors.New("no default storages set for Orderer")
	} else {
		if storage.Orderer.Orderer == nil {
			return errors.New("no default storage set for Orderer.Orderer")
		}
	}

	return nil
}

func verifyDefaultResources(resources *Resources) error {
	if resources == nil {
		return errors.New("deployer configuration missing default resource values")
	}

	if resources.CA == nil {
		return errors.New("no default resources set for CA")
	} else {
		if resources.CA.Init == nil {
			return errors.New("no default resources set for CA.Init")
		}
		if resources.CA.CA == nil {
			return errors.New("no default resources set for CA.CA")
		}
	}

	if resources.Peer == nil {
		return errors.New("no default resources set for Peer")
	} else {
		if resources.Peer.Init == nil {
			return errors.New("no default resources set for Peer.Init")
		}
		if resources.Peer.Peer == nil {
			return errors.New("no default resources set for Peer.Peer")
		}
		if resources.Peer.DinD == nil {
			return errors.New("no default resources set for Peer.DinD")
		}
		if resources.Peer.FluentD == nil {
			return errors.New("no default resources set for Peer.FluentD")
		}
		if resources.Peer.GRPCProxy == nil {
			return errors.New("no default resources set for Peer.GRPCProxy")
		}
		if resources.Peer.CouchDB == nil {
			return errors.New("no default resources set for Peer.CouchDB")
		}
		if resources.Peer.CCLauncher == nil {
			return errors.New("no default resources set for Peer.CCLauncher")
		}
		if resources.Peer.Enroller == nil {
			return errors.New("no default resources set for Peer.Enroller")
		}
		if resources.Peer.HSMDaemon == nil {
			return errors.New("no default resources set for Peer.HSMDaemon")
		}
	}

	if resources.Orderer == nil {
		return errors.New("no default resources set for Orderer")
	} else {
		if resources.Orderer.Init == nil {
			return errors.New("no default resources set for Orderer.Init")
		}
		if resources.Orderer.Orderer == nil {
			return errors.New("no default resources set for Orderer.Orderer")
		}
		if resources.Orderer.Enroller == nil {
			return errors.New("no default resources set for Orderer.Enroller")
		}
		if resources.Orderer.HSMDaemon == nil {
			return errors.New("no default resources set for Orderer.HSMDaemon")
		}
	}

	return nil
}
