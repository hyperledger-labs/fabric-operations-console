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

package orderer

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/pkg/errors"
	"sigs.k8s.io/yaml"

	dconfig "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	config "github.com/IBM-Blockchain/fabric-operator/api/orderer/v1"
	v2config "github.com/IBM-Blockchain/fabric-operator/api/orderer/v2"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	"go.uber.org/zap"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/wait"
)

const (
	PortNameOperations      = "operations"
	PortNameOrdererGrpc     = "orderer-grpc"
	PortNameGrpcWeb         = "grpcweb"
	EndpointHttpURLTemplate = "https://%s:%s"
	EndpointGrpcURLTemplate = "grpcs://%s:%s"
)

// Supported actions for Orderer
const (
	ACTIONS    = "actions"
	RESOURCES  = "resources"
	CONFIG     = "config"
	CRYPTO     = "crypto"
	ADMINCERTS = "admincerts"
	NODEOU     = "nodeou"
	STORAGE    = "storage"
	STATUS     = "status"
	ENDPOINTS  = "endpoints"
	VERSION    = "version"
	REPLICAS   = "replicas"
	GENESIS    = "genesis"
	HSM        = "hsm"
	ALL        = "all"
)

//go:generate counterfeiter -o mocks/kube.go -fake-name Kube . Kube

type Kube interface {
	GetNamespaces() (*corev1.NamespaceList, error)
	GetService(namespace, name string) (*corev1.Service, error)
	GetConfigMap(namespace, name string) (*corev1.ConfigMap, error)
	DeleteAndCreateSecret(namespace string, secret *corev1.Secret) (*corev1.Secret, error)
	DeleteSecret(namespace string, name string) error
	GetPort(namespace, name string) (int32, error)
	GetPorts(namespace, name string) ([]corev1.ServicePort, error)
	GetSecret(namespace string, name string) (*corev1.Secret, error)
	UpdateSecret(namespace, name, path string, data []byte) (*corev1.Secret, error)
	DeleteDeployment(namespace string, depName string) error
	GetPodsByLabel(namespace, name string) (*corev1.Pod, error)
}

//go:generate counterfeiter -o mocks/ibp_client.go -fake-name IBPOperatorClient . IBPOperatorClient

type IBPOperatorClient interface {
	GetCR(namespace string, kind string, name string, cr runtime.Object) error
	GetAllCR(namespace string, kind string, cr runtime.Object) error
	CreateCR(namespace string, kind string, cr interface{}) error
	DeleteCR(namespace string, kind string, name string) error
	UpdateCR(namespace string, kind string, name string, bytes []byte) error
	PatchCR(namespace string, kind string, name string, bytes []byte) error
}

type Orderer struct {
	Kube              Kube
	Logger            *zap.SugaredLogger
	IBPOperatorClient IBPOperatorClient
	Config            *dconfig.DeployerSettingsConfig
}

func New(logger *zap.Logger, k8sClient Kube, ibpClient IBPOperatorClient, config *dconfig.DeployerSettingsConfig) *Orderer {
	return &Orderer{
		Kube:              k8sClient,
		Logger:            logger.Sugar().Named("Orderer"),
		IBPOperatorClient: ibpClient,
		Config:            config,
	}
}

func (o *Orderer) Images(version string) *current.OrdererImages {
	ordererVersionedImages := o.Config.Versions.Orderer[version].Image

	images := &current.OrdererImages{}

	images.OrdererImage = ordererVersionedImages.OrdererImage
	images.OrdererInitImage = ordererVersionedImages.OrdererInitImage
	images.HSMImage = ordererVersionedImages.HSMImage
	images.EnrollerImage = ordererVersionedImages.EnrollerImage
	images.GRPCWebImage = ordererVersionedImages.GRPCWebImage

	if o.Config.UseTags != nil && *o.Config.UseTags {
		// Set the tags
		images.OrdererInitTag = ordererVersionedImages.OrdererInitTag
		images.OrdererTag = ordererVersionedImages.OrdererTag
		images.EnrollerTag = ordererVersionedImages.EnrollerTag
		images.HSMTag = ordererVersionedImages.HSMTag
		images.GRPCWebTag = ordererVersionedImages.GRPCWebTag
	} else {
		// set the digests to the tags
		images.OrdererInitTag = ordererVersionedImages.OrdererInitDigest
		images.OrdererTag = ordererVersionedImages.OrdererDigest
		images.EnrollerTag = ordererVersionedImages.EnrollerDigest
		images.HSMTag = ordererVersionedImages.HSMDigest
		images.GRPCWebTag = ordererVersionedImages.GRPCWebDigest
	}
	return images
}

func (o *Orderer) CreateCluster(domain, sID, compName string, body []byte) ([]api.Response, int, error) {
	o.Logger.Debugf("Received request to create cluster with domain '%s', id '%s'", domain, sID)
	var err error
	statusCode := 0
	request := &api.CreateRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			o.Logger.Error(errors.Wrapf(err, "failed to unmarshal configuration, configuration is not a valid yaml file"))
			return nil, statusCode, errors.Wrapf(err, "failed to unmarshal configuration, configuration is not a valid yaml file")
		}
	}

	number := request.Number
	if number == 0 {
		number = 1
	}

	// version is the full hyphenated format of fabric version
	version := request.Version
	if version == "" {
		version = util.GetDefaultVersion("orderer", o.Config.Versions)
	} else if !util.IsValidVersion("orderer", request.Version, o.Config.Versions) {
		// version is not valid
		o.Logger.Error(errors.Errorf("Version not valid"))
		return nil, statusCode, errors.Errorf("version not valid")
	}

	zones := request.Zone
	regions := request.Region

	if zones != nil && len(zones) != number {
		o.Logger.Error(errors.Wrap(err, "zones length must be equal to cluster size"))
		return nil, statusCode, errors.Wrap(err, "zones length must be equal to cluster size")
	}

	if regions != nil && len(regions) != number {
		o.Logger.Error(errors.Wrap(err, "regions length must be equal to cluster size"))
		return nil, statusCode, errors.Wrap(err, "regions length must be equal to cluster size")
	}

	if regions == nil {
		regions = make([]string, number)
	}

	storage := o.GetStorage(o.Config.Defaults, request.Storage)
	resources := o.GetResources(o.Config.Defaults, request.Resources)
	systemChannelName := request.SystemChannelName
	if systemChannelName == "" {
		systemChannelName = "testchainid"
	}

	clusterlocation := []current.IBPOrdererClusterLocation{}

	for i := 0; i < number; i++ {
		clusterlocation = append(clusterlocation, current.IBPOrdererClusterLocation{})
	}

	if zones != nil && len(zones) > 0 {
		for i := 0; i < number; i++ {
			zone, region := util.GetZoneAndRegion(zones[i], regions[i])
			clusterlocation[i].Zone = zone
			clusterlocation[i].Region = region
		}
	}

	spec := &current.IBPOrdererSpec{
		License: current.License{
			Accept: true,
		},
		Arch:                  request.Arch,
		Resources:             resources,
		Storage:               storage,
		OrgName:               request.Orgname,
		MSPID:                 request.Orgname,
		OrdererType:           "etcdraft",
		SystemChannelName:     systemChannelName,
		ClusterConfigOverride: request.ConfigOverride,
		HSM:                   request.HSM,
		Images:                o.Images(version),
		ImagePullSecrets:      o.Config.ImagePullSecrets,
		Service: &current.Service{
			Type: o.Config.ServiceConfig.Type,
		},
		ClusterSecret:   request.Config,
		ClusterSize:     number,
		Domain:          o.Config.Domain,
		ClusterLocation: clusterlocation,
		FabricVersion:   version,
		UseChannelLess:  request.ChannelLess,
	}

	if request.Genesis != nil && request.Genesis.Block != "" {
		spec.GenesisBlock = request.Genesis.Block
	}

	// TODO: why do we pass namespace from config and not the namespace passed from API call?
	resp, statusCodeLocal, err := o.Create(domain, compName, o.Config.Namespace, version, sID, spec)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "Failed to complete request to create in domain '%s'", domain))
		return nil, statusCodeLocal, err
	}

	if statusCode == 0 && statusCodeLocal != 0 {
		statusCode = statusCodeLocal
	}

	return resp, statusCode, nil
}

func (o *Orderer) CreateCR(domain, sID, compName, namespace string, body []byte) ([]api.Response, int, error) {
	var err error
	statusCode := 0

	if compName == "" {
		o.Logger.Error("Component name not valid, cannot be empty")
		return nil, statusCode, errors.New("component name not valid, cannot be empty")
	}

	o.Logger.Debugf("Received request to create orderer cr for '%s' in namespace '%s', domain '%s', id '%s'", compName, namespace, domain, sID)

	resp, statusCode, err := o.CreateCluster(domain, sID, compName, body) // TODO: should we pass namespace passed into this function
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "Failed to create orderer for '%s' in namespace '%s'", compName, namespace))
		return nil, statusCode, errors.Wrapf(err, "failed to create orderer")
	}
	return resp, statusCode, nil
}

func (o *Orderer) Create(domain, compName, namespace, version, sID string, spec *current.IBPOrdererSpec) ([]api.Response, int, error) {
	o.Logger.Debugf("Received request to create cr in domain '%s', name '%s', namespace '%s'", domain, compName, namespace)

	statusCode := 0
	cr := &current.IBPOrderer{
		Spec: *spec,
	}
	cr.Name = compName

	err := o.IBPOperatorClient.CreateCR(namespace, "ibporderers", cr)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "Failed to create cr for '%s' in namespace '%s", cr.Name, namespace))
		return nil, statusCode, err
	}

	allresponses := []api.Response{}
	for i := 1; i <= spec.ClusterSize; i++ {
		nodeName := fmt.Sprintf("%s%s%d", compName, common.NODE, i)

		originalCR := &current.IBPOrderer{}

		o.Logger.Debugf("Cluster type is %s, polling for cr spec status '%s'", o.Config.ClusterType, nodeName)
		failedCounter := 0
		err = wait.Poll(500*time.Millisecond, time.Duration(o.Config.Timeouts.Deployment)*time.Millisecond, func() (bool, error) {
			err = o.IBPOperatorClient.GetCR(namespace, "ibporderers", nodeName, originalCR)
			if err == nil {
				// check the status field
				if originalCR.Status.Status == current.True {
					// go out if error
					if originalCR.Status.Type == current.Error {
						// if cr status is error, no need to get configs
						return true, errors.New("CR status is set to error")
					}
					cmName := nodeName + "-connection-profile"
					cm, err := o.Kube.GetConfigMap(namespace, cmName)
					if err == nil && cm != nil {
						return true, nil
					}
				}
				return false, nil
			} else {
				// for first node wait for sometime for genesis block logic to happen
				failedCounter++
				if i == 1 && failedCounter >= o.Config.Timeouts.OrdererFailureCount {
					return true, err
				} else if i != 1 {
					return true, err
				}
				return false, nil
			}
		})

		if err != nil {
			o.Logger.Warnf("CR Status not updated before timeout or got an error: %s", err)
			// return error immediately, something went wrong
			statusCode = 500
			if originalCR.Status.Status == current.True && originalCR.Status.Type == current.Error {
				// dont error out
			} else {
				return nil, statusCode, err
			}
		}

		// build the response
		response, statusCodeNew, err := o.GetCRResponse(ALL, nodeName, namespace, sID)
		if err != nil {
			o.Logger.Error(errors.Wrapf(err, "Failed to build response object '%s'", nodeName))
			return nil, statusCode, err
		}
		if statusCode == 0 && statusCodeNew != 0 {
			statusCode = statusCodeNew
		}
		response.Version = version
		timestamp := time.Now().Unix()
		response.CreationTimestamp = timestamp
		response.LastUpdatedTimestamp = timestamp

		allresponses = append(allresponses, *response)
	}

	return allresponses, statusCode, nil
}

// precreate creates a CR spec with directly the orderer node spec
// we need to give it name and number and leave the genesis block blank
func (o *Orderer) PrecreateCR(domain, sID string, body []byte, compName string) (*api.Response, int, error) {
	o.Logger.Debugf("Received request to precreate cr for '%s' in domain '%s', id '%s'", compName, domain, sID)

	var err error
	statusCode := 0
	request := &api.PrecreateRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			o.Logger.Error(errors.Wrapf(err, "Failed to unmarshal configuration, configuration is not a valid yaml file"))
			return nil, statusCode, errors.Wrapf(err, "failed to unmarshal configuration, configuration is not a valid yaml file")
		}
	}

	// version is the full hyphenated format of fabric version
	version := request.Version
	if version == "" {
		version = util.GetDefaultVersion("orderer", o.Config.Versions)
	}

	storage := o.GetStorage(o.Config.Defaults, request.Storage)
	resources := o.GetResources(o.Config.Defaults, request.Resources)
	systemChannelName := request.SystemChannelName
	if systemChannelName == "" {
		systemChannelName = "testchainid"
	}

	zone, region := util.GetZoneAndRegion(request.Zone, request.Region)
	t := true
	nodeNumber := 1

	spec := &current.IBPOrdererSpec{
		License: current.License{
			Accept: true,
		},
		Arch:              request.Arch,
		Resources:         resources,
		Storage:           storage,
		OrgName:           request.Orgname,
		MSPID:             request.Orgname,
		OrdererType:       "etcdraft",
		SystemChannelName: systemChannelName,
		ConfigOverride:    request.ConfigOverride,
		HSM:               request.HSM,
		Images:            o.Images(version),
		ImagePullSecrets:  o.Config.ImagePullSecrets,
		Service: &current.Service{
			Type: o.Config.ServiceConfig.Type,
		},
		Secret:        request.Config,
		Domain:        o.Config.Domain,
		Region:        region,
		Zone:          zone,
		IsPrecreate:   &t,
		NodeNumber:    &nodeNumber,
		FabricVersion: version,
	}

	cr := &current.IBPOrderer{
		Spec: *spec,
	}
	cr.Name = compName

	err = o.IBPOperatorClient.CreateCR(o.Config.Namespace, "ibporderers", cr)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "Failed to create cr for '%s' in namespace '%s'", cr.Name, o.Config.Namespace))
		return nil, statusCode, err
	}

	originalCR := &current.IBPOrderer{}
	o.Logger.Debugf("Cluster type is %s, polling for cr spec status '%s'", o.Config.ClusterType, compName)
	err = wait.Poll(500*time.Millisecond, time.Duration(o.Config.Timeouts.Deployment)*time.Millisecond, func() (bool, error) {
		err = o.IBPOperatorClient.GetCR(o.Config.Namespace, "ibporderers", compName, originalCR)
		if err == nil {
			// check the status field
			if originalCR.Status.Status == current.True {
				// go out if error
				if originalCR.Status.Type == current.Error {
					// if cr status is error, no need to get configs
					return true, errors.New("CR status is set to error")
				}
				cmName := compName + "-connection-profile"
				cm, err := o.Kube.GetConfigMap(o.Config.Namespace, cmName)
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

	if err != nil {
		o.Logger.Warnf("cr status not set after timeout or got an error: %s", err)
		statusCode = 500
		if originalCR.Status.Status == current.True && originalCR.Status.Type == current.Error {
			// dont error out
		} else {
			return nil, statusCode, err
		}
	}

	// build the response
	response, statusCodeNew, err := o.GetCRResponse(ALL, compName, o.Config.Namespace, sID)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "Failed to build response object '%s'", compName))
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

func (o *Orderer) DeleteCR(sID, compName, namespace string, body []byte) (*api.DeleteResponse, int, error) {
	var err error
	statusCode := 0
	o.Logger.Debugf("Received request delete orderer cr '%s' in namespace '%s'", compName, namespace)

	request := &api.DeleteRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			o.Logger.Error(errors.Wrapf(err, "failed to unmarshal configuration, configuration is not a valid yaml file"))
			return nil, statusCode, errors.Wrapf(err, "failed to unmarshal configuration, configuration is not a valid yaml file")
		}
	}

	err = o.IBPOperatorClient.DeleteCR(namespace, "ibporderers", compName)
	if err != nil {
		o.Logger.Error(errors.Wrapf(err, "Failed to delete cr for '%s' with namespace '%s'", compName, namespace))
		return nil, statusCode, err
	}

	return &api.DeleteResponse{
		Message: "ok",
	}, statusCode, nil
}

func (o *Orderer) GetConnectionProfile(compName, namespace string) (*common.ConnectionProfile, error) {
	o.Logger.Debugf("Received request to get connection profile for '%s' in namespace '%s'", compName, namespace)
	cmName := compName + "-connection-profile"
	cm, err := o.Kube.GetConfigMap(namespace, cmName)
	if err != nil {
		return nil, err
	}
	binaryData := cm.BinaryData
	if binaryData["profile.json"] == nil {
		return nil, errors.New("profile.json not found in configmap")
	}
	data := binaryData["profile.json"]
	connectionProfile := &common.ConnectionProfile{}
	err = json.Unmarshal(data, connectionProfile)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal connection profile")
	}
	return connectionProfile, nil
}

func (o *Orderer) GetConfig(compName, namespace string, fabricVersion string) (interface{}, error) {
	o.Logger.Debugf("Received request to get config for '%s' in namespace '%s", compName, namespace)

	cmName := compName + "-config"
	cm, err := o.Kube.GetConfigMap(namespace, cmName)
	if err != nil {
		return nil, errors.Wrapf(err, "Failed to get config map for '%s' in namespace '%s'", cmName, namespace)
	}
	binaryData := cm.BinaryData
	if binaryData["orderer.yaml"] == nil {
		return nil, errors.New("orderer.yaml not found in configmap")
	}
	data := binaryData["orderer.yaml"]

	if util.GetMajorRelease(fabricVersion) == 1 {
		ordererYaml := &config.Orderer{}
		err = yaml.Unmarshal(data, ordererYaml)
		if err != nil {
			return nil, errors.Wrapf(err, "Could not unmarshal configmap")
		}
		return ordererYaml, nil
	} else {
		ordererYaml := &v2config.Orderer{}
		err = yaml.Unmarshal(data, ordererYaml)
		if err != nil {
			return nil, errors.Wrapf(err, "Could not unmarshal configmap")
		}
		return ordererYaml, nil
	}
}

func (o *Orderer) GetStorage(defaults *dconfig.DeployerDefaults, override *current.OrdererStorages) *current.OrdererStorages {
	o.Logger.Debug("Received request to get storage")

	storage := defaults.Storage.Orderer

	if override != nil {
		if override.Orderer != nil && override.Orderer.Size != "" {
			storage.Orderer.Size = override.Orderer.Size
		}
		if override.Orderer != nil && override.Orderer.Class != "" {
			storage.Orderer.Class = override.Orderer.Class
		}
	}

	return storage
}

func (o *Orderer) GetResources(defaults *dconfig.DeployerDefaults, override *current.OrdererResources) *current.OrdererResources {
	o.Logger.Debug("Received request to get resources")
	resources := defaults.Resources.Orderer

	if override != nil {
		if override.Orderer != nil {
			if override.Orderer.Requests == nil {
				override.Orderer.Requests = override.Orderer.Limits
			}
			if override.Orderer.Limits == nil {
				override.Orderer.Limits = override.Orderer.Requests
			}

			if override.Orderer.Requests != nil {
				resources.Orderer.Requests = override.Orderer.Requests
			}
			if override.Orderer.Limits != nil {
				resources.Orderer.Limits = override.Orderer.Limits
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
		if override.GRPCProxy != nil {
			if override.GRPCProxy.Requests == nil {
				override.GRPCProxy.Requests = override.GRPCProxy.Limits
			}
			if override.GRPCProxy.Limits == nil {
				override.GRPCProxy.Limits = override.GRPCProxy.Requests
			}

			if override.GRPCProxy.Requests != nil {
				resources.GRPCProxy.Requests = override.GRPCProxy.Requests
			}
			if override.GRPCProxy.Limits != nil {
				resources.GRPCProxy.Limits = override.GRPCProxy.Limits
			}
		}
		if override.Enroller != nil {
			if override.Enroller.Requests == nil {
				override.Enroller.Requests = override.Enroller.Limits
			}
			if override.Enroller.Limits == nil {
				override.Enroller.Limits = override.Enroller.Requests
			}

			if override.Enroller.Requests != nil {
				resources.Enroller.Requests = override.Enroller.Requests
			}
			if override.Enroller.Limits != nil {
				resources.Enroller.Limits = override.Enroller.Limits
			}
		}
		if override.HSMDaemon != nil {
			if override.HSMDaemon.Requests == nil {
				override.HSMDaemon.Requests = override.HSMDaemon.Limits
			}
			if override.HSMDaemon.Limits == nil {
				override.HSMDaemon.Limits = override.HSMDaemon.Requests
			}

			if override.HSMDaemon.Requests != nil {
				resources.HSMDaemon.Requests = override.HSMDaemon.Requests
			}
			if override.HSMDaemon.Limits != nil {
				resources.HSMDaemon.Limits = override.HSMDaemon.Limits
			}
		}
	}

	return resources
}

func (o *Orderer) GetUpdateResources(current, override *current.OrdererResources) (*current.OrdererResources, error) {
	o.Logger.Debug("Received request to get update resources")

	resources := current

	if override != nil {
		if override.Orderer != nil {
			if override.Orderer.Requests == nil {
				override.Orderer.Requests = override.Orderer.Limits
			}
			if override.Orderer.Limits == nil {
				override.Orderer.Limits = override.Orderer.Requests
			}

			if override.Orderer.Requests != nil {
				resources.Orderer.Requests = override.Orderer.Requests
			}
			if override.Orderer.Limits != nil {
				resources.Orderer.Limits = override.Orderer.Limits
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
		if override.GRPCProxy != nil {
			if override.GRPCProxy.Requests == nil {
				override.GRPCProxy.Requests = override.GRPCProxy.Limits
			}
			if override.GRPCProxy.Limits == nil {
				override.GRPCProxy.Limits = override.GRPCProxy.Requests
			}

			if override.GRPCProxy.Requests != nil {
				resources.GRPCProxy.Requests = override.GRPCProxy.Requests
			}
			if override.GRPCProxy.Limits != nil {
				resources.GRPCProxy.Limits = override.GRPCProxy.Limits
			}
		}
		if override.Enroller != nil {
			if override.Enroller.Requests == nil {
				override.Enroller.Requests = override.Enroller.Limits
			}
			if override.Enroller.Limits == nil {
				override.Enroller.Limits = override.Enroller.Requests
			}

			if override.Enroller.Requests != nil {
				resources.Enroller.Requests = override.Enroller.Requests
			}
			if override.Enroller.Limits != nil {
				resources.Enroller.Limits = override.Enroller.Limits
			}
		}

		if override.HSMDaemon != nil {
			if override.HSMDaemon.Requests == nil {
				override.HSMDaemon.Requests = override.HSMDaemon.Limits
			}
			if override.HSMDaemon.Limits == nil {
				override.HSMDaemon.Limits = override.HSMDaemon.Requests
			}

			if override.HSMDaemon.Requests != nil {
				resources.HSMDaemon.Requests = override.HSMDaemon.Requests
			}
			if override.HSMDaemon.Limits != nil {
				resources.HSMDaemon.Limits = override.HSMDaemon.Limits
			}
		}
	}

	return resources, nil
}

func (o *Orderer) GetIndividualResources(allResources *current.OrdererResources) *current.OrdererResources {
	resources := &current.OrdererResources{}
	if allResources.Orderer != nil {
		resources.Orderer = allResources.Orderer
	}
	if allResources.GRPCProxy != nil {
		resources.GRPCProxy = allResources.GRPCProxy
	}
	if allResources.Init != nil {
		resources.Init = allResources.Init
	}
	if allResources.Enroller != nil {
		resources.Enroller = allResources.Enroller
	}
	if allResources.HSMDaemon != nil {
		resources.HSMDaemon = allResources.HSMDaemon
	}
	return resources
}
