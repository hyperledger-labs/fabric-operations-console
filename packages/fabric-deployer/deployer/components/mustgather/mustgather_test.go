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

package mustgather_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/mustgather"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/mustgather/mocks"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
)

var _ = Describe("Mustgather", func() {

	var (
		err            error
		testMustgather *mustgather.Mustgather
		mockKube       *mocks.Kube
		cfg            *config.DeployerSettingsConfig
		mockHttpClient *mocks.HTTPClient
		logger         *zap.Logger
		podStatus      corev1.PodStatus
		serviceStatus  corev1.ServiceStatus
	)

	BeforeEach(func() {
		logger, err = zap.NewProductionConfig().Build()
		Expect(err).NotTo(HaveOccurred())

		mockKube = &mocks.Kube{}
		mockHttpClient = &mocks.HTTPClient{}

		cfg = &config.DeployerSettingsConfig{}
		cfg.OtherImages = &config.OtherImages{}
		cfg.OtherImages.MustgatherImage = "animage"
		cfg.OtherImages.MustgatherTag = "atag"
		cfg.Namespace = "ibpmustgathernamespace"
		cfg.ImagePullSecrets = []string{"pullsecret"}

		testMustgather = mustgather.New(logger, mockKube, cfg, mockHttpClient)

		podStatus = corev1.PodStatus{}
		serviceStatus = corev1.ServiceStatus{}
	})

	Context("Create Mustgather service and pod", func() {
		It("successfully creates", func() {
			err := testMustgather.Create()
			Expect(err).NotTo(HaveOccurred())
		})

		It("uses right format when using digests", func() {
			cfg.OtherImages.MustgatherTag = "sha256:123"
			podSpec := testMustgather.GetPodDefinition()
			Expect(podSpec.Spec.Containers[0].Image).To(Equal("animage@sha256:123"))
		})

		It("uses right format when using tags", func() {
			cfg.OtherImages.MustgatherTag = "atag"
			podSpec := testMustgather.GetPodDefinition()
			Expect(podSpec.Spec.Containers[0].Image).To(Equal("animage:atag"))
		})

		It("handles an error creating service", func() {
			mockKube.CreateServiceReturns(nil, errors.New("cannot create service"))
			err := testMustgather.Create()
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("cannot create service"))
		})

		It("handles an error creating pod", func() {
			mockKube.DeleteAndCreatePodReturns(nil, errors.New("cannot create pod"))
			err := testMustgather.Create()
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("cannot create pod"))
		})
	})

	Context("Deletes Mustgather service and pod", func() {
		It("successfully deletes", func() {
			err := testMustgather.Delete()
			Expect(err).NotTo(HaveOccurred())
		})

		It("handles only a pod error", func() {
			mockKube.DeleteAllPodsMatchingLabelReturns(errors.New("pod error"))
			err := testMustgather.Delete()
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("Error deleting mustgather pod: pod error"))

		})

		It("handles only a service error", func() {
			mockKube.DeleteServiceReturns(errors.New("service error"))
			err := testMustgather.Delete()
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("Error deleting mustgather service: service error"))
		})

		It("handles when both a pod and service return errors", func() {
			mockKube.DeleteAllPodsMatchingLabelReturns(errors.New("pod error"))
			mockKube.DeleteServiceReturns(errors.New("service error"))
			err := testMustgather.Delete()
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("Error deleting mustgather pod and service: service error: pod error"))
		})
	})

	Context("Returns the mustgather status", func() {
		It("shows podCreated as false", func() {
			mockKube.GetPodsByLabelReturns(nil, errors.New("pod error"))

			got, err := testMustgather.Status()

			want := mustgather.StatusResponse{
				KubeStatus: mustgather.KubeStatus{
					PodCreated:     false,
					ServiceCreated: true,
				},
			}

			Expect(err).NotTo(HaveOccurred())
			Expect(got).To(Equal(want))
		})

		It("shows serviceCreated as false", func() {
			mockKube.GetServiceReturns(nil, errors.New("svc error"))

			got, err := testMustgather.Status()

			want := mustgather.StatusResponse{
				KubeStatus: mustgather.KubeStatus{
					PodCreated:     true,
					ServiceCreated: false,
				},
			}

			Expect(err).NotTo(HaveOccurred())
			Expect(got).To(Equal(want))
		})

		It("adds the pod and service statuses into the request when no errors occur", func() {
			mockKube.GetPodsByLabelReturns(&corev1.Pod{
				Status: podStatus,
			}, nil)

			mockKube.GetServiceReturns(&corev1.Service{
				Status: serviceStatus,
			}, nil)

			got, err := testMustgather.Status()

			want := mustgather.StatusResponse{
				KubeStatus: mustgather.KubeStatus{
					PodCreated:     true,
					ServiceCreated: true,
					PodStatus:      podStatus,
					ServiceStatus:  serviceStatus,
					PodRunning:     false,
				},
			}

			Expect(err).NotTo(HaveOccurred())
			Expect(got).To(Equal(want))
		})

		It("shows pod running as true when the Phase is PodRunning and errors as the endpoint isn't reachable", func() {
			podStatus.Phase = corev1.PodRunning

			mockKube.GetPodsByLabelReturns(&corev1.Pod{
				Status: podStatus,
			}, nil)

			mockKube.GetServiceReturns(&corev1.Service{
				Status: serviceStatus,
			}, nil)

			mockHttpClient.DoReturns(&http.Response{
				StatusCode: 500,
			}, errors.New("connection refused"))

			got, err := testMustgather.Status()

			want := mustgather.StatusResponse{
				KubeStatus: mustgather.KubeStatus{
					PodCreated:     true,
					ServiceCreated: true,
					PodStatus:      podStatus,
					ServiceStatus:  serviceStatus,
					PodRunning:     true,
				},
			}

			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("connection refused"))
			Expect(got).To(Equal(want))
		})

		It("successfully gets the status from the mustgather pod", func() {
			podStatus.Phase = corev1.PodRunning

			mockKube.GetPodsByLabelReturns(&corev1.Pod{
				Status: podStatus,
			}, nil)

			mockKube.GetServiceReturns(&corev1.Service{
				Status: serviceStatus,
			}, nil)

			mustgatherStatus := mustgather.MustgatherStatus{
				StartedAt:   "startedAt",
				Completed:   true,
				CompletedAt: "completedAt",
				FileExists:  true,
				FilePath:    "/downloads/mustgather.tar.gz",
				Error:       nil,
			}

			json, err := json.Marshal(mustgatherStatus)
			body := ioutil.NopCloser(bytes.NewReader([]byte(json)))

			mockHttpClient.DoReturns(&http.Response{
				StatusCode: 200,
				Body:       body,
			}, nil)

			got, err := testMustgather.Status()

			want := mustgather.StatusResponse{
				KubeStatus: mustgather.KubeStatus{
					PodCreated:     true,
					ServiceCreated: true,
					PodStatus:      podStatus,
					ServiceStatus:  serviceStatus,
					PodRunning:     true,
				},
				MustgatherStatus: mustgatherStatus,
			}

			Expect(err).ToNot(HaveOccurred())
			Expect(got).To(Equal(want))
		})

		It("gets the status from the mustgather pod but errors while decoding the response body", func() {
			podStatus.Phase = corev1.PodRunning

			mockKube.GetPodsByLabelReturns(&corev1.Pod{
				Status: podStatus,
			}, nil)

			mockKube.GetServiceReturns(&corev1.Service{
				Status: serviceStatus,
			}, nil)

			body := ioutil.NopCloser(bytes.NewReader([]byte("{ some invalid json")))

			mockHttpClient.DoReturns(&http.Response{
				StatusCode: 200,
				Body:       body,
			}, nil)

			got, err := testMustgather.Status()

			want := mustgather.StatusResponse{
				KubeStatus: mustgather.KubeStatus{
					PodCreated:     true,
					ServiceCreated: true,
					PodStatus:      podStatus,
					ServiceStatus:  serviceStatus,
					PodRunning:     true,
				},
			}

			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("invalid character"))
			Expect(got).To(Equal(want))
		})
	})

	Context("Downloads the mustgather file", func() {
		It("handles an error making the HTTP request", func() {
			mockHttpClient.DoReturns(&http.Response{
				StatusCode: 500,
			}, errors.New("connection refused"))

			_, err := testMustgather.Download()

			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("connection refused"))
		})

		It("successfully makes the download request and returns the response", func() {
			want := &http.Response{
				StatusCode: 200,
			}

			mockHttpClient.DoReturns(want, nil)

			got, err := testMustgather.Download()

			Expect(err).ToNot(HaveOccurred())
			Expect(got).To(Equal(want))
		})
	})

})
