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

package mustgather

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/offering"
	"github.com/pkg/errors"

	"go.uber.org/zap"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

//go:generate counterfeiter -o mocks/kube.go -fake-name Kube . Kube

type Kube interface {
	DeleteAndCreatePod(namespace string, pod *corev1.Pod, label string) (*corev1.Pod, error)
	GetPodsByLabel(namespace string, name string) (*corev1.Pod, error)
	CreateService(namespace string, service *corev1.Service) (*corev1.Service, error)
	DeleteService(namespace, name string) error
	GetService(namespace string, name string) (*corev1.Service, error)
	DeleteAllPodsMatchingLabel(namespace string, label string) error
	CreateConfigMap(namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error)
}

//go:generate counterfeiter -o mocks/HTTPClient.go -fake-name HTTPClient . HTTPClient

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

type Mustgather struct {
	Kube       Kube
	HTTPClient HTTPClient
	Config     *config.DeployerSettingsConfig
	Logger     *zap.SugaredLogger
}

type MustgatherStatus struct {
	StartedAt   string `json:"startedAt"`
	Completed   bool   `json:"completed"`
	CompletedAt string `json:"completedAt"`
	FileExists  bool   `json:"fileExists"`
	FilePath    string `json:"filePath"`
	Error       error  `json:"error"`
}

type KubeStatus struct {
	PodCreated     bool                 `json:"podCreated"`
	PodStatus      corev1.PodStatus     `json:"podStatus"`
	PodRunning     bool                 `json:"podRunning"`
	ServiceCreated bool                 `json:"serviceCreated"`
	ServiceStatus  corev1.ServiceStatus `json:"serviceStatus"`
}

type StatusResponse struct {
	KubeStatus       `json:"kube"`
	MustgatherStatus `json:"mustgather"`
}

type MustgatherConfig struct {
	Kubeconfig          []byte           `json:"kubeconfig"` // This field not needed for deployer implementation
	KubeconfigNamespace string           `json:"kubeconfigNamespace"`
	BasicAuth           config.BasicAuth `json:"basicAuth"`
	IsOpenshift         bool             `json:"isOpenshift"`
}

func New(logger *zap.Logger, k8sClient Kube, config *config.DeployerSettingsConfig, client HTTPClient) *Mustgather {
	return &Mustgather{
		Kube:       k8sClient,
		Logger:     logger.Sugar().Named("Mustgather"),
		Config:     config,
		HTTPClient: client,
	}
}

func createAppLabel(name string) string {
	return fmt.Sprintf("app=%s", name)
}

func createMustgatherKubeUrl(namespace, service string) string {
	return fmt.Sprintf("http://%s.%s.svc.cluster.local:3000", service, namespace)
}

func convertConfigImagePullSecrets(secrets []string) []corev1.LocalObjectReference {
	imagePullSecrets := []corev1.LocalObjectReference{}

	for _, secret := range secrets {
		secretAsObjectReference := corev1.LocalObjectReference{
			Name: secret,
		}
		imagePullSecrets = append(imagePullSecrets, secretAsObjectReference)
	}

	return imagePullSecrets
}

func (m *Mustgather) Create() error {
	podSpec := m.GetPodDefinition()

	serviceSpec := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name: config.DefaultMustgatherLabel,
			Labels: map[string]string{
				"app": config.DefaultMustgatherLabel,
			},
		},
		Spec: corev1.ServiceSpec{
			Ports: []corev1.ServicePort{
				{
					Port:     3000,
					Protocol: corev1.ProtocolTCP,
				},
			},
			Selector: map[string]string{
				"app": config.DefaultMustgatherLabel,
			},
		},
	}

	_, serviceErr := m.Kube.CreateService(m.Config.Namespace, serviceSpec)
	if serviceErr != nil {
		return serviceErr
	}

	label := createAppLabel(config.DefaultMustgatherLabel)
	_, podErr := m.Kube.DeleteAndCreatePod(m.Config.Namespace, podSpec, label)
	if podErr != nil {
		return podErr
	}

	mustgatherCM, err := m.GetMustgatherConfig()
	if err != nil {
		return err
	}
	_, err = m.Kube.CreateConfigMap(m.Config.Namespace, mustgatherCM)
	if err != nil {
		return err
	}

	return nil
}

func (m *Mustgather) GetPodDefinition() *corev1.Pod {
	imagePullSecrets := convertConfigImagePullSecrets(m.Config.ImagePullSecrets)
	imageURL := m.Config.OtherImages.MustgatherImage
	mustgatherImage := formatRegistryURL(imageURL)
	mustgatherTag := m.Config.OtherImages.MustgatherTag
	podSpec := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("%s-%d", config.DefaultMustgatherLabel, time.Now().Unix()), // unique for every pod
			Labels: map[string]string{
				"app": config.DefaultMustgatherLabel,
			},
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name:            "mustgather",
					Image:           fmt.Sprintf("%s:%s", mustgatherImage, mustgatherTag),
					ImagePullPolicy: corev1.PullAlways,
					Command:         []string{"ibp-mustgather", "-n", m.Config.Namespace},
					Ports: []corev1.ContainerPort{
						{
							Name:          "http",
							Protocol:      corev1.ProtocolTCP,
							ContainerPort: 3000,
						},
					},
				},
			},
			ImagePullSecrets: imagePullSecrets,
		},
	}

	podSpec.Spec.ServiceAccountName = m.Config.ServiceAccount

	// override if digests are detected
	if m.Config.OtherImages != nil && m.Config.OtherImages.MustgatherTag != "" && strings.HasPrefix(m.Config.OtherImages.MustgatherTag, "sha256:") {
		podSpec.Spec.Containers[0].Image = fmt.Sprintf("%s@%s", m.Config.OtherImages.MustgatherImage, m.Config.OtherImages.MustgatherTag)
	}
	return podSpec
}

func (m *Mustgather) GetMustgatherConfig() (*corev1.ConfigMap, error) {
	mustgatherConfig := &MustgatherConfig{
		// Keeping Kubeconfig empty will mean Mustgather will use incluster config
		KubeconfigNamespace: m.Config.Namespace,
		BasicAuth: config.BasicAuth{
			Username: m.Config.Auth.Username,
			Password: m.Config.Auth.Password,
		},
	}
	if m.Config.ClusterType == offering.OPENSHIFT {
		mustgatherConfig.IsOpenshift = true
	}

	configBytes, err := json.Marshal(mustgatherConfig)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal mustgather config")
	}

	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "mustgather-config",
			Namespace: m.Config.Namespace,
		},
		BinaryData: map[string][]byte{
			"config": configBytes,
		},
	}
	return cm, nil
}

func (m *Mustgather) Delete() error {
	label := createAppLabel(config.DefaultMustgatherLabel)
	podErr := m.Kube.DeleteAllPodsMatchingLabel(m.Config.Namespace, label)
	serviceErr := m.Kube.DeleteService(m.Config.Namespace, config.DefaultMustgatherLabel)

	if podErr != nil && serviceErr != nil {
		// Handle when both the pod and service error
		return errors.Wrap(errors.Wrap(podErr, serviceErr.Error()), "Error deleting mustgather pod and service")
	} else if serviceErr != nil {
		return errors.Wrap(serviceErr, "Error deleting mustgather service")
	} else if podErr != nil {
		return errors.Wrap(podErr, "Error deleting mustgather pod")
	}
	return nil
}

func (m *Mustgather) Status() (StatusResponse, error) {
	pod, podErr := m.Kube.GetPodsByLabel(m.Config.Namespace, config.DefaultMustgatherLabel)
	service, serviceErr := m.Kube.GetService(m.Config.Namespace, config.DefaultMustgatherLabel)

	// Defaults to falsy values for any properties that haven't been given
	response := StatusResponse{
		KubeStatus{
			PodCreated:     podErr == nil,
			ServiceCreated: serviceErr == nil,
		},
		MustgatherStatus{},
	}

	if podErr == nil && serviceErr == nil {
		// Only add the status fields if no errors have occured
		response.KubeStatus.PodStatus = pod.Status
		response.KubeStatus.PodRunning = pod.Status.Phase == corev1.PodRunning
		response.KubeStatus.ServiceStatus = service.Status

		// Only curl the svc if no errors have occured and the mustgather pod is running
		if response.KubeStatus.PodRunning {
			url := createMustgatherKubeUrl(m.Config.Namespace, config.DefaultMustgatherLabel) + "/status"

			username := m.Config.Auth.Username
			password := m.Config.Auth.Password

			req, err := http.NewRequest(http.MethodGet, url, nil)
			if err != nil {
				return response, errors.Wrap(err, "failed to create GET request")
			}
			req.SetBasicAuth(username, password)

			resp, respErr := m.HTTPClient.Do(req)
			if respErr != nil {
				return response, respErr
			}

			decoder := json.NewDecoder(resp.Body)
			var status MustgatherStatus
			decodeErr := decoder.Decode(&status)
			if decodeErr != nil {
				return response, decodeErr
			}

			response.MustgatherStatus = status
		}
	}

	return response, nil
}

func (m *Mustgather) Download() (*http.Response, error) {
	url := createMustgatherKubeUrl(m.Config.Namespace, config.DefaultMustgatherLabel) + "/download"

	username := m.Config.Auth.Username
	password := m.Config.Auth.Password

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create GET request")
	}
	req.SetBasicAuth(username, password)

	resp, respErr := m.HTTPClient.Do(req)
	fmt.Println(resp)
	if respErr != nil {
		return nil, respErr
	}

	return resp, nil
}

func remove(regstryURL []string, i int) []string {
	return append(regstryURL[:i], regstryURL[i+1:]...)
}

func formatRegistryURL(url string) string {
	registryURL := strings.Split(url, "/")
	l := len(registryURL)

	if l == 4 && registryURL[2] == "ibm-hlfsupport" {
		registryURL = remove(registryURL, l-2)
	}
	return strings.Join(registryURL, "/")
}
