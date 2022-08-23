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

package cmd

import (
	"flag"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer"
	"github.com/pkg/errors"
)

// AddFlags is a hook called to initialize the CLI flags for broker options.
// It is called after the flags are added for the skeleton and before flag
// parse is called.
func AddFlags() *config.Options {
	o := &config.Options{}
	flag.StringVar(&o.ConfigPath, "configpath", "/config.yaml", "Path to the config file")
	flag.StringVar(&o.DBConnectionURL, "dbconnectionstring", "", "Connection URL to couchdb")
	flag.StringVar(&o.Username, "username", "", "User for Basic Auth")
	flag.StringVar(&o.Password, "password", "", "Password for Basic Auth")
	flag.StringVar(&o.KubeConfig, "kubeconfig", "", "Kubernetes configuration")
	flag.Parse()

	return o
}

func Deployer() error {
	opts := AddFlags()
	c := config.New(opts)

	cfg, err := c.ReadConfigFile()
	if err != nil {
		return errors.Wrap(err, "failed to read deployer's configuration file")
	}

	deployercfg, localcfg, err := c.Init(cfg)
	if err != nil {
		return errors.Wrap(err, "failed to initialize deployer's configuration")
	}

	deployer := deployer.New(deployercfg, localcfg, true)
	err = deployer.Init()
	if err != nil {
		return errors.Wrap(err, "failed to initialize deployer")
	}

	deployer.Serve()

	return nil
}
