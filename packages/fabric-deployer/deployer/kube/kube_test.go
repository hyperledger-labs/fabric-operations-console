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

package kube_test

import (
	"github.com/IBM-Blockchain/fabric-deployer/deployer/kube"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	apiv1 "k8s.io/api/core/v1"
	"k8s.io/client-go/rest"
)

var _ = Describe("Kube", func() {
	It("returns an error if it fails to get cluster config", func() {
		_, err := kube.InClusterConfig()
		Expect(err).To(HaveOccurred())
	})

	It("creates client set based on config", func() {
		client, err := kube.NewForConfig(&rest.Config{})
		Expect(err).NotTo(HaveOccurred())
		Expect(client).NotTo(BeNil())
	})

	Context("clientset actions", func() {
		var (
			k   *kube.Kube
			err error
		)

		BeforeEach(func() {
			k, err = kube.NewForConfig(&rest.Config{})
			Expect(err).NotTo(HaveOccurred())
		})

		It("returns an error if unable to get a list of namespaces", func() {
			_, err := k.GetNamespaces()
			Expect(err).To(HaveOccurred())
		})

		It("returns an error if unable to create secret", func() {
			_, err := k.CreateSecret("default", &apiv1.Secret{})
			Expect(err).To(HaveOccurred())
		})

		It("returns an error if unable get port for namespace", func() {
			_, err := k.GetPort("default", "service-name")
			Expect(err).To(HaveOccurred())
		})
	})
})
