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

package kube

import (
	"context"
	"fmt"
	"strings"

	"github.com/pkg/errors"

	apiv1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type Kube struct {
	clientset *kubernetes.Clientset
}

func InClusterConfig() (*rest.Config, error) {
	return rest.InClusterConfig()
}

func NewForConfig(config *rest.Config) (*Kube, error) {
	clientSet, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	return &Kube{
		clientset: clientSet,
	}, nil
}

func (k *Kube) GetNamespaces() (*apiv1.NamespaceList, error) {
	return k.clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
}

// GetVersion returns back kubernetes server version
func (k *Kube) GetVersion() (*version.Info, error) {
	v, err := k.clientset.DiscoveryClient.ServerVersion()
	if err != nil {
		return nil, errors.Wrap(err, "call to kubernetes API server failed")
	}
	return v, nil
}

func (k *Kube) GetService(namespace, name string) (*apiv1.Service, error) {
	return k.clientset.CoreV1().Services(namespace).Get(context.TODO(), name, metav1.GetOptions{})
}

func (k *Kube) CreateService(namespace string, service *apiv1.Service) (*apiv1.Service, error) {
	service, err := k.clientset.CoreV1().Services(namespace).Create(context.TODO(), service, metav1.CreateOptions{})
	if err != nil {
		if !strings.Contains(err.Error(), "already exists") {
			return nil, errors.Wrap(err, "failed to create service")
		}
	}

	return service, nil
}

func (k *Kube) DeleteService(namespace, name string) error {
	return k.clientset.CoreV1().Services(namespace).Delete(context.TODO(), name, metav1.DeleteOptions{})
}

func (k *Kube) CreateConfigMap(namespace string, cm *apiv1.ConfigMap) (*apiv1.ConfigMap, error) {
	configMap, err := k.clientset.CoreV1().ConfigMaps(namespace).Create(context.TODO(), cm, metav1.CreateOptions{})
	if err != nil {
		if !strings.Contains(err.Error(), "already exists") {
			return nil, errors.Wrap(err, "failed to create config map")
		}
	}
	return configMap, nil
}

func (k *Kube) GetConfigMap(namespace, name string) (*apiv1.ConfigMap, error) {
	return k.clientset.CoreV1().ConfigMaps(namespace).Get(context.TODO(), name, metav1.GetOptions{})
}

func (k *Kube) CreateSecret(namespace string, secret *apiv1.Secret) (*apiv1.Secret, error) {
	secret, err := k.clientset.CoreV1().Secrets(namespace).Create(context.TODO(), secret, metav1.CreateOptions{})
	if err != nil {
		if !strings.Contains(err.Error(), "already exists") {
			return nil, errors.Wrap(err, "failed to create secret")
		}
	}
	return secret, nil
}

func (k *Kube) GetSecret(namespace string, name string) (*apiv1.Secret, error) {
	return k.clientset.CoreV1().Secrets(namespace).Get(context.TODO(), name, metav1.GetOptions{})
}

func (k *Kube) UpdateSecret(namespace, name, path string, data []byte) (*apiv1.Secret, error) {
	return k.clientset.CoreV1().Secrets(namespace).Patch(context.TODO(), name, types.StrategicMergePatchType, data, metav1.PatchOptions{}, path)
}

func (k *Kube) DeleteAndCreateSecret(namespace string, secret *apiv1.Secret) (*apiv1.Secret, error) {
	name := secret.Name
	err := k.DeleteSecret(namespace, name)
	if err != nil {
		// NO-OP: we want to create the secret anyways even if there's an error deleting it beforehand
	}
	return k.CreateSecret(namespace, secret)
}

func (k *Kube) DeleteSecret(namespace string, secretName string) error {
	return k.clientset.CoreV1().Secrets(namespace).Delete(context.TODO(), secretName, metav1.DeleteOptions{})
}

func (k *Kube) GetPort(namespace, name string) (int32, error) {
	service, err := k.clientset.CoreV1().Services(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return 0, err
	}
	return service.Spec.Ports[0].NodePort, nil
}

func (k *Kube) GetPorts(namespace, name string) ([]apiv1.ServicePort, error) {
	service, err := k.clientset.CoreV1().Services(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return service.Spec.Ports, nil
}

func (k *Kube) DeleteDeployment(namespace string, depName string) error {
	return k.clientset.AppsV1().Deployments(namespace).Delete(context.TODO(), depName, metav1.DeleteOptions{})
}

func (k *Kube) GetPodsByLabel(namespace, name string) (*apiv1.Pod, error) {
	podsList, err := k.clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: fmt.Sprintf("app=%s", name),
	})
	if err != nil {
		return nil, err
	}
	if podsList == nil || len(podsList.Items) == 0 {
		return nil, errors.New("pod not found")
	}
	pod := podsList.Items[0]
	return &pod, nil
}

func (k *Kube) CreatePod(namespace string, pod *apiv1.Pod) (*apiv1.Pod, error) {
	return k.clientset.CoreV1().Pods(namespace).Create(context.TODO(), pod, metav1.CreateOptions{})
}

func (k *Kube) DeletePod(namespace string, name string) error {
	return k.clientset.CoreV1().Pods(namespace).Delete(context.TODO(), name, metav1.DeleteOptions{})
}

func (k *Kube) DeleteAllPodsMatchingLabel(namespace string, label string) error {
	podsList, getPodsByLabelErr := k.clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: label,
	})
	if getPodsByLabelErr != nil {
		return getPodsByLabelErr
	}

	// If pods are found, delete them
	if podsList != nil || len(podsList.Items) != 0 {
		for _, podToDelete := range podsList.Items {
			fmt.Println(podToDelete.Name)
			deleteErr := k.DeletePod(namespace, podToDelete.Name)
			if deleteErr != nil {
				return deleteErr
			}
		}
	}

	return nil
}

func (k *Kube) DeleteAndCreatePod(namespace string, podSpec *apiv1.Pod, label string) (*apiv1.Pod, error) {
	cleanupErr := k.DeleteAllPodsMatchingLabel(namespace, label)
	if cleanupErr != nil {
		return nil, cleanupErr
	}

	pod, createErr := k.CreatePod(namespace, podSpec)
	if createErr != nil {
		if !strings.Contains(createErr.Error(), "already exists") {
			return nil, errors.Wrap(createErr, "failed to create pod after deletion "+podSpec.ObjectMeta.Name)
		}
	}

	return pod, nil
}
