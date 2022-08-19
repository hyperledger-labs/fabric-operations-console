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

package config

import (
	"fmt"

	"github.com/IBM-Blockchain/fabric-deployer/offering"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"

	"go.uber.org/zap"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/rest"
)

const (
	DefaultDeploymentTimeout   = 90 * 1000
	DefaultAPIServerTimeout    = 120 * 1000
	DefaultOrdererFailureCount = 10
)

// Options holds the options specified by the broker's code on the command
// line.
type Options struct {
	ConfigPath      string
	DBConnectionURL string
	Username        string
	Password        string
	KubeConfig      string
}

type LocalConfig struct {
	Logger     *zap.Logger `json:"-"`
	KubeConfig *rest.Config
}

type DeployerSettingsConfig struct {
	ClusterType      offering.Type     `json:"clusterType"`
	Domain           string            `json:"domain"`
	DashboardURL     string            `json:"dashboardurl"`
	Database         Database          `json:"db"`
	Loglevel         string            `json:"loglevel"`
	Port             int               `json:"port"`
	TLS              TLSConfig         `json:"tls"`
	Auth             BasicAuth         `json:"auth"`
	Namespace        string            `json:"namespace"`
	Defaults         *DeployerDefaults `json:"defaults"`
	Versions         *Versions         `json:"versions"`
	ImagePullSecrets []string          `json:"imagePullSecrets"`
	ServiceConfig    ServiceConfig     `json:"serviceConfig"`
	CRN              *CRN              `json:"crn"`
	Timeouts         *Timeouts         `json:"timeouts"`
	OtherImages      *OtherImages      `json:"otherImages"`
	ServiceAccount   string            `json:"serviceAccount"`
	UseTags          *bool             `json:"usetags"`
}
type Versions struct {
	CA      map[string]VersionCA      `json:"ca"`
	Peer    map[string]VersionPeer    `json:"peer"`
	Orderer map[string]VersionOrderer `json:"orderer"`
}

type VersionCA struct {
	Default bool     `json:"default"`
	Version string   `json:"version"`
	Image   CAImages `json:"image,omitempty"`
}

type VersionOrderer struct {
	Default bool          `json:"default"`
	Version string        `json:"version"`
	Image   OrdererImages `json:"image,omitempty"`
}
type VersionPeer struct {
	Default bool       `json:"default"`
	Version string     `json:"version"`
	Image   PeerImages `json:"image,omitempty"`
}

// CAImages is the list of images to be used in CA deployment
type CAImages struct {
	// CAImage is the name of the CA image
	CAImage string `json:"caImage,omitempty"`

	// CATag is the tag of the CA image
	CATag string `json:"caTag,omitempty"`

	// CADigest is the digest tag of the CA image
	CADigest string `json:"caDigest,omitempty"`

	// CAInitImage is the name of the Init image
	CAInitImage string `json:"caInitImage,omitempty"`

	// CAInitTag is the tag of the Init image
	CAInitTag string `json:"caInitTag,omitempty"`

	// CAInitDigest is the digest tag of the Init image
	CAInitDigest string `json:"caInitDigest,omitempty"`

	// HSMImage is the name of the HSM image
	HSMImage string `json:"hsmImage,omitempty"`

	// HSMTag is the tag of the HSM image
	HSMTag string `json:"hsmTag,omitempty"`

	// HSMDigest is the tag of the HSM image
	HSMDigest string `json:"hsmDigest,omitempty"`

	// EnrollerImage is the name of the init image for crypto generation
	EnrollerImage string `json:"enrollerImage,omitempty"`

	// EnrollerTag is the tag of the init image for crypto generation
	EnrollerTag string `json:"enrollerTag,omitempty"`

	// EnrollerDigest is the digest tag of the init image for crypto generation
	EnrollerDigest string `json:"enrollerDigest,omitempty"`
}

// PeerImages is the list of images to be used in peer deployment
type PeerImages struct {
	// PeerInitImage is the name of the peer init image
	PeerInitImage string `json:"peerInitImage,omitempty"`

	// PeerInitTag is the tag of the peer init image
	PeerInitTag string `json:"peerInitTag,omitempty"`

	// PeerInitDigest is the digest tag of the peer init image
	PeerInitDigest string `json:"peerInitDigest,omitempty"`

	// PeerImage is the name of the peer image
	PeerImage string `json:"peerImage,omitempty"`

	// PeerTag is the tag of the peer image
	PeerTag string `json:"peerTag,omitempty"`

	// PeerDigest is the digest tag of the peer image
	PeerDigest string `json:"peerDigest,omitempty"`

	// DindImage is the name of the dind image
	DindImage string `json:"dindImage,omitempty"`

	// DindTag is the tag of the dind image
	DindTag string `json:"dindTag,omitempty"`

	// DindDigest is the digest tag of the dind image
	DindDigest string `json:"dindDigest,omitempty"`

	// GRPCWebImage is the name of the grpc web proxy image
	GRPCWebImage string `json:"grpcwebImage,omitempty"`

	// GRPCWebTag is the tag of the grpc web proxy image
	GRPCWebTag string `json:"grpcwebTag,omitempty"`

	// GRPCWebDigest is the digest tag of the grpc web proxy image
	GRPCWebDigest string `json:"grpcwebDigest,omitempty"`

	// FluentdImage is the name of the fluentd logger image
	FluentdImage string `json:"fluentdImage,omitempty"`

	// FluentdTag is the tag of the fluentd logger image
	FluentdTag string `json:"fluentdTag,omitempty"`

	// FluentdDigest is the digest tag of the fluentd logger image
	FluentdDigest string `json:"fluentdDigest,omitempty"`

	// CouchDBImage is the name of the couchdb image
	CouchDBImage string `json:"couchdbImage,omitempty"`

	// CouchDBTag is the tag of the couchdb image
	CouchDBTag string `json:"couchdbTag,omitempty"`

	// CouchDBDigest is the digest tag of the couchdb image
	CouchDBDigest string `json:"couchdbDigest,omitempty"`

	// CCLauncherImage is the name of the chaincode launcher image
	CCLauncherImage string `json:"chaincodeLauncherImage,omitempty"`

	// CCLauncherTag is the tag of the chaincode launcher image
	CCLauncherTag string `json:"chaincodeLauncherTag,omitempty"`

	// CCLauncherDigest is the digest tag of the chaincode launcher image
	CCLauncherDigest string `json:"chaincodeLauncherDigest,omitempty"`

	// FileTransferImage is the name of the file transfer image
	FileTransferImage string `json:"fileTransferImage,omitempty"`

	// FileTransferTag is the tag of the file transfer image
	FileTransferTag string `json:"fileTransferTag,omitempty"`

	// FileTransferDigest is the digest tag of the file transfer image
	FileTransferDigest string `json:"fileTransferDigest,omitempty"`

	// BuilderImage is the name of the builder image
	BuilderImage string `json:"builderImage,omitempty"`

	// BuilderTag is the tag of the builder image
	BuilderTag string `json:"builderTag,omitempty"`

	// BuilderDigest is the digest tag of the builder image
	BuilderDigest string `json:"builderDigest,omitempty"`

	// GoEnvImage is the name of the goenv image
	GoEnvImage string `json:"goEnvImage,omitempty"`

	// GoEnvTag is the tag of the goenv image
	GoEnvTag string `json:"goEnvTag,omitempty"`

	// GoEnvDigest is the digest tag of the goenv image
	GoEnvDigest string `json:"goEnvDigest,omitempty"`

	// JavaEnvImage is the name of the javaenv image
	JavaEnvImage string `json:"javaEnvImage,omitempty"`

	// JavaEnvTag is the tag of the javaenv image
	JavaEnvTag string `json:"javaEnvTag,omitempty"`

	// JavaEnvDigest is the digest tag of the javaenv image
	JavaEnvDigest string `json:"javaEnvDigest,omitempty"`

	// NodeEnvImage is the name of the nodeenv image
	NodeEnvImage string `json:"nodeEnvImage,omitempty"`

	// NodeEnvTag is the tag of the nodeenv image
	NodeEnvTag string `json:"nodeEnvTag,omitempty"`

	// NodeEnvDigest is the digest tag of the nodeenv image
	NodeEnvDigest string `json:"nodeEnvDigest,omitempty"`

	// HSMImage is the name of the hsm image
	HSMImage string `json:"hsmImage,omitempty"`

	// HSMTag is the tag of the hsm image
	HSMTag string `json:"hsmTag,omitempty"`

	// HSMDigest is the digest tag of the hsm image
	HSMDigest string `json:"hsmDigest,omitempty"`

	// EnrollerImage is the name of the init image for crypto generation
	EnrollerImage string `json:"enrollerImage,omitempty"`

	// EnrollerTag is the tag of the init image for crypto generation
	EnrollerTag string `json:"enrollerTag,omitempty"`

	// EnrollerDigest is the digest tag of the init image for crypto generation
	EnrollerDigest string `json:"enrollerDigest,omitempty"`
}

// OrdererImages is the list of images to be used in orderer deployment
type OrdererImages struct {
	// OrdererInitImage is the name of the orderer init image
	OrdererInitImage string `json:"ordererInitImage,omitempty"`

	// OrdererInitTag is the tag of the orderer init image
	OrdererInitTag string `json:"ordererInitTag,omitempty"`

	// OrdererInitDigest is the digest tag of the orderer init image
	OrdererInitDigest string `json:"ordererInitDigest,omitempty"`

	// OrdererImage is the name of the orderer image
	OrdererImage string `json:"ordererImage,omitempty"`

	// OrdererTag is the tag of the orderer image
	OrdererTag string `json:"ordererTag,omitempty"`

	// OrdererDigest is the digest tag of the orderer image
	OrdererDigest string `json:"ordererDigest,omitempty"`

	// GRPCWebImage is the name of the grpc web proxy image
	GRPCWebImage string `json:"grpcwebImage,omitempty"`

	// GRPCWebTag is the tag of the grpc web proxy image
	GRPCWebTag string `json:"grpcwebTag,omitempty"`

	// GRPCWebDigest is the digest tag of the grpc web proxy image
	GRPCWebDigest string `json:"grpcwebDigest,omitempty"`

	// HSMImage is the name of the hsm image
	HSMImage string `json:"hsmImage,omitempty"`

	// HSMTag is the tag of the hsm image
	HSMTag string `json:"hsmTag,omitempty"`

	// HSMDigest is the digest tag of the hsm image
	HSMDigest string `json:"hsmDigest,omitempty"`

	// EnrollerImage is the name of the init image for crypto generation
	EnrollerImage string `json:"enrollerImage,omitempty"`

	// EnrollerTag is the tag of the init image for crypto generation
	EnrollerTag string `json:"enrollerTag,omitempty"`

	// EnrollerDigest is the digest tag of the init image for crypto generation
	EnrollerDigest string `json:"enrollerDigest,omitempty"`
}

type OtherImages struct {
}

type DeployerDefaults struct {
	Storage   *Storage   `json:"storage"`
	Resources *Resources `json:"resources"`
}

type Storage struct {
	Peer    *current.PeerStorages    `json:"peer"`
	CA      *current.CAStorages      `json:"ca"`
	Orderer *current.OrdererStorages `json:"orderer"`
}

type Resources struct {
	Peer    *current.PeerResources    `json:"peer"`
	CA      *current.CAResources      `json:"ca"`
	Orderer *current.OrdererResources `json:"orderer"`
}

type ServiceConfig struct {
	Type corev1.ServiceType `json:"type"`
}

// IndividualDatabase describes the initialization of databases
type IndividualDatabase struct {
	Name       string   `json:"name"`
	DesignDocs []string `json:"designdocs"`
}

// Database is connection details to connect to couchdb database
type Database struct {
	ConnectionURL string             `json:"connectionurl"`
	Components    IndividualDatabase `json:"components"`
	CreateDB      bool               `json:"createdb"`
}

// TLSConfig is to configure the tls server
type TLSConfig struct {
	Enabled       bool   `json:"enabled"`
	ListenAddress string `json:"listenaddress"`
	CertPath      string `json:"certpath"`
	KeyPath       string `json:"keypath"`
}

// BasicAuth provides implementation to store basic auth info
type BasicAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Timeouts struct {
	Deployment          int `json:"componentDeploy"`
	APIServer           int `json:"apiServer"`
	OrdererFailureCount int `json:"ordererFailureCount"`
}

// CRN provides crn info
type CRN struct {
	Version      string `json:"version"`
	CName        string `json:"c_name"`
	CType        string `json:"c_type"`
	Servicename  string `json:"service_name"`
	Location     string `json:"location"`
	AccountID    string `json:"account_id"`
	InstanceID   string `json:"instance_id"`
	ResourceType string `json:"resource_type"`
	ResourceID   string `json:"resource_id"`
}

func (crn *CRN) String() string {
	return fmt.Sprintf("crn:%s:%s:%s:%s:%s:%s:%s:%s:%s",
		crn.Version, crn.CName, crn.CType, crn.Servicename, crn.Location, crn.AccountID, crn.InstanceID, crn.ResourceType, crn.ResourceID)
}
