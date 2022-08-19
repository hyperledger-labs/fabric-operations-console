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
	"context"
	"io/ioutil"
	"net/http"
	"os"
	"testing"
	"time"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/ibpoperator"
	"github.com/pkg/errors"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"sigs.k8s.io/yaml"
)

func TestOrderer(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Orderer Suite")
}

var (
	namespace      = "deporderertest"
	deployerClient = &http.Client{}

	ibpDeployer *deployer.Deployer
	kclient     *kubernetes.Clientset
	crclient    *ibpoperator.Client
)

var _ = BeforeSuite(func() {
	SetDefaultEventuallyTimeout(5 * time.Second)
	SetDefaultEventuallyPollingInterval(time.Second)

	// Get KubeConfig
	kconfigfile := os.Getenv("KUBECONFIG")
	kconfig, err := clientcmd.BuildConfigFromFlags("", kconfigfile)
	Expect(err).NotTo(HaveOccurred())

	kclient, err = kubernetes.NewForConfig(kconfig)
	Expect(err).NotTo(HaveOccurred())

	crclient, err = ibpoperator.New(kconfig)
	Expect(err).NotTo(HaveOccurred())

	deleteNamespace()
	createNamespace()

	// Start locally running Deployer
	ibpDeployer = newDeployer(kconfig)
	err = ibpDeployer.Init()
	Expect(err).NotTo(HaveOccurred())

	go ibpDeployer.Serve()

	// Give some time for the deployer to startup
	time.Sleep(2 * time.Second)
})

var _ = AfterSuite(func() {
	err := ibpDeployer.Stop()
	Expect(err).NotTo(HaveOccurred())

	err = deleteNamespace()
	Expect(err).NotTo(HaveOccurred())
})

func createNamespace() {
	_, err := kclient.CoreV1().Namespaces().Create(
		context.TODO(),
		&corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: namespace,
			},
		},
		metav1.CreateOptions{},
	)
	Expect(err).NotTo(HaveOccurred())
}

func newDeployer(kconfig *rest.Config) *deployer.Deployer {
	logger, err := setupLogging("DEBUG")
	Expect(err).NotTo(HaveOccurred())

	localconfig := &config.LocalConfig{
		Logger:     logger,
		KubeConfig: kconfig,
	}

	deployercfg, err := readDeployerConfigFile("../../sampleconfigs/local-config.yaml")
	Expect(err).NotTo(HaveOccurred())
	deployercfg.Namespace = namespace

	return deployer.New(deployercfg, localconfig, true)
}

func readDeployerConfigFile(file string) (*config.DeployerSettingsConfig, error) {
	cfile, err := ioutil.ReadFile(file)
	if err != nil {
		return nil, errors.Wrapf(err, "unable to read in configuration file from: '%s'", file)
	}

	deployer := &config.DeployerSettingsConfig{}
	err = yaml.Unmarshal(cfile, deployer)
	if err != nil {
		return nil, err
	}

	return deployer, nil

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

func deleteNamespace() error {
	err := kclient.CoreV1().Namespaces().Delete(context.TODO(), namespace, metav1.DeleteOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return nil // Namespace does not exist, don't need to wait for deletion to complete
		}
	}

	opts := metav1.ListOptions{}
	watchNamespace, err := kclient.CoreV1().Namespaces().Watch(context.TODO(), opts)
	if err != nil {
		return err
	}

	for {
		resultChan := <-watchNamespace.ResultChan()
		if resultChan.Type == watch.Deleted {
			ns := resultChan.Object.(*corev1.Namespace)
			if ns.Name == namespace {
				break
			}
		}
	}
	return nil
}
