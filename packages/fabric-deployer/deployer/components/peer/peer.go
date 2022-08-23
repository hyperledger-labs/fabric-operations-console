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

package peer

import (
	"encoding/json"
	"strings"
	"time"

	config "github.com/IBM-Blockchain/fabric-operator/api/peer/v1"
	v2config "github.com/IBM-Blockchain/fabric-operator/api/peer/v2"
	"github.com/pkg/errors"

	dconfig "github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer/api"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
	"sigs.k8s.io/yaml"

	"go.uber.org/zap"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/wait"
)

const (
	PortNameOperations      = "operations"
	PortNamePeerGrpc        = "peer-api"
	PortNameGrpcWeb         = "grpcweb"
	EndpointHttpURLTemplate = "https://%s:%s"
	EndpointGrpcURLTemplate = "grpcs://%s:%s"
)

// Supported actions for Peer
const (
	ACTIONS    = "actions"
	RESOURCES  = "resources"
	CONFIG     = "config"
	CRYPTO     = "crypto"
	ADMINCERTS = "admincerts"
	NODEOU     = "nodeou"
	VERSION    = "version"
	STORAGE    = "storage"
	STATUS     = "status"
	ENDPOINTS  = "endpoints"
	REPLICAS   = "replicas"
	HSM        = "hsm"
	ALL        = "all"
)

//go:generate counterfeiter -o mocks/kube.go -fake-name Kube . Kube

type Kube interface {
	GetService(namespace, name string) (*corev1.Service, error)
	GetConfigMap(namespace, name string) (*corev1.ConfigMap, error)
	DeleteAndCreateSecret(namespace string, secret *corev1.Secret) (*corev1.Secret, error)
	DeleteSecret(namespace string, name string) error
	GetPort(namespace, name string) (int32, error)
	GetPorts(namespace, name string) ([]corev1.ServicePort, error)
	CreateSecret(namespace string, secret *corev1.Secret) (*corev1.Secret, error)
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

type Peer struct {
	Kube              Kube
	Logger            *zap.SugaredLogger
	IBPOperatorClient IBPOperatorClient
	Config            *dconfig.DeployerSettingsConfig
}

func New(logger *zap.Logger, k8sClient Kube, ibpClient IBPOperatorClient, config *dconfig.DeployerSettingsConfig) *Peer {
	return &Peer{
		Kube:              k8sClient,
		Logger:            logger.Sugar().Named("Peer"),
		IBPOperatorClient: ibpClient,
		Config:            config,
	}
}

func (peer *Peer) Images(version string) *current.PeerImages {
	peerVersionedImages := peer.Config.Versions.Peer[version].Image
	isVersion14X := false
	if strings.HasPrefix(version, "1.4") {
		isVersion14X = true
	}
	images := &current.PeerImages{}

	images.PeerImage = peerVersionedImages.PeerImage
	images.PeerInitImage = peerVersionedImages.PeerInitImage
	images.GRPCWebImage = peerVersionedImages.GRPCWebImage
	images.CouchDBImage = peerVersionedImages.CouchDBImage
	images.EnrollerImage = peerVersionedImages.EnrollerImage

	if peerVersionedImages.HSMImage != "" {
		images.HSMImage = peerVersionedImages.HSMImage
	}

	if isVersion14X {
		images.DindImage = peerVersionedImages.DindImage
		images.FluentdImage = peerVersionedImages.FluentdImage
	} else {
		images.CCLauncherImage = peerVersionedImages.CCLauncherImage
		images.FileTransferImage = peerVersionedImages.FileTransferImage
		images.BuilderImage = peerVersionedImages.BuilderImage
		images.GoEnvImage = peerVersionedImages.GoEnvImage
		images.JavaEnvImage = peerVersionedImages.JavaEnvImage
		images.NodeEnvImage = peerVersionedImages.NodeEnvImage
	}

	if peer.Config.UseTags != nil && *peer.Config.UseTags {
		// Set the tags
		images.PeerInitTag = peerVersionedImages.PeerInitTag
		images.PeerTag = peerVersionedImages.PeerTag
		images.GRPCWebTag = peerVersionedImages.GRPCWebTag
		images.CouchDBTag = peerVersionedImages.CouchDBTag
		images.EnrollerTag = peerVersionedImages.EnrollerTag

		if peerVersionedImages.HSMImage != "" {
			images.HSMTag = peerVersionedImages.HSMTag
		}
		if isVersion14X {
			images.DindTag = peerVersionedImages.DindTag
			images.FluentdTag = peerVersionedImages.FluentdTag
		} else {
			images.CCLauncherTag = peerVersionedImages.CCLauncherTag
			images.FileTransferTag = peerVersionedImages.FileTransferTag
			images.BuilderTag = peerVersionedImages.BuilderTag
			images.GoEnvTag = peerVersionedImages.GoEnvTag
			images.JavaEnvTag = peerVersionedImages.JavaEnvTag
			images.NodeEnvTag = peerVersionedImages.NodeEnvTag
		}
	} else {
		// set the digests to the tags
		images.PeerInitTag = peerVersionedImages.PeerInitDigest
		images.PeerTag = peerVersionedImages.PeerDigest
		images.GRPCWebTag = peerVersionedImages.GRPCWebDigest
		images.CouchDBTag = peerVersionedImages.CouchDBDigest
		images.EnrollerTag = peerVersionedImages.EnrollerDigest

		if peerVersionedImages.HSMImage != "" {
			images.HSMTag = peerVersionedImages.HSMDigest
		}

		if isVersion14X {
			images.DindTag = peerVersionedImages.DindDigest
			images.FluentdTag = peerVersionedImages.FluentdDigest
		} else {
			images.CCLauncherTag = peerVersionedImages.CCLauncherDigest
			images.FileTransferTag = peerVersionedImages.FileTransferDigest
			images.BuilderTag = peerVersionedImages.BuilderDigest
			images.GoEnvTag = peerVersionedImages.GoEnvDigest
			images.JavaEnvTag = peerVersionedImages.JavaEnvDigest
			images.NodeEnvTag = peerVersionedImages.NodeEnvDigest
		}
	}
	return images
}

func (peer *Peer) CreateCR(domain, sID, compName, namespace string, body []byte) (*api.Response, int, error) {
	var err error
	statusCode := 0

	// if comp name is not passed assign random name
	if compName == "" {
		peer.Logger.Error("Component name not valid, cannot be empty")
		return nil, statusCode, errors.New("component name not valid, cannot be empty")
	}

	peer.Logger.Debugf("Received request to create peer cr '%s' in namespace '%s'", compName, namespace)

	request := &api.CreateRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			peer.Logger.Error(errors.Wrapf(err, "failed to unmarshal body, Request body is Invalid !!"))
			return nil, statusCode, errors.Wrapf(err, "failed to unmarshal body, Request body is Invalid !!")
		}
	}

	if request.StateDB == "" {
		request.StateDB = "couchdb"
	}

	// version is the full hyphenated format of fabric version
	version := request.Version
	if version == "" {
		version = util.GetDefaultVersion("peer", peer.Config.Versions)
	} else if !util.IsValidVersion("peer", request.Version, peer.Config.Versions) {
		peer.Logger.Error("Version not valid")
		return nil, statusCode, errors.Errorf("version not valid")
	}

	// merge storage and resources
	storage := peer.GetStorage(peer.Config.Defaults, request.Storage)
	resources := peer.GetResources(*peer.Config.Defaults.Resources.Peer, request.Resources, request.StateDB, version)
	zone, region := util.GetZoneAndRegion(request.Zone, request.Region)

	// pass the msp info to cr spec
	peerMSP := &current.SecretSpec{}
	if request.Config != nil {
		if request.Config.Enrollment != nil {
			peerMSP.Enrollment = request.Config.Enrollment
		} else if request.Config.MSP != nil {
			peerMSP.MSP = request.Config.MSP
		}
	}

	cr := &current.IBPPeer{
		Spec: current.IBPPeerSpec{
			License: current.License{
				Accept: true,
			},
			Arch:             request.Arch,
			Resources:        resources,
			Storage:          storage,
			MSPID:            request.Orgname,
			StateDb:          request.StateDB,
			MSPSecret:        compName + "-secret",
			Secret:           peerMSP,
			ConfigOverride:   request.ConfigOverride,
			HSM:              request.HSM,
			Images:           peer.Images(version),
			ImagePullSecrets: peer.Config.ImagePullSecrets,
			Service: &current.Service{
				Type: peer.Config.ServiceConfig.Type,
			},
			Domain:        peer.Config.Domain,
			Zone:          zone,
			Region:        region,
			FabricVersion: version,
		},
	}
	cr.Name = compName

	err = peer.IBPOperatorClient.CreateCR(namespace, "ibppeers", cr)
	if err != nil {
		peer.Logger.Error(errors.Wrapf(err, "Error in creating cr: %s, namespace: %s", cr.Name, namespace))
		return nil, statusCode, err
	}

	peer.Logger.Debugf("Created cr '%s'", cr.Name)

	// get cr status
	// if status is deployed -> get connection profile
	// if status is error -> we are done
	originalCR := &current.IBPPeer{}
	peer.Logger.Debugf("Polling for cr spec status '%s'", compName)
	err = wait.Poll(500*time.Millisecond, time.Duration(peer.Config.Timeouts.Deployment)*time.Millisecond, func() (bool, error) {
		err = peer.IBPOperatorClient.GetCR(namespace, "ibppeers", compName, originalCR)
		if err == nil {
			// check the status field
			if originalCR.Status.Status == current.True {
				// go out if error
				if originalCR.Status.Type == current.Error {
					// if cr status is error, no need to get configs
					return true, errors.New("CR status is set to error")
				}
				cmName := compName + "-connection-profile"
				cm, err := peer.Kube.GetConfigMap(namespace, cmName)
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

	// cr status did not change to deployer/error before timeout
	if err != nil {
		peer.Logger.Warnf("Status not set after timeout or got an error: %s", err)
		// return error immediately, something went wrong
		statusCode = 500
		if originalCR.Status.Status == current.True && originalCR.Status.Type == current.Error {
			// dont error out
		} else {
			return nil, statusCode, err
		}
	}

	// build the response
	response, statusCodeNew, err := peer.GetCRResponse(ALL, compName, namespace, sID)
	if err != nil {
		peer.Logger.Error(errors.Wrapf(err, "Failed to build response object '%s'", compName))
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

func (peer *Peer) DeleteCR(sID, compName, namespace string, body []byte) (*api.DeleteResponse, int, error) {
	var err error
	statusCode := 0
	if compName == "" {
		peer.Logger.Error("Name of the compenent to be deleted is required")
		return nil, statusCode, errors.New("Name of the component to be delete is required")
	}

	peer.Logger.Debugf("Received request delete peer cr '%s' in namespace '%s'", compName, namespace)

	request := &api.DeleteRequest{}
	if len(body) != 0 {
		err = json.Unmarshal(body, request)
		if err != nil {
			peer.Logger.Error(errors.Wrap(err, "failed to unmarshal configuration, configuration is not a valid yaml file"))
			return nil, statusCode, errors.Wrapf(err, "failed to unmarshal configuration, configuration is not a valid yaml file")
		}
	}

	err = peer.IBPOperatorClient.DeleteCR(namespace, "ibppeers", compName)
	if err != nil {
		peer.Logger.Error(errors.Wrapf(err, "unable to delete cr for '%s' in namespace '%s'", compName, namespace))
		return nil, statusCode, err
	}

	return &api.DeleteResponse{
		Message: "ok",
	}, statusCode, nil
}

func (peer *Peer) GetConnectionProfile(compName, namespace string) (*common.ConnectionProfile, error) {
	peer.Logger.Debugf("Received request to get connection profile for '%s' in namespace '%s'", compName, namespace)

	cmName := compName + "-connection-profile"
	cm, err := peer.Kube.GetConfigMap(namespace, cmName)
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

func (peer *Peer) GetConfig(compName, namespace string, fabricVersion string) (interface{}, error) {
	peer.Logger.Debugf("Received request to get config for '%s' in namespace '%s'", compName, namespace)

	cmName := compName + "-config"
	cm, err := peer.Kube.GetConfigMap(namespace, cmName)
	if err != nil {
		return nil, err
	}
	binaryData := cm.BinaryData
	if binaryData["core.yaml"] == nil {
		return nil, errors.New("core.yaml not found in configmap")
	}
	data := binaryData["core.yaml"]

	if util.GetMajorRelease(fabricVersion) == 1 {
		coreYaml := &config.Core{}
		err = yaml.Unmarshal(data, coreYaml)
		if err != nil {
			peer.Logger.Error(errors.Wrapf(err, "Failed to unmarshal configmap"))
			return nil, err
		}
		return coreYaml, nil
	} else {
		coreYaml := &v2config.Core{}
		err = yaml.Unmarshal(data, coreYaml)
		if err != nil {
			peer.Logger.Error(errors.Wrapf(err, "Failed to unmarshal configmap"))
			return nil, err
		}
		return coreYaml, nil
	}
}

func (peer *Peer) GetStorage(defaults *dconfig.DeployerDefaults, override *current.PeerStorages) *current.PeerStorages {
	peer.Logger.Debug("Received request to get storage")

	storage := defaults.Storage.Peer

	if override != nil {
		if override.StateDB != nil && override.StateDB.Size != "" {
			storage.StateDB.Size = override.StateDB.Size
		}
		if override.StateDB != nil && override.StateDB.Class != "" {
			storage.StateDB.Class = override.StateDB.Class
		}

		if override.Peer != nil && override.Peer.Size != "" {
			storage.Peer.Size = override.Peer.Size
		}
		if override.Peer != nil && override.Peer.Class != "" {
			storage.Peer.Class = override.Peer.Class
		}
	}

	return storage
}

func (peer *Peer) GetResources(defaults current.PeerResources, override *current.PeerResources, statedb, fabricVersion string) *current.PeerResources {
	peer.Logger.Debug("Received request to get resources")

	resources := defaults

	if override != nil {
		if override.Peer != nil {
			overrideResources(resources.Peer, initResources(override.Peer))
		}

		if override.DinD != nil {
			overrideResources(resources.DinD, initResources(override.DinD))
		}

		if strings.ToLower(statedb) == "couchdb" {
			if override.CouchDB != nil {
				overrideResources(resources.CouchDB, initResources(override.CouchDB))
			}
		} else {
			resources.CouchDB = nil
		}

		if override.GRPCProxy != nil {
			overrideResources(resources.GRPCProxy, initResources(override.GRPCProxy))
		}

		if override.FluentD != nil {
			overrideResources(resources.FluentD, initResources(override.FluentD))
		}

		if override.Init != nil {
			overrideResources(resources.Init, initResources(override.Init))
		}

		// Fabric version 2.x does not require FluentD and DinD
		if util.GetMajorRelease(fabricVersion) == 2 {
			resources.FluentD = nil
			resources.DinD = nil

			if override.CCLauncher != nil {
				overrideResources(resources.CCLauncher, initResources(override.CCLauncher))
			}
		} else {
			resources.CCLauncher = nil
		}

		if override.Enroller != nil {
			overrideResources(resources.Enroller, initResources(override.Enroller))
		}

		if override.HSMDaemon != nil {
			overrideResources(resources.HSMDaemon, initResources(override.HSMDaemon))
		}
	}

	return &resources
}

func (peer *Peer) GetUpdateResources(current, override *current.PeerResources) (*current.PeerResources, error) {
	peer.Logger.Debug("Received update to get update resources")

	resources := current

	if override != nil {
		if override.Peer != nil {
			if override.Peer.Requests == nil {
				override.Peer.Requests = override.Peer.Limits
			}
			if override.Peer.Limits == nil {
				override.Peer.Limits = override.Peer.Requests
			}

			if override.Peer.Requests != nil {
				resources.Peer.Requests = override.Peer.Requests
			}
			if override.Peer.Limits != nil {
				resources.Peer.Limits = override.Peer.Limits
			}
		}

		if override.DinD != nil {
			if override.DinD.Requests == nil {
				override.DinD.Requests = override.DinD.Limits
			}
			if override.DinD.Limits == nil {
				override.DinD.Limits = override.DinD.Requests
			}

			if override.DinD.Requests != nil {
				resources.DinD.Requests = override.DinD.Requests
			}
			if override.DinD.Limits != nil {
				resources.DinD.Limits = override.DinD.Limits
			}
		}

		if override.CouchDB != nil {
			if override.CouchDB.Requests == nil {
				override.CouchDB.Requests = override.CouchDB.Limits
			}
			if override.CouchDB.Limits == nil {
				override.CouchDB.Limits = override.CouchDB.Requests
			}

			if override.CouchDB.Requests != nil {
				resources.CouchDB.Requests = override.CouchDB.Requests
			}
			if override.CouchDB.Limits != nil {
				resources.CouchDB.Limits = override.CouchDB.Limits
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

		if override.FluentD != nil {
			if override.FluentD.Requests == nil {
				override.FluentD.Requests = override.FluentD.Limits
			}
			if override.FluentD.Limits == nil {
				override.FluentD.Limits = override.FluentD.Requests
			}

			if override.FluentD.Requests != nil {
				resources.FluentD.Requests = override.FluentD.Requests
			}
			if override.FluentD.Limits != nil {
				resources.FluentD.Limits = override.FluentD.Limits
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

		if override.CCLauncher != nil {
			if override.CCLauncher.Requests == nil {
				override.CCLauncher.Requests = override.CCLauncher.Limits
			}
			if override.CCLauncher.Limits == nil {
				override.CCLauncher.Limits = override.CCLauncher.Requests
			}

			if override.CCLauncher.Requests != nil {
				resources.CCLauncher.Requests = override.CCLauncher.Requests
			}
			if override.CCLauncher.Limits != nil {
				resources.CCLauncher.Limits = override.CCLauncher.Limits
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

func (peer *Peer) GetIndividualResources(individualResources string, allResources *current.PeerResources, fabricVersion, statedb string) *current.PeerResources {
	peer.Logger.Debugf("Received request to get individual resources for '%s'", individualResources)
	resources := &current.PeerResources{}

	if allResources.Peer != nil {
		resources.Peer = allResources.Peer
	}
	if strings.ToLower(statedb) == "couchdb" {
		if allResources.CouchDB != nil {
			resources.CouchDB = allResources.CouchDB
		}
	}
	if allResources.GRPCProxy != nil {
		resources.GRPCProxy = allResources.GRPCProxy
	}
	if allResources.Init != nil {
		resources.Init = allResources.Init
	}
	if allResources.DinD != nil {
		resources.DinD = allResources.DinD
	}
	if allResources.FluentD != nil {
		resources.FluentD = allResources.FluentD
	}
	if util.GetMajorRelease(fabricVersion) == 2 {
		if allResources.CCLauncher != nil {
			resources.CCLauncher = allResources.CCLauncher
		}
		resources.DinD = nil
		resources.FluentD = nil
	}
	if allResources.Enroller != nil {
		resources.Enroller = allResources.Enroller
	}
	if allResources.HSMDaemon != nil {
		resources.HSMDaemon = allResources.HSMDaemon
	}

	return resources
}

func initResources(resource *corev1.ResourceRequirements) *corev1.ResourceRequirements {
	if resource.Requests == nil {
		resource.Requests = resource.Limits
	}
	if resource.Limits == nil {
		resource.Limits = resource.Requests
	}
	return resource
}

func overrideResources(resource, overrideWith *corev1.ResourceRequirements) {
	if overrideWith.Requests != nil {
		resource.Requests = overrideWith.Requests
	}
	if overrideWith.Limits != nil {
		resource.Limits = overrideWith.Limits
	}
}
