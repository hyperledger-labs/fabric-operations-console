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

package deployer

import (
	"context"
	"io/ioutil"
	"net/http"
	"os"
	"time"

	"crypto/tls"
	"fmt"
	"net"

	"github.com/go-chi/chi"
	"github.com/pkg/errors"
	"k8s.io/client-go/rest"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/ca"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/operator"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/orderer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/components/peer"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/ibpoperator"
	"github.com/IBM-Blockchain/fabric-deployer/deployer/kube"
	"go.uber.org/zap"
)

const (
	GET    = "get"
	POST   = "post"
	PATCH  = "patch"
	DELETE = "delete"
)

type Deployer struct {
	Config        *config.DeployerSettingsConfig
	LocalConfig   *config.LocalConfig
	BlockingStart bool

	Logger            *zap.SugaredLogger
	Router            *chi.Mux
	Listener          net.Listener
	IBPOperatorClient *ibpoperator.Client
	K8SClient         *kube.Kube

	CA       *ca.CA
	Peer     *peer.Peer
	Orderer  *orderer.Orderer
	Operator *operator.Operator

	httpServer *http.Server
}

// New is a hook that is called with the Options the program is run
// with. Deployer is the place where you will initialize your
// Deployer with the parameters passed in.
func New(config *config.DeployerSettingsConfig, localConfig *config.LocalConfig, blockingStart bool) *Deployer {
	return &Deployer{
		Config:        config,
		LocalConfig:   localConfig,
		BlockingStart: blockingStart,
		Router:        chi.NewRouter(),
		Logger:        localConfig.Logger.Sugar().Named("Deployer"),
	}
}

func (d *Deployer) Init() error {
	var err error
	var tlsConfig *tls.Config
	config := d.Config

	d.Logger.Debugf("Initializing deployer in namespace '%s'", config.Namespace)

	if err != nil {
		d.Logger.Errorw("Error creating couchdb client", err)
		return err
	}

	address := fmt.Sprintf(":%d", config.Port)
	if config.TLS.Enabled {
		if config.TLS.CertPath == "" || config.TLS.KeyPath == "" {
			d.Logger.Errorw("TLS Cert and Key path not provided", "sb.TLS.CertPath", config.TLS.CertPath, "sb.TLS.KeyPath", config.TLS.KeyPath)
		}

		tlsConfig = &tls.Config{
			MinVersion: tls.VersionTLS12, // TLS 1.2 recommended, TLS 1.3 (current latest version) encouraged
		}
		tlsConfig.Certificates = make([]tls.Certificate, 1)
		tlsConfig.Certificates[0], err = tls.LoadX509KeyPair(config.TLS.CertPath, config.TLS.KeyPath)
		if err != nil {
			return errors.Wrap(err, "error loading TLS Certificates")
		}
	}

	err = d.CreateListener(address, tlsConfig)
	if err != nil {
		return err
	}

	var ibpOperatorClient *ibpoperator.Client
	var k8sClient *kube.Kube
	if d.LocalConfig.KubeConfig != nil {
		ibpOperatorClient, err = ibpoperator.New(d.LocalConfig.KubeConfig)
		if err != nil {
			return err
		}
		k8sClient, err = kube.NewForConfig(d.LocalConfig.KubeConfig)
		if err != nil {
			return err
		}
	} else {
		cfg, err := rest.InClusterConfig()
		if err != nil {
			return err
		}
		ibpOperatorClient, err = ibpoperator.New(cfg)
		if err != nil {
			return err
		}
		k8sClient, err = kube.NewForConfig(cfg)
		if err != nil {
			return err
		}
	}
	d.IBPOperatorClient = ibpOperatorClient
	d.K8SClient = k8sClient

	d.httpServer = &http.Server{
		Addr:    address,
		Handler: d.Router,
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS12, // TLS 1.2 recommended, TLS 1.3 (current latest version) encouraged
		},
		WriteTimeout:      time.Duration(config.Timeouts.APIServer) * time.Millisecond,
		IdleTimeout:       time.Duration(config.Timeouts.APIServer) * time.Millisecond,
		ReadHeaderTimeout: 5 * time.Second,
	}

	d.CA = ca.New(d.LocalConfig.Logger, d.K8SClient, d.IBPOperatorClient, d.Config)
	d.Peer = peer.New(d.LocalConfig.Logger, d.K8SClient, d.IBPOperatorClient, d.Config)
	d.Orderer = orderer.New(d.LocalConfig.Logger, d.K8SClient, d.IBPOperatorClient, d.Config)
	d.Operator = operator.New(d.LocalConfig.Logger, d.K8SClient)

	d.registerEndpoints()
	return nil
}

func (d *Deployer) CreateListener(address string, tlsConfig *tls.Config) error {
	var err error
	if tlsConfig != nil {
		d.Logger.Debugf("TLS config: %+v", tlsConfig)
		d.Listener, err = tls.Listen("tcp", address, tlsConfig)
		if err != nil {
			return errors.Wrap(err, "error creating TLS listener")
		}
		d.Logger.Infof("Listening on: https://%s", address)
		return nil
	}

	d.Listener, err = net.Listen("tcp", address)
	if err != nil {
		return errors.Wrap(err, "error creating listener")
	}
	d.Logger.Infof("Listening on: http://%s", address)
	return nil
}

func (d *Deployer) Serve() {
	d.Logger.Infof("Starting to serve")
	if d.BlockingStart {
		err := d.httpServer.Serve(d.Listener)
		if err != nil && err != http.ErrServerClosed {
			d.Logger.Errorw("Error starting listener", err)
			os.Exit(1)
		}
	}
	go d.httpServer.Serve(d.Listener)
}

func (d *Deployer) Stop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return d.httpServer.Shutdown(ctx)
}

func (d *Deployer) registerEndpoints() {
	r := d.Router
	r.Use(d.AddHSTSHeaderMiddleware)
	r.Use(d.BasicAuthMiddleware)
	r.Handle("/", d)
	r.Get("/healthcheck", d.healthCheck)

	// v3 apis
	// get versions
	r.Get("/api/v3/instance/{serviceInstanceID}/type/{type}/versions", d.VersionEndpoint())
	// get all components
	r.Get("/api/v3/instance/{serviceInstanceID}/type/all", d.GetAllEndpoint())
	// create components
	r.Post("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}", d.CreateEndpoint())
	r.Post("/api/v3/instance/{serviceInstanceID}/precreate/type/orderer/component/{componentName}", d.PrecreatedOrdererEndpoint())
	// delete individual component
	r.Delete("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}", d.DeleteEndpoint())
	// get individual component
	r.Get("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}", d.GetEndpointSection())
	r.Get("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}/{section}", d.GetEndpointSection())
	// update
	r.Put("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}", d.UpdateEndpointSection())
	r.Put("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}/{section}", d.UpdateEndpointSection())
	// patch
	r.Patch("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}", d.PatchEndpointSection())
	r.Patch("/api/v3/instance/{serviceInstanceID}/type/{type}/component/{componentName}/{section}", d.PatchEndpointSection())

	// k8s
	r.Get("/api/v3/instance/{serviceInstanceID}/k8s/cluster/version", d.K8sVersionEndpoint())

}

func (d *Deployer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	_, err := w.Write([]byte("Deployer running..."))
	if err != nil {
		d.Logger.Errorw("Error writing to HTTP response", err)
	}
}

func (d *Deployer) AddHSTSHeaderMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		next.ServeHTTP(w, r)
	})
}

func (d *Deployer) BasicAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := d.BasicAuth(r)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			_, err := w.Write([]byte("Unauthorized"))
			if err != nil {
				d.Logger.Errorw("Error writing to HTTP response", err)
			}
			return
		}
		ctx := context.WithValue(r.Context(), "user", user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (d *Deployer) BasicAuth(r *http.Request) (string, error) {
	user, pass, ok := r.BasicAuth()

	if !ok {
		return "", errors.New("failed to authorize")
	}

	if user != d.Config.Auth.Username || pass != d.Config.Auth.Password {
		return "", errors.New("unauthorized")
	}

	return user, nil
}

func (d *Deployer) healthCheck(w http.ResponseWriter, r *http.Request) {
	_, err := w.Write([]byte("Deployer reporting all ok"))
	if err != nil {
		d.Logger.Errorw("Error writing to HTTP response", err)
	}
}

// K8sVersionEndpoint returns an endpoint type that is responsible for handling
// getting kuberenetes cluster version
func (d *Deployer) K8sVersionEndpoint() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.ClusterVersionHandler, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) VersionEndpoint() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.Version, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) CreateEndpoint() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.Create, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) PrecreatedOrdererEndpoint() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.PrecreateOrderer, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) DeleteEndpoint() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.Delete, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) GetAllEndpoint() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.GetAll, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) GetEndpointSection() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.GetSection, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) UpdateEndpointSection() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.UpdateSection, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) PatchEndpointSection() func(http.ResponseWriter, *http.Request) {
	return NewEndpoint(d.PatchSection, d.LocalConfig.Logger).ServeHTTP
}

func (d *Deployer) GetAll(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	sID := chi.URLParam(r, "serviceInstanceID")

	var response []interface{}
	cas, _, err := d.CA.GetAllCR(sID, d.Config.Namespace)
	if err != nil {
		return nil, 0, err
	}
	for _, ca := range cas {
		response = append(response, ca)
	}

	orderers, statusCode, err := d.Orderer.GetAllCR(sID, d.Config.Namespace)
	if err != nil {
		return nil, statusCode, err
	}
	for _, orderer := range orderers {
		response = append(response, orderer)
	}

	peers, statusCode, err := d.Peer.GetAllCR(sID, d.Config.Namespace)
	if err != nil {
		return nil, statusCode, err
	}
	for _, peer := range peers {
		response = append(response, peer)
	}

	return response, 0, nil
}

func (d *Deployer) Create(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	typeOfComponent := chi.URLParam(r, "type")
	sID := chi.URLParam(r, "serviceInstanceID")
	compName := chi.URLParam(r, "componentName")

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, 0, errors.New("failed to ready request body")
	}

	switch typeOfComponent {
	case "ca":
		return d.CA.CreateCR(d.Config.Domain, sID, compName, d.Config.Namespace, body)
	case "peer":
		return d.Peer.CreateCR(d.Config.Domain, sID, compName, d.Config.Namespace, body)
	case "orderer":
		return d.Orderer.CreateCR(d.Config.Domain, sID, compName, d.Config.Namespace, body)
	}

	return nil, 0, errors.Errorf("Component type not supported: %d", http.StatusBadRequest)
}

func (d *Deployer) Delete(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	typeOfComponent := chi.URLParam(r, "type")
	sID := chi.URLParam(r, "serviceInstanceID")
	compName := chi.URLParam(r, "componentName")

	if compName == "" {
		return nil, 0, errors.New("Name of the component to be deleted is required")
	}

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, 0, errors.New("failed to ready request body")
	}

	switch typeOfComponent {
	case "ca":
		return d.CA.DeleteCR(sID, compName, d.Config.Namespace, body)
	case "peer":
		return d.Peer.DeleteCR(sID, compName, d.Config.Namespace, body)
	case "orderer":
		return d.Orderer.DeleteCR(sID, compName, d.Config.Namespace, body)
	}

	return nil, 0, errors.Errorf("Component type not supported: %d", http.StatusBadRequest)
}

func (d *Deployer) PrecreateOrderer(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	sID := chi.URLParam(r, "serviceInstanceID")
	compName := chi.URLParam(r, "componentName")
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, 0, errors.New("failed to ready request body")
	}

	return d.Orderer.PrecreateCR(d.Config.Domain, sID, body, compName)
}

func (d *Deployer) GetSection(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	typeOfComponent := chi.URLParam(r, "type")
	sID := chi.URLParam(r, "serviceInstanceID")
	compName := chi.URLParam(r, "componentName")
	section := chi.URLParam(r, "section")

	if compName == "" {
		return nil, 0, errors.New("Name of the component to get is required")
	}

	// If no section is provided, treat it like request to patch entire component
	if section == "" {
		section = orderer.ALL
	}

	switch typeOfComponent {
	case "ca":
		return d.CA.GetCR(section, compName, d.Config.Namespace, sID)
	case "peer":
		return d.Peer.GetCR(section, compName, d.Config.Namespace, sID)
	case "orderer":
		return d.Orderer.GetCR(section, compName, d.Config.Namespace, sID)
	}

	return nil, 0, errors.Errorf("Component type not supported: %d", http.StatusBadRequest)
}

func (d *Deployer) UpdateSection(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	sID := chi.URLParam(r, "serviceInstanceID")
	compName := chi.URLParam(r, "componentName")
	section := chi.URLParam(r, "section")
	if compName == "" {
		return nil, 0, errors.New("Name of the component to get is required")
	}

	// If no section is provided, treat it like request to patch entire component
	if section == "" {
		section = orderer.ALL
	}

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, 500, errors.New("failed to ready request body")
	}

	typeOfComponent := chi.URLParam(r, "type")
	switch typeOfComponent {
	case "ca":
		return d.CA.UpdateCR(section, compName, d.Config.Namespace, sID, body)
	case "peer":
		return d.Peer.UpdateCR(section, compName, d.Config.Namespace, sID, body)
	case "orderer":
		return d.Orderer.UpdateCR(section, compName, d.Config.Namespace, sID, body)
	}

	return nil, 0, errors.Errorf("Component type not supported: %d", http.StatusBadRequest)
}

func (d *Deployer) PatchSection(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	typeOfComponent := chi.URLParam(r, "type")

	sID := chi.URLParam(r, "serviceInstanceID")
	section := chi.URLParam(r, "section")
	compName := chi.URLParam(r, "componentName")

	if compName == "" {
		return nil, 400, errors.New("Name of the component to patch is required")
	}

	// If no section is provided, treat it like request to patch entire component
	if section == "" {
		section = orderer.ALL
	}

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, 500, errors.New("failed to ready request body")
	}

	switch typeOfComponent {
	case "ca":
		return d.CA.PatchCR(section, compName, d.Config.Namespace, sID, body)
	case "peer":
		return d.Peer.PatchCR(section, compName, d.Config.Namespace, sID, body)
	case "orderer":
		return d.Orderer.PatchCR(section, compName, d.Config.Namespace, sID, body)
	}

	return nil, 0, errors.Errorf("Component type not supported: %d", http.StatusBadRequest)
}

func (d *Deployer) Version(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	typeOfComponent := chi.URLParam(r, "type")

	versions := d.Config.Versions
	if typeOfComponent == "ca" {
		return common.VersionResponseCA{
			Versions: versions.CA,
		}, 0, nil
	}

	if typeOfComponent == "peer" {
		return common.VersionResponsePeer{
			Versions: versions.Peer,
		}, 0, nil
	}

	if typeOfComponent == "orderer" {
		return common.VersionResponseOrderer{
			Versions: versions.Orderer,
		}, 0, nil
	}

	if typeOfComponent == "all" {
		return common.AllVersionsResponse{
			Versions: *versions,
		}, 0, nil
	}

	return nil, 0, errors.New("Please specify a valid component type")
}

// ClusterVersionHandler will handle getting kubernetes cluster version
func (d *Deployer) ClusterVersionHandler(w http.ResponseWriter, r *http.Request) (interface{}, int, error) {
	version, err := d.K8SClient.GetVersion()
	if err != nil {
		return nil, 500, errors.Wrap(err, "failed to get kubernetes server version")
	}

	return version, 0, nil
}
