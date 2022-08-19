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
	"errors"
	"io/ioutil"
	"net/http"
	"net/http/httptest"

	"github.com/IBM-Blockchain/fabric-deployer/deployer"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"go.uber.org/zap"
)

var _ = Describe("Endpoint", func() {
	var logger *zap.SugaredLogger
	var endpoint *deployer.Endpoint

	BeforeEach(func() {
		zapLogger, err := zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())
		logger = zapLogger.Sugar().Named("Deployer")
	})

	Context("handler returns an error", func() {
		BeforeEach(func() {
			b := &badDeployerHandler{}
			endpoint = &deployer.Endpoint{
				Handler: b.Handle,
				Logger:  logger,
			}
		})

		It("writes an HTTP error", func() {
			req := httptest.NewRequest(http.MethodHead, "http://localhost:8080", nil)
			w := httptest.NewRecorder()
			endpoint.ServeHTTP(w, req)

			result := w.Result()
			Expect(result.StatusCode).To(Equal(http.StatusInternalServerError))
			body, err := ioutil.ReadAll(result.Body)
			Expect(err).NotTo(HaveOccurred())
			Expect(string(body)).To(Equal("{\"status\":500,\"message\":\"handler error\"}\n"))
		})
	})

	It("writes response body", func() {
		g := &goodDeployerHandler{}
		endpoint = &deployer.Endpoint{
			Handler: g.Handle,
			Logger:  logger,
		}

		req := httptest.NewRequest(http.MethodHead, "http://localhost:8080", nil)
		w := httptest.NewRecorder()
		endpoint.ServeHTTP(w, req)

		result := w.Result()
		Expect(result.StatusCode).To(Equal(http.StatusOK))
		body, err := ioutil.ReadAll(result.Body)
		Expect(err).NotTo(HaveOccurred())
		Expect(string(body)).To(Equal("\"good response\"\n"))
	})

	It("writes response body & sets error code", func() {
		g := &intermediateDeployerHandler{}
		endpoint = &deployer.Endpoint{
			Handler: g.Handle,
			Logger:  logger,
		}

		req := httptest.NewRequest(http.MethodHead, "http://localhost:8080", nil)
		w := httptest.NewRecorder()
		endpoint.ServeHTTP(w, req)

		result := w.Result()
		Expect(result.StatusCode).To(Equal(500))
		body, err := ioutil.ReadAll(result.Body)
		Expect(err).NotTo(HaveOccurred())
		Expect(string(body)).To(Equal("\"intermediate response\"\n"))
	})
})

type badDeployerHandler struct{}

func (b *badDeployerHandler) Handle(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	return nil, 0, errors.New("handler error")
}

type goodDeployerHandler struct{}

func (g *goodDeployerHandler) Handle(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	return "good response", 0, nil
}

type intermediateDeployerHandler struct{}

func (g *intermediateDeployerHandler) Handle(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	return "intermediate response", 500, nil
}
