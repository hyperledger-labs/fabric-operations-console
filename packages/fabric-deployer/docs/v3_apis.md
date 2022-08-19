# Deployer APIs

Blockchain Deployer is responsible for providing most of the backend functionality for Fabric Operations Console UI.

## Table of Contents

- [Authentication](#authentication)
- [Components](#components)
  - [List Available Component Versions](#list-available-component-versions)
  - [Create Component](#create-component)
  - [Create Orderer Cluster](#create-orderer-cluster)
  - [Update Component](#update-component)
  - [Delete Component](#delete-component)
  - [List Components by Type](#list-components-by-type)
  - [Get Component Details](#get-component-details)
  - [Update Component Resources Limits by Type](#update-component-resources-limits-by-type)

## Authentication

_Each instance_ of OpTools also has a pre-shared username and password for communicating with Deployer.  These
credentials are scoped to the instance associated with that deployment of OpTools,
preventing one OpTools deployment from being able to interfere with another deployment's components.  This header should
be attached to OpTools requests using a typical basic auth header (`Authorization: Basic <base64_user:password>`).
Typically, these credentials are generated and stored in the OpTools configuration as well as deployer configuration.

# Components

"Components" refers to the services that must be deployed in order to form a Hyperledger Fabric network.  These components
include:

- Certificate Authorities
- Peers
- Orderers/ordering services

### Common API Route Parameters

#### `:serviceInstanceID`

Same as the [service instance API field](#serviceinstanceid).

#### `:componentType`

The available component types are:

- `peer`: Hyperledger Fabric Peers
- `orderer`: Hyperledger Fabric Ordering Services
- `ca`: Hyperledger Fabric Certificate Authorities
- `orderercluster`: Hyperledger Fabric Raft Ordering Service Cluster
- `all`: All of the other components.  This is only used on `GET` endpoints to save clients from having to make multiple
  requests.

#### `:componentID`

The identifier for a previously created component.  See the `name` fields in the [component object docs](components).

## List Available Component Versions

Get a list of versions currently available for a given component.  These version fields can be used when
[creating](#create-component) or [updating](#update-component) components.  Versions are generally used for
locking the image versions.

- **Method:** `GET`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/:componentType/versions`
- **Auth:**
  - [Auth header](#Authentication)
- **Body:** N/A
- **Response:**
  - If a specific `:componentType` is used:

    ```JSON
    {
        "versions": {
            "1.0.0": {
                "version": "1.0.0",
                "default": true
            },
            "1.0.1": {
                "version": "1.0.1"
            }
        }
    }
    ```

  - If `all` is used:

  ```JSON
  {
      "versions": {
          "ca": {
              "1.0.0": {
                "version": "1.0.0",
                "default": true
            },
            "1.0.1": {
                "version": "1.0.1"
            }
          },
          "peer": {
              "1.0.0": {
                "version": "1.0.0",
                "default": true
            },
            "1.0.1": {
                "version": "1.0.1"
            }
          },
          "orderer": {
              "1.0.0": {
                "version": "1.0.0",
                "default": true
            },
            "1.0.1": {
                "version": "1.0.1"
            }
        }
    }
  }
  ```

- **Errors:**
  - `500`: Version list could not be acquired.
- **Sample:**
  - [ca](./v3_responses/versions_ca.json) > TODO
  - [peer](./v3_responses/versions_peer.json) > TODO
  - [orderer](./v3_responses/versions_orderer.json) > TODO
  - [all](./v3_responses/versions_all.json) > TODO

## Create Component
  
Internal steps to fulfill this request:

1. Determine storage and resource settings, either from request or, if not included in request, from defaults provided in Deployer config.
2. Determine the version from request or default settings, and determine the images to be used based on the version.
3. Create the new component in the cluster using CR Spec

### Resource Limits

You can set resource limits on the containers within a component by adding an entry for that container in the `resources`
block of the request body.  For example, if you wanted to limit the CPU and memory allocation for the `proxy` container
of the `peer` component you were creating, you would have an entry in your request body that looks like this:

```
{
    ...
    "resources": {
        "proxy": {
            "requests": {
                "cpu": "100m",
                "memory": "400M"
            },
            "limits": {
                "cpu": "100m",
                "memory": "400M"
            }
        },
    }
}
```

> Even if you don't set limits here, logical defaults will be set by Deployer.  It's too risky to deploy these components
> with no limits by default.

### Storage Limits

Just as resource usage limits can be customized, you can tweak the storage limits for a component's containers.  For
example, storage limits could be set on the `peer` container of the `peer` component by adding this `storage` entry to
your request body:

```
{
    ...
    "storage": {
        "peer": {
            "size": "10Gi",
            "class": "local"
        }
    }
}
```

> Even if no storage limits are set, Deployer will set defaults of its own.

### Zone & Region

If the customer is using a multi-zone cluster, they should be able to leverage the multi-zone capability to put different
components in different zone. The `zone` and `region` parameters help them do that.
If `zone` and `region` are set to `x-multizone`, then we do not
select a zone or region for the deployment. This is useful in cases where portworx like storage solution is used.
If `zone` and `region` is set to blank, we will select a random zone and region from the available ones. If
zone and region are passed with any other values, we will use those values.

### Version

This is the way we track the version of the component deployed. The deployer has knowledge of what version corresponds
to what set of images. The [List Available Component Versions](#list-available-component-versions) api can be used to get
the available versions. Generally on create `default` version is created and on `update` calls user can decide to update
a newer version.

- **Method:** `POST`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/:componentType/component/:componentID`
- **Auth:**
  - [Auth header](#Authentication)
- **Body:**
  - If `:componentType` is `peer`:

        ```
        {
            "version": "",     // optional
            "zone": "",      // optional k8s zone to deploy in
            "region": "",     // optional k8s region to deploy in
            "orgname": "org1",    // required
            "crypto": {},                   // required, msp crypto config json
            "configoverride": {},           // pass the coreyaml here
            "hsm": {
                "pkcs11endpoint": ""        // DEPRECATED
            },
            "statedb": "leveldb | couchdb", // optional
            "resources": {     // optional, see resource limits
                "init": {},
                "peer": {},
                "couchdb": {},              // only passed if statedb is set to couchdb
                "proxy": {},
                "dind": {},                 // only for 1.4.x peer
                "fluentd": {},              // only for 1.4.x peer
                "chaincodelauncher": {}     // only for 2.x peer
            },
            "storage": {     // optional, see storage limits
                "peer": {},
                "statedb": {}
            },
            "arch": [""]                    // optional, array of arch to pin this peer
        }
        ```
  - If `:componentType` is `orderer`:

        ```
        {
            "version": "",                  // optional
            "arch": [],                     // optional array of arch to pin orderers to
            "systemchannelname": "",        // optional, defaults to testchainid
            "orgname": "org1",
            "prefix": "orderera",           // optional, randomly generated if not passed
            "number": 1|5,                  // can be any integer value
            "config": [{}, {}],             // array of msp/enrollment config of size `number`
            "configoverride": { // pass the ordereryaml here},
            "hsm": {
                "pkcs11endpoint": ""        // DEPRECATED
            },
            "genesis": {
                "block": "<string - base64 encoded>", // optional
            }
            "zone": [],      // optional k8s zones to deploy in, array of size `number`
            "region": [],     // optional k8s regions to deploy in, array of size `number`
            "resources": {},     // optional, see resource limits
            "storage": {},     // optional, see storage limits
            "channelless": "true|false"     // options, to create orderers without system channel 
        }
        ```
  - If `:componentType` is `ca`:

        ```
        {
            "version": "",                  // optional
            "arch": [],                     // optional, array of arch to pin CA to
            "zone": "",      // optional k8s zone to deploy in
            "region": "",     // optional k8s region to deploy in
            "resources": {     // optional, see resource limits
                "init": {},
                "ca": {}
            },
            "storage": {     // optional, see storage limits
                "ca": {}
            },
            "replicas": "",                 // valid if database used is postgres
            "configoverride": {             // configoverride for ca and tlsca, optional
                "ca": "",
                "tlsca": ""
            },
            "hsm": {
                "pkcs11endpoint": ""        // DEPRECATED
            }
        }
        ```

- **Response:**
  - If `:componentType` is `peer`: See [peer response documentation](./v3_responses/creation_peer.md) > TODO
  - If `:componentType` is `orderer`: See [orderer response documentation](./v3_responses/creation_orderer.json) > TODO
  - If `:componentType` is `ca`: See [CA response documentation](./v3_responses/creation_ca.json) > TODO

### Orderer Cluster Parameters

#### Prefix & Number
  
The prefix given to the name of the orderers. The orderers created have the name `$prefix` + `node` + `$number`. Example if
prefix is `orderer` and number is set to `2`, names will be `orderernode1` and `orderernode2`.

### CA Paramters

### Replicas

This sets the replicas of kubernetes deployment for CA. The parameter is valid only when postgres is used as the
backend database for CA.

### Configoverride

All the parameters in the fabric-ca-server config can be tweaked using the configoverrides. It is used to pass
customer identity/enrollment info, backend database info, tls certs etc.

## Update Component > TODO this will split into multiple apis

Updates the resource limits, certificates, and/or software version of an existing component.

todo what about the optools update?

Internal steps to fulfill this request:

- Get the previous CR spec
- Update the params that were passed in the call
- Update the CR spec

Useful documentation for possible updates:

- [Resource limits](#resource-limits)
- [Versions](todo link to this section)

- **Method:** `PUT`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/:componentType/component/:componentID`
- **Auth:**
  - [Auth header](#Authentication)
- **Body:**
  - If `:componentType` is `ca`:

        ```
        {
            "version": "",     // optional
            "resources": {     // optional, see resource limits
                "ca": {}
            },
            "configoverride": {             // configoverride for ca and tlsca, optional
                "ca": "",
                "tlsca": ""
            },
            "replicas": "",                 // valid if database used is postgres, optional
            "actions": {}                   // optional
        }
        ```
    - Actions `*current.CAAction`  `json:"actions"`

  - If `:componentType` is `peer`:

        ```
        {
            "version": "",     // optional
            "crypto": {},                   // optional, msp crypto config json
            "admincerts": "",    // optional
            "resources": {     // optional, see resource limits
                "peer": {},
                "couchdb": {},
                "proxy": {},
                "dind": {},
                "fluentd": {}
            },
            "configoverride": {},           // optional, core yaml configs
            "hsm": {                        // optional, hsm  params change  (proxy configs)
                "pkcs11endpoint": ""        
            }
            "nodeou": {
                "enabled": "",              // optional
            },
            "actions": {}                   // optional
        }
        ```
    - Config `*current.SecretSpec` `json:"crypto"`
    - ConfigOverride `*json.RawMessage` `json:"configoverride,omitempty"`
    - HSM `*current.HSM` `json:"hsm,omitempty"`
    - Actions `*current.PeerAction`  `json:"actions"`

  - If `:componentType` is `orderer`:

        ```
        {
            "version": "",     // optional
            "crypto": {},                   // optional, msp crypto config json
            "admincerts": "",    // optional, if msp crypto is passed this should not be
            "resources": {     // optional, see resource limits
                "orderer": {},
                "proxy": {}
            },
            "genesis": {                    
                "block": ""                 // optional, base64 genesis block
            },
            "configoverride": {},           // optional, orderer yaml configs
            "hsm": {                        // optional
                "pkcs11endpoint": ""        
            }
            "nodeou": {
                "enabled": "",              // optional, hsm params change (proxy configs)
            },
            "actions": {}                   // optional
        }
        ```
    - Config `*current.SecretSpec` json:""config"
    - ConfigOverride `*json.RawMessage` json:"configoverride,omitempty"
    - HSM `*current.HSM` json:"hsm,omitempty"
    - Actions `*current.CAAction`  `json:"actions"`

  - If `:componentType` is `orderercluster`:  No such API

## Delete Component

Delete a given component.

Internal steps to fulfill this request:

- Find if the node exists
- If it does delete the CR Spec.

- **Method:** `DELETE`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/:componentType/component/:componentID`
- **Auth:**
  - [Auth header](#Authentication)
- **Body:** N/A
- **Response:**

    ```json
    {
        "message": "ok"
    }
    ```

## List Components by Type

Gets a list of all the components running on the cluster for the given service instance.  This API supports the `all`
value for `:componentType`.

Internal steps to fulfill this request:

- Get list of all components with a specific kubernetes label.

- **Method:** `GET`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/:componentType`
- **Auth:**
  - [Auth header](#Authentication)
- **Body:** N/A
- **Response:**

    ```JSON
    {
        "component-name": {},
        "component-name": {},
        "component-name": {}
    }
    ```

    > Component bodies will match the formats in the [component docs](./components).

## Get Component Details

Gets info about a specific component. This API supports the `all` value for `:componentType`.

- **Method:** `GET`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/:componentType/component/:componentID`
- **Auth:**
  - [Auth header](#Authentication)
- **Body:** N/A
- **Response:**
  - Responses will match one of the bodies in the [component docs](./components).

- **CA Response:**

    ```JSON
    {
        "name": "ordererorgca",
        "ca_name": "ca",
        "tlsca_name": "tlsca",
        "replicas": 1,
        "endpoints": {
            "api": "",
            "operations": ""
        },
        "resources": {},                    // total resources used
        "individualResources": {
            "ca": {},
            "init": {}
        },                                  // resources for each container
        "tls": {
            "cert": ""                      // base64 server tls certifacates
        },                              
        "crnString": "",
        "crn": {},                          // crn object
        "resource_plan_id": "",
        "storage": {
            "ca": {}
        },                 
        "crstatus": {},
        "status": "created",
        "version": "1.4.4-0",               // fabric version
        "configs": {
            "ca": {},                       // ca server config
            "tlsca": {}                     // tlsca server config
        },
        "region": "",
        "zone": ""
    }
    ```

- **Peer Response:**

    ```JSON
    {
        "name": "org1peer1",
        "endpoints": {
            "api": "",
            "operations": "",
            "grpcweb": ""
        },
        "resources": {},                    // total resources used
        "individualResources": {},          // resources for each container
        "crnString": "",
        "crn": null,
        "resource_plan_id": "",
        "storage": {
            "peer": {},
            "statedb": {}
        },
        "crstatus": {},
        "status": "created",
        "version": "1.4.4-0",
        "admincerts": [""],
        "config": {},                       // coreyaml
        "nodeou": {
            "enabled": "bool"
        },
        "msp": {
            "tls": {},
            "component": {}
        },
        "region": "",
        "zone": ""
    }
    ```

- **Orderer Response:**

    ```JSON
    {
        "name": "ordereranode1",
        "endpoints": {
            "api": "",
            "operations": "",
            "grpcweb": ""
        },
        "resources": {},                    // Total resources
        "individualResources": {            // individual container resources
            "init": {},
            "orderer": {},
            "proxy": {}
        },
        "crnString": "",
        "crn": null,
        "resource_plan_id": "",
        "storage": {
            "orderer": {}
        },
        "crstatus": {},
        "parent": {
            "name": "",
            "crstatus": {}
        },
        "status": "created",
        "version": "1.4.4-0",
        "admincerts": [""],
        "config": {},                       // orderer yaml
        "nodeou": {
            "enabled": "bool"
        },
        "msp": {
            "tls": {},
            "component": {}
        },
        "region": "",
        "zone": ""
    }
    ```
  - Config `*json.RawMessage`
  
## Update Component Resources Limits by Type

Syncs the resource limits in the Deployer records with those on the actual deployments for a given component type.  This
allows Deployer to catch up to what's actually on the cluster after resource limits for a component are altered manually.
This API supports the `all` value for `:componentType`.

Internal steps to fulfill this request:

- Get list of all components with a specific kubernetes label.
- Update all corresponding component documents with current resource limits.

- **Method:** `PUT`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/:componentType`
- **Auth:**
  - [Auth header](#Authentication)
- **Response:**

    ```JSON
    {
        "component-name": {},
        "component-name": {},
        "component-name": {}
    }
    ```

    > Component bodies will match the formats in the [component docs](./components).

## Precreate Raft node

Used to add a raft node to an existing cluster. The precreate api creates an orderer on cluster without passing genesis block. This will create all the required certs and return endpoints and tls cert in response.

- **Method:** `POST`
- **Route:** `/api/v3/instance/:serviceInstanceID/precreate/type/orderer/component/:componentName`
- **Auth:**
  - [Auth header](#Authentication)
- **Body:**

  ```json
    {
        "version": "",                  // optional
        "arch": [],                     // optional array of arch to pin orderers to
        "systemchannelname": "",        // optional, defaults to testchainid
        "orgname": "org1",
        "crypto": {},                   // msp/enrollment crypto
        "configoverride": {},           // pass the ordereryaml here
        "hsm": {
            "pkcs11endpoint": ""        // DEPRECATED
        },
        "zone": "",      // optional k8s zones to deploy in
        "region": "",     // optional k8s regions to deploy in
        "resources": {},    // optional, see resource limits
        "storage": {}     // optional, see storage limits
    }
    ```

- **Response:**
  - [response](./v3_responses/creation_orderer.json) > TODO

- **Errors:**
  - `500`: Something went wrong

## Get APIs for Peer

Used to get different sections of the peer information.

- **Method:** `GET`
- **Route:** `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/:section`
- **Auth:**
  - [Auth header](#Authentication)
- **Response:**
  - [response will have relevant sections from whole response](./v3_responses/get_peer.json) > TODO
- **Errors:**
  - `500`: Something went wrong
- **:section**
  - resources

  response fields: `name`, `resources`, `individualResources`
  - storage

  response fields: `name`, `storage`
  - status

  response fields: `name`, `status`
  - config

  response fields: `name`, `config`
  - crypto

  response fields: `name`, `msp`, `crypto`
  - admincerts

  response fields: `name`, `admincerts`
  - nodeou

  response fields: `name`, `nodeou`
  - endpoints

  response fields: `name`, `endpoints`
  - version

  response fields: `name`, `version`
  - all

  response fields: `name`, `endpoints`, `resources`, `individualResources`, `storage`, `crstatus`, `version`, `admincerts`, `config`, `nodeou`, `msp`, `region`, `zone`

---

## New APIS

> TODO: add request/response formats etc.

CA get APIs

- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/all`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/resources`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/storage`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/status`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/config`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/endpoints`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/version`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/replicas`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/hsm`
- GET `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/crypto`

CA create APIs

- POST `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName`

CA update APIs

- PUT `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName`
- PUT `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/all`
- PUT `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/config`
- PUT `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/version`
- PUT `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/replicas`
- PUT `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/hsm`

CA patch APIs

- PATCH `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName`
- PATCH `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/all`
- PATCH `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/resources`
- PATCH `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/config`
- PATCH `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName/actions`

CA Delete API

- DELETE `/api/v3/instance/:serviceInstanceID/type/ca/component/:componentName`

Peer get APIs

- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/all`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/resources`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/storage`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/status`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/config`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/endpoints`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/crypto`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/version`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/admincerts`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/nodeou`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/replicas`
- GET `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/hsm`

Peer create APIs

- POST `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName`

Peer update APIs

- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/all`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/config`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/crypto`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/admincerts`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/version`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/replicas`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/hsm`
- PUT `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/nodeou`

Peer patch APIs

- PATCH `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName`
- PATCH `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/all`
- PATCH `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/resources`
- PATCH `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/config`
- PATCH `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/crypto`
- PATCH `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/nodeou`
- PATCH `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName/actions`

Peer delete API

- DELETE `/api/v3/instance/:serviceInstanceID/type/peer/component/:componentName`

Orderer get APIs

- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/all`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/resources`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/storage`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/status`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/config`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/endpoints`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/crypto`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/version`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/admincerts`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/nodeou`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/replicas`
- GET `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/hsm`

Orderer create APIs

- POST `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName`
- POST `/api/v3/instance/:serviceInstanceID/precreate/type/orderer/component/:componentName`

Orderer update APIs

- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/all`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/config`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/crypto`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/admincerts`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/version`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/replicas`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/genesis`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/hsm`
- PUT `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/nodeou`

Orderer patch APIs

- PATCH `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName`
- PATCH `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/all`
- PATCH `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/resources`
- PATCH `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/config`
- PATCH `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/crypto`
- PATCH `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/nodeou`
- PATCH `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName/actions`

Orderer delete API

- DELETE `/api/v3/instance/:serviceInstanceID/type/orderer/component/:componentName`

Get available versions

- GET `/api/v3/instance/{serviceInstanceID}/type/{type}/versions`

Get all components

- GET `/api/v3/instance/{serviceInstanceID}/type/all`

Kubernetes Server Version API

- GET `api/v3/instance/{serviceInstanceID}/k8s/cluster/version`

# Actions

Actions can be triggered through the PATCH api. The format for passing actions for each component is listed below with a description of each action.

## CA

```
{
    "restart": "",          // optional, bool
    "renew": {
        "tlscert": "",      // optional, bool
    }
}
```

- **Restart**: if set to true, will restart the component
- **Renew.TLSCert**: if set to true, will renew the CA's TLS certificate

## Peer

```
{
    "restart": "",          // optional, bool
    "reenroll": {
        "tlscert": "",      // optional, bool
        "ecert": "",        // optional, bool
        "ecertNewKey": "",  // optional, bool
        "tlscertNewKey": "" // optional, bool
    },
    "enroll": {
        "ecert": "",        // optional, bool
        "tlscert": ""       // optional, bool
    },
    "upgradedbs": ""        // optional, bool
}
```

- **Restart**: if set to true, will restart the component
- **Reenroll.TLSCert**: if set to true, will reenroll the peer's TLS signcert with the CA
- **Reenroll.Ecert**: if set to true, will reenroll the peer's ecert signcert with the CA
- **Enroll.TLSCert**: if set to true, will enroll the peer's TLS signcert with the CA. This should occur if the peer has not been enrolled/reenrolled with the CA previously (i.e. if its certificates were populated via the MSP spec)
- **Enroll.Ecert**: if set to true, will enroll the peer's ecert signcert with the CA. This should occur if the peer has not been enrolled/reenrolled with the CA previously (i.e. if its certificates were populated via the MSP spec)
- **UpgradeDBs**: if set to true, will start peer's db migration job

## Orderer

```
{
    "restart": "",          // optional, bool
    "reenroll": {
        "tlscert": "",      // optional, bool
        "ecert": "",        // optional, bool
        "ecertNewKey": "",  // optional, bool
        "tlscertNewKey": "" // optional, bool
    },
    "enroll": {
        "ecert": "",        // optional, bool
        "tlscert": ""       // optional, bool
    }
}
```

- **Restart**: if set to true, will restart the component
- **Reenroll.Ecert**: if set to true, will reenroll the peer's ecert signcert with the CA
- **Enroll.TLSCert**: if set to true, will enroll the peer's TLS signcert with the CA. This should occur if the peer has not been enrolled/reenrolled with the CA previously (i.e. if its certificates were populated via the MSP spec)
- **Enroll.Ecert**: if set to true, will enroll the peer's ecert signcert with the CA. This should occur if the peer has not been enrolled/reenrolled with the CA previously (i.e. if its certificates were populated via the MSP spec)
