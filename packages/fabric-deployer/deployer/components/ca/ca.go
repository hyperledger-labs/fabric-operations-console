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

package ca

import (
	"encoding/json"
	"time"

	"github.com/pkg/errors"
	"sigs.k8s.io/yaml"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	ibpca "github.com/IBM-Blockchain/fabric-operator/api/ca/v1"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	"go.uber.org/zap"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/wait"
)

const (
	PortNameOperations  = "operations"
	PortNameHttp        = "http"
	EndpointURLTemplate = "https://%s:%s"
)

// Supported actions for CA
const (
	ACTIONS   = "actions"
	RESOURCES = "resources"
	STORAGE   = "storage"
	STATUS    = "status"
	CONFIG    = "config"
	VERSION   = "version"
	ENDPOINTS = "endpoints"
	REPLICAS  = "replicas"
	HSM       = "hsm"
	CRYPTO    = "crypto"
	ALL       = "all"
)

//go:generate counterfeiter -o mocks/kube.go -fake-name Kube . Kube

type Kube interface {
	GetService(namespace, name string) (*corev1.Service, error)
	GetConfigMap(namespace, name string) (*corev1.ConfigMap, error)
	GetPort(namespace, name string) (int32, error)
	GetPorts(namespace, name string) ([]corev1.ServicePort, error)
}

//go:generate counterfeiter -o mocks/ibp_client.go -fake-name IBPOperatorClient . IBPOperatorClient

type IBPOperatorClient interface {
	GetCR(namespace string, kind string, name string, cr runtime.Object) error
	GetAllCR(namespace string, kind string, crlist runtime.Object) error
	CreateCR(namespace string, kind string, cr interface{}) error
	DeleteCR(namespace string, kind string, name string) error
	UpdateCR(namespace string, kind string, name string, bytes []byte) error
	PatchCR(namespace string, kind string, name string, bytes []byte) error
}

type CA struct {
	Kube              Kube
	Logger            *zap.SugaredLogger
	IBPOperatorClient IBPOperatorClient
	Config            *config.DeployerSettingsConfig
}

func New(logger *zap.Logger, k8sClient Kube, ibpClient IBPOperatorClient, config *config.DeployerSettingsConfig) *CA {
	return &CA{
		Kube:              k8sClient,
		Logger:            logger.Sugar().Named("CA"),
		IBPOperatorClient: ibpClient,
		Config:            config,
	}
}

func (ca *CA) CreateCR(domain, sID, compName, namespace string, body []byte) (*api.Response, int, error) {
	var err error
	statusCode := 0

	// if comp name is not passed, return error as comp name is required
	if compName == "" {
		ca.Logger.Error("Component name not valid, cannot be empty")
		return nil, statusCode, errors.New("component name not valid, cannot be empty")
	}

	ca.Logger.Debugf("Received request to create ca cr '%s' in namespace '%s'", compName, namespace)

	request := &api.CreateRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			ca.Logger.Error(errors.Wrapf(err, "failed to unmarshal configuration, configuration is not valid"))
			return nil, statusCode, errors.Wrapf(err, "failed to unmarshal configuration, configuration is not valid")
		}
	}

	// if version is not passed, get the default version - version is in full hyphenated format
	version := request.Version
	if version == "" {
		version = ca.GetDefaultVersion()
	} else if !util.IsValidVersion("ca", version, ca.Config.Versions) {
		// version is not valid
		ca.Logger.Error("Version not valid")
		return nil, statusCode, errors.Errorf("version not valid")
	}

	// merge storage and resources
	storage := ca.GetStorage(ca.Config.Defaults, request.Storage)
	resources := ca.GetResources(ca.Config.Defaults, request.Resources)

	err = ca.checkCreateReplicas(request)
	if err != nil {
		ca.Logger.Error(errors.Wrap(err, "Failed to check create replicas"))
		return nil, statusCode, err
	}

	zone, region := util.GetZoneAndRegion(request.Zone, request.Region)

	cr := &current.IBPCA{
		Spec: current.IBPCASpec{
			License: current.License{
				Accept: true,
			},
			Arch:             request.Arch,
			Resources:        resources,
			Storage:          storage,
			Images:           ca.Images(version),
			ImagePullSecrets: ca.Config.ImagePullSecrets,
			Service: &current.Service{
				Type: ca.Config.ServiceConfig.Type,
			},
			ConfigOverride: request.ConfigOverride,
			HSM:            request.HSM,
			Replicas:       request.Replicas,
			Zone:           zone,
			Region:         region,
			Domain:         ca.Config.Domain,
			FabricVersion:  version,
		},
	}
	cr.Name = compName

	err = ca.IBPOperatorClient.CreateCR(namespace, "ibpcas", cr)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "Failed to create cr '%s' in namespace '%s", compName, namespace))
		return nil, statusCode, err
	}

	ca.Logger.Debugf("Created cr '%s'", cr.Name)
	// get cr status
	// if status is deployed -> get connection profile
	// if status is error -> we are done
	ca.Logger.Debugf("Polling for cr spec status for :'%s'", compName)
	originalCR := &current.IBPCA{}
	err = wait.Poll(500*time.Millisecond, time.Duration(ca.Config.Timeouts.Deployment)*time.Millisecond, func() (bool, error) {
		err = ca.IBPOperatorClient.GetCR(namespace, "ibpcas", compName, originalCR)
		if err == nil {
			// check the status field
			if originalCR.Status.Status == current.True {
				// if error then get out
				if originalCR.Status.Type == current.Error {
					// if cr status is error, no need to get configs
					return true, errors.New("CR status is set to error")
				}
				cmName := compName + "-connection-profile"
				cm, err := ca.Kube.GetConfigMap(namespace, cmName)
				if err == nil && cm != nil {
					return true, nil
				}
			}
			return false, nil
		} else {
			// immediately fail on error
			return true, err
		}
	})

	// cr status did not change to deployed/error before timeout
	if err != nil {
		ca.Logger.Warnf("Status not set after timeout or got an error: %s", err)
		// return error immediately, something went wrong
		statusCode = 500
		if originalCR.Status.Status == current.True && originalCR.Status.Type == current.Error {
			// dont error out
		} else {
			return nil, statusCode, err
		}
	}

	// build the response
	response, statusCodeNew, err := ca.GetCRResponse(ALL, compName, namespace, sID)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "Failed to build response object '%s'", compName))
		return nil, statusCode, err
	}
	if statusCode == 0 && statusCodeNew != 0 {
		statusCode = statusCodeNew
	}
	response.Version = version
	timestamp := time.Now().Unix()
	response.CreationTimestamp = timestamp
	response.LastUpdatedTimestamp = timestamp

	return response, statusCode, nil
}

func (ca *CA) Images(version string) *current.CAImages {
	caVersionedImages := ca.Config.Versions.CA[version].Image

	images := &current.CAImages{}

	images.CAImage = caVersionedImages.CAImage
	images.CAInitImage = caVersionedImages.CAInitImage
	images.HSMImage = caVersionedImages.HSMImage
	images.EnrollerImage = caVersionedImages.EnrollerImage

	if ca.Config.UseTags != nil && *ca.Config.UseTags {
		// Set the tags
		images.CAInitTag = caVersionedImages.CAInitTag
		images.CATag = caVersionedImages.CATag
		images.EnrollerTag = caVersionedImages.EnrollerTag
		images.HSMTag = caVersionedImages.HSMTag
	} else {
		// set the digests to the tags
		images.CAInitTag = caVersionedImages.CAInitDigest
		images.CATag = caVersionedImages.CADigest
		images.EnrollerTag = caVersionedImages.EnrollerDigest
		images.HSMTag = caVersionedImages.HSMDigest
	}
	return images
}

func (ca *CA) DeleteCR(sID, compName, namespace string, body []byte) (*api.DeleteResponse, int, error) {
	var err error
	statusCode := 0
	ca.Logger.Debugf("Received request delete ca cr '%s' in namespace '%s'", compName, namespace)

	request := &api.DeleteRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			ca.Logger.Error(errors.Wrapf(err, "Failed to unmarshal configuration"))
			return nil, statusCode, errors.Wrapf(err, "failed to unmarshal configuration, configuration is not valid")
		}
	}

	err = ca.IBPOperatorClient.DeleteCR(namespace, "ibpcas", compName)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "Failed to delete ca cr '%s' in namespace '%s'", compName, namespace))
		return nil, statusCode, err
	}

	return &api.DeleteResponse{
		Message: "ok",
	}, statusCode, nil
}

func (ca *CA) GetConnectionProfile(compName, namespace string) (*api.ConnectionProfile, error) {
	ca.Logger.Debugf("Received request to get connection profile for '%s' in namespace '%s'", compName, namespace)

	cmName := compName + "-connection-profile"
	cm, err := ca.Kube.GetConfigMap(namespace, cmName)
	if err != nil {
		return nil, err
	}
	binaryData := cm.BinaryData
	if binaryData["profile.json"] == nil {
		return nil, errors.New("profile.json not found in configmap")
	}
	data := binaryData["profile.json"]

	connectionProfile := &api.ConnectionProfile{}
	err = json.Unmarshal(data, connectionProfile)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal connection profile")
	}
	return connectionProfile, nil
}

func (ca *CA) GetConfig(compName, namespace, caType string) (*ibpca.ServerConfig, error) {
	ca.Logger.Debugf("Received request to get config for '%s' in namespace '%s'", compName, namespace)

	caConfig := &ibpca.ServerConfig{}
	cmName := compName + "-" + caType + "-config"
	cm, err := ca.Kube.GetConfigMap(namespace, cmName)
	if err != nil {
		return nil, err
	}
	binaryData := cm.BinaryData
	if binaryData["fabric-ca-server-config.yaml"] == nil {
		return nil, errors.New("fabric-ca-server-config.yaml not found in configmap")
	}
	data := binaryData["fabric-ca-server-config.yaml"]

	err = yaml.Unmarshal(data, caConfig)
	if err != nil {
		ca.Logger.Error(errors.Wrapf(err, "Could not unmarshal configmap"))
		return nil, err
	}
	return caConfig, nil
}

func (ca *CA) checkCreateReplicas(request *api.CreateRequest) error {
	return ca.CheckReplicas(request.Replicas, request.ConfigOverride)
}

func (ca *CA) CheckReplicas(replicas *int32, configOverride *current.ConfigOverride) error {
	if replicas != nil && *replicas > 1 {
		if configOverride == nil {
			return errors.New("CA & TLSCA config override should be passed to allow replicas > 1")
		}
		if configOverride.CA == nil && configOverride.TLSCA == nil {
			return errors.New("CA & TLSCA config override should be passed to allow replicas > 1")
		} else if configOverride.CA == nil {
			return errors.New("CA config override missing to allow replicas > 1")
		} else if configOverride.TLSCA == nil {
			return errors.New("TLSCA config override missing to allow replicas > 1")
		}

		configoverrideCA := &ibpca.ServerConfig{}
		err := json.Unmarshal(configOverride.CA.Raw, configoverrideCA)
		if err != nil {
			return errors.New("[checkReplicas] Failed to unmarshal CA configoverride")
		}

		configoverrideTLSCA := &ibpca.ServerConfig{}
		err = json.Unmarshal(configOverride.TLSCA.Raw, configoverrideTLSCA)
		if err != nil {
			return errors.New("[checkReplicas] Failed to unmarshal TLSCA configoverride")
		}

		if configoverrideCA.CAConfig.DB == nil || configoverrideTLSCA.CAConfig.DB == nil {
			return errors.New("DB Type in CA & TLSCA config override should be `postgres` to allow replicas > 1")
		}

		if configoverrideCA.CAConfig.DB != nil {
			if configoverrideCA.CAConfig.DB.Type != "postgres" {
				return errors.New("DB Type in CA config override should be `postgres` to allow replicas > 1")
			}
			if configoverrideCA.CAConfig.DB.Datasource == "" {
				return errors.New("Datasource in CA config override should not be empty to allow replicas > 1")
			}
		}

		if configoverrideTLSCA.CAConfig.DB != nil {
			if configoverrideTLSCA.CAConfig.DB.Type != "postgres" {
				return errors.New("DB Type in TLSCA config override should be `postgres` to allow replicas > 1")
			}
			if configoverrideTLSCA.CAConfig.DB.Datasource == "" {
				return errors.New("Datasource in TLSCA config override should not be empty to allow replicas > 1")
			}
		}
	}

	return nil
}

func (ca *CA) GetDefaultVersion() string {
	return util.GetDefaultVersion("ca", ca.Config.Versions)
}

func (ca *CA) GetResourceForResponse(resources *current.CAResources) (*util.ResourceReturn, *current.CAResources) {
	caResources := []*corev1.ResourceRequirements{resources.CA}
	totalResources := util.GetTotalDeploymentResources(caResources)
	individualResources := ca.GetIndividualResources(resources)
	return totalResources, individualResources
}

func (ca *CA) GetStorage(defaults *config.DeployerDefaults, override *current.CAStorages) *current.CAStorages {
	storage := defaults.Storage.CA

	if override != nil {
		if override.CA != nil && override.CA.Size != "" {
			storage.CA.Size = override.CA.Size
		}
		if override.CA != nil && override.CA.Class != "" {
			storage.CA.Class = override.CA.Class
		}
	}
	return storage
}

func (ca *CA) GetResources(defaults *config.DeployerDefaults, override *current.CAResources) *current.CAResources {
	resources := defaults.Resources.CA

	if override != nil {
		if override.CA != nil {
			if override.CA.Requests == nil {
				override.CA.Requests = override.CA.Limits
			}
			if override.CA.Limits == nil {
				override.CA.Limits = override.CA.Requests
			}

			if override.CA.Requests != nil {
				resources.CA.Requests = override.CA.Requests
			}
			if override.CA.Limits != nil {
				resources.CA.Limits = override.CA.Limits
			}
		}

		if override.Init != nil {
			if override.Init.Requests == nil {
				override.Init.Requests = override.Init.Limits
			}
			if override.Init.Limits == nil {
				override.Init.Limits = override.Init.Requests
			}

			if override.Init.Requests != nil {
				resources.Init.Requests = override.Init.Requests
			}
			if override.Init.Limits != nil {
				resources.Init.Limits = override.Init.Limits
			}
		}
	}

	return resources
}

func (ca *CA) GetIndividualResources(allResources *current.CAResources) *current.CAResources {
	resources := &current.CAResources{}
	if allResources.CA != nil {
		resources.CA = allResources.CA
	}
	if allResources.Init != nil {
		resources.Init = allResources.Init
	}
	return resources
}

func (ca *CA) GetCANames(caSpec current.IBPCASpec) (string, string, error) {
	var caName, tlscaName = "ca", "tlsca"
	if caSpec.ConfigOverride != nil && caSpec.ConfigOverride.CA != nil {
		configoverrideCA := &ibpca.ServerConfig{}
		err := json.Unmarshal(caSpec.ConfigOverride.CA.Raw, configoverrideCA)
		if err != nil {
			ca.Logger.Error(errors.Wrapf(err, "Failed to unmarshal configoverride for CA"))
			return "", "", err
		}
		if configoverrideCA.CA.Name != "" {
			caName = configoverrideCA.CA.Name
		}
	}

	if caSpec.ConfigOverride != nil && caSpec.ConfigOverride.TLSCA != nil {
		configoverrideTLSCA := &ibpca.ServerConfig{}
		err := json.Unmarshal(caSpec.ConfigOverride.TLSCA.Raw, configoverrideTLSCA)
		if err != nil {
			ca.Logger.Error(errors.Wrapf(err, "Failed to unmarshal configoverride for TLSCA"))
			return "", "", err
		}
		if configoverrideTLSCA.CA.Name != "" {
			tlscaName = configoverrideTLSCA.CA.Name
		}
	}

	return caName, tlscaName, nil
}
