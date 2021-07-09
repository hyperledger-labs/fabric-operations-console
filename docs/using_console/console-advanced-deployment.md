---
layout: default
title: Advanced deployment options
nav_order: 4
has_children: true
has_toc: false
permalink: ../using_console
description: "Advanced deployment options in Fabric Operations Console"
keywords: deployment, advanced, CouchDB, LevelDB, external CA, resource allocation
---

# Advanced deployment options

When you deploy a node from the console, there are various advanced deployment options available for each node type. The following topic provides more details about each of those options.

**Target audience:** This topic is designed for advanced network operators who are familiar with Hyperledger Fabric and are responsible for creating, monitoring, and managing their components in the fabric network.

## What types of advanced deployment options are available?

The Build a network tutorial is useful for learning how to set up a basic network by using the Fabric  Operatons Console. But each use case has its own customizations that are required for a production network. When you are ready to explore additional configuration settings, this topic describes the optional customizations that are available and the considerations they require.

## Before you begin

>**_IMPORTANT:_**  **Before** attempting to deploy a node, it is the network operator's responsibility to monitor the cluster CPU, memory, and storage usage, and ensure that adequate resources are available in the cluster for the node.

### Allocating resources

Because your instance of the Fabric  Operatons Console and your cluster do not communicate directly about the resources that are available, the process for deploying components by using the console must follow this pattern:

1. **Size the deployment that you want to make**. The **Resource allocation** panels for the CA, peer, and ordering node in the console offer default CPU, memory, and storage allocations for each node. You may need to adjust these values according to your use case. If you are unsure, start with default allocations and adjust them as you understand your needs. Similarly, the **Resource reallocation** panel displays the existing resource allocations. For a sense of how much storage and compute you will need in your cluster, refer to the chart after step 3 that contains the current defaults for the peer, orderer, and CA:
2. **Check whether you have enough resources in your cluster**.  If you do not have enough space in your cluster to deploy or resize resources, you need to increase the size of your cluster. Check the documentation of your cloud provider to learn how to scale clusters. If you have enough space in your cluster, you can continue with step 3.
3. **Use the console to deploy or resize your node**. If your pod is large enough to accommodate the new size of the node, the reallocation should proceed smoothly. If the worker node that the pod is running on is running out of resources, you can add a new larger worker node to your cluster and then delete the existing working node.

| **Component** (all containers) | CPU**  | Memory (GB) | Storage (GB) |
|--------------------------------|---------------|-----------------------|------------------------|
| **Peer (Hyperledger Fabric v2.x)**                       | 0.7           | 2.0                   | 200 (includes 100GB for peer and 100GB for state database)|
| **CA**                         | 0.1           | 0.2                   | 20                     |
| **Ordering node**              | 0.35          | 0.7                   | 100                    |
| **Operator**                   | 0.1           | 0.2                   | 0                      |
| **Console**                    | 1.2           | 2.4                   | 10                     |

<p style="text-align:center"><em>Table 2. Default resources for nodes on Fabric  Operatons Console</em></p>
** Actual VPC allocations are visible in the fabric console when a node is deployed.

Note that when smart contracts are installed on peers that run a Fabric v2.x image, the smart contract is launched in its own pod instead of a separate container on the peer, which accounts for the smaller amount of resources required on the peer.

For cases when a user wants to minimize charges without stopping or deleting a node, it is possible to scale the node down to a minimum of 0.001 CPU (1 milliCPU). Note that the node will not be functional when using this amount of CPU.

>**_TIP:_** While the figures in this topic endeavor to be precise, be aware that there are times when a node may not deploy even when it appears that you have enough space in your cluster. In cases where a component doesn't deploy for a lack of resources, even if there seems to be enough space in the cluster, you will likely have to deploy additional cluster resources for the component to deploy.

The **Resource allocation** panel in the console provides default values for the various fields that are involved in creating a node. These values are chosen because they represent a good way to get started. However, every use case is different. While this topic provides guidance for ways to think about these values, it ultimately falls to the user to monitor their nodes and find sizings that work for them. Therefore, barring situations in which users are certain that they need values different from the defaults, a practical strategy is to use these defaults at first and adjust them later.

All of the containers that are associated with a node have **CPU** and **memory**, while certain containers that are associated with the peer, ordering node, and CA also have **storage**. 

>**_NOTE:_** You are responsible for monitoring your CPU, memory, and storage consumption in your cluster. If you do happen to request more resources for a fabric node than are available, the node will not start. However, existing nodes will not be affected. 

Every node has a gRPC web proxy container that bootstraps the communication layer between the console and a node. This container has fixed resource values and is included on the Resource allocation panel to provide an accurate estimate of how much space is required on your cluster in order for the node to deploy. Because the values for this container cannot be changed, we will not discuss the gRPC web proxy in the following sections.

## CA deployment

When you deploy a CA, the following advanced deployment options are available:
* Database and replica sets - Configure a CA for zero downtime.
* Deployment zone selection - In a multi-zone cluster, select the zone where the node is deployed.
* Resource allocation - Configure the CPU, memory, and storage for the node.
* CA configuration override - Choose this option when you want to override CA configuration settings.

### Database and replica sets

Because redundancy is the key to ensuring that when a node goes down another node is able to continue to process requests, you have the option to configure replica sets for CA nodes. .

### Deployment zone selection

If your cluster is configured across multiple zones, when you deploy a CA you have the option of selecting which zone the CA is deployed to. Check the Advanced deployment option that is labeled **Deployment zone selection** to see the list of zones that is currently configured for your cluster.

### Sizing a CA during creation

Unlike peers and ordering nodes, which are actively involved in the transaction process, CAs are involved only in the registration and enrollment of identities, and in the creation of an MSP. This means that they require less CPU and memory. To stress a CA, a user would need to overwhelm it with requests (likely using APIs and a script), or have issued so many certificates that the CA runs out of storage. Under typical operations, neither of these things should happen, though as always, these values should reflect the needs of a particular use case.

The CA has only one associated container that we can adjust:

* **CA container**: Encapsulates the internal CA processes, such as registering and enrolling nodes and users, as well as storing a copy of every certificate it issues.

It is recommended to use the defaults for the CA container and adjust them later when it becomes apparent how they are being utilized by your use case.

| Resources | Condition to increase |
|-----------------|-----------------------|
| **CA container CPU and memory** | When you expect that your CA will be bombarded with registrations and enrollments. |
| **CA storage** | When you plan to use this CA to register a large number of users and applications. |


### Customizing a CA configuration

In addition to the CA settings that are provided in the console when you provision a CA, you have the option to override some of the settings. If you are familiar with the Hyperledger Fabric CA server, these settings are configured in the <a href="https://hyperledger-fabric-ca.readthedocs.io/en/release-1.4/serverconfig.html" target="_blank">`fabric-ca-server-config.yaml` <img src="images/external.png" width="10" alt="external" valign="middle"></a> file when a CA is deployed. The Fabric  Operatons Console configures these fields for you with default settings. Therefore, many of these fields are not exposed by the console. But the console also includes a panel where you can edit a `JSON` to override a set of these parameters before a CA is deployed.

#### Why would I want to override a CA configuration?

You can use the console to configure resource allocation or the CA database and then edit the generated `JSON` adding additional parameters and fields for your use case.  For example, you might want to register additional users with the CA when the CA is created, or specify custom affiliations for your organizations. You can also customize the CSR names that are used when certificates are issued by the CA or add affiliations. These are just a few suggestions of customizations you might want to make but the full list of parameters is provided below. This list contains all of fields that can be overridden by editing the `JSON` when a CA is deployed. For more information about what each field is used for you can refer to the <a href="https://hyperledger-fabric-ca.readthedocs.io/en/release-1.4/serverconfig.html" target="_blank">Fabric CA documentation <img src="images/external.png" width="10" alt="external" valign="middle"></a>.

```json
{
	"ca": {
		"cors": {
			"enabled": false,
			"origins": [
				"*"
			]
		},
		"debug": false,
		"crlsizelimit": 512000,
		"tls": {
			"certfile": null,
			"keyfile": null,
			"clientauth": {
				"type": "noclientcert",
				"certfiles": null
			}
		},
		"ca": {
			"keyfile": null,
			"certfile": null,
			"chainfile": null
		},
		"crl": {
			"expiry": "24h"
		},
		"registry": {
			"maxenrollments": -1,
			"identities": [
				{
					"name": "<<<adminUserName>>>",
					"pass": "<<<adminPassword>>>",
					"type": "client",
					"attrs": {
						"hf.Registrar.Roles": "*",
						"hf.Registrar.DelegateRoles": "*",
						"hf.Revoker": true,
						"hf.IntermediateCA": true,
						"hf.GenCRL": true,
						"hf.Registrar.Attributes": "*",
						"hf.AffiliationMgr": true
					}
				}
			]
		},
		"db": {
			"type": "sqlite3",
			"datasource": "fabric-ca-server.db",
			"tls": {
				"enabled": false,
				"certfiles": null,
				"client": {
					"certfile": null,
					"keyfile": null
				}
			}
		},
		"affiliations": {
      	"fabric": []
    	},
		"csr": {
			"cn": "ca",
			"keyrequest": {
				"algo": "ecdsa",
				"size": 256
			},
			"names": [
				{
					"C": "US",
					"ST": "North Carolina",
					"L": null,
					"O": "Hyperledger",
					"OU": "Fabric"
				}
			],
			"hosts": [
				"<<<MYHOST>>>",
				"localhost"
			],
			"ca": {
				"expiry": "131400h",
				"pathlength": "<<<PATHLENGTH>>>"
			}
		},
		"idemix": {
			"rhpoolsize": 1000,
			"nonceexpiration": "15s",
			"noncesweepinterval": "15m"
		},
		"bccsp": {
			"default": "SW",
			"sw": {
				"hash": "SHA2",
				"security": 256,
				"filekeystore": null
			}
		},
		"intermediate": {
			"parentserver": {
				"url": null,
				"caname": null
			},
			"enrollment": {
				"hosts": null,
				"profile": null,
				"label": null
			},
			"tls": {
				"certfiles": null,
				"client": {
					"certfile": null,
					"keyfile": null
				}
			}
		},
		"cfg": {
			"identities": {
				"passwordattempts": 10,
				"allowremove": true
			}
		},
		"metrics": {
			"provider": "prometheus",
			"statsd": {
				"network": "udp",
				"address": "127.0.0.1:8125",
				"writeInterval": "10s",
				"prefix": "server"
			}
		}
	}
}
```        

#### Providing your own customizations when you create a CA

After you click **Create a CA** on the nodes tab and step through the CA configuration panels, you can click **Edit configuration** on the Summary panel to view and edit the `JSON`. Note that if you do not select any advanced options in the console, then those advanced configuration settings are not included in the `JSON`, but you can insert them yourself, using the elements provided in `JSON` above.

Alternatively, if you do check any of the advanced options when you configure the CA, those settings are included in the `JSON` on the Summary panel and can be additionally customized.

Any edits that you make to the `JSON` override what was specified in the console UI. For example, if you specified a `Maximum enrollments` value of `10` in the console, but then provided the `maxenrollments` value of `-1` in the `JSON`, then the value in the`JSON` file is used when the CA is deployed. It is the settings that are visible in the `JSON` on the **Summary page** that are used when the CA is deployed.

Here is an example of the minimum required `JSON` parameters for any override when a CA is deployed.

```json
{
	"ca": {
	  "csr": {
		"cn": "<COMMONNAME>",
		"keyrequest": {
		  "algo": "ecdsa",
		  "size": 256
		},
		"names": [
		  {
			"C": "US",
			"ST": "North Carolina",
			"L": "Location",
			"O": "Hyperledger",
			"OU": "Fabric"
		  }
		],
		"hosts": [
		  "<HOSTNAME>"
		],
		"ca": {
		  "expiry": "131400h",
		  "pathlength": 1024
		}
	  },
	  "debug": false,
	  "registry": {
		"maxenrollments": -1,
		"identities": [
		  {
			"name": "<ADMIN_ID>",
			"pass": "<ADMIN_PWD>",
			"type": "client",
			"attrs": {
			  "hf.Registrar.Roles": "*",
			  "hf.Registrar.DelegateRoles": "*",
			  "hf.Revoker": true,
			  "hf.IntermediateCA": true,
			  "hf.GenCRL": true,
			  "hf.Registrar.Attributes": "*",
			  "hf.AffiliationMgr": true
			}
		  }
		]
	  },
		"affiliations": {
			"fabric": []
    	},
	}
}
```

You can insert additional fields or modify the `JSON` that is visible in the **Configuration JSON** box. For example, if you want to deploy a CA and override only the `csr names` values, you can edit the values in the `JSON`. But if you wanted to change the value of the `passwordattempts` field you would insert it into the `JSON` as follows:

```json
{
	"ca": {
	  "csr": {
		"cn": "<COMMONNAME>",
		"keyrequest": {
		  "algo": "ecdsa",
		  "size": 256
		},
		"names": [
		  {
			"C": "US",
			"ST": "North Carolina",
			"L": "Location",
			"O": "Hyperledger",
			"OU": "Fabric"
		  }
		],
		"hosts": [
		  "<HOSTNAME>"
		],
		"ca": {
		  "expiry": "131400h",
		  "pathlength": 1024
		}
	  },
	  "debug": false,
	  "registry": {
		"maxenrollments": -1,
		"identities": [
		  {
			"name": "<ADMIN_ID>",
			"pass": "<ADMIN_PWD>",
			"type": "client",
			"attrs": {
			  "hf.Registrar.Roles": "*",
			  "hf.Registrar.DelegateRoles": "*",
			  "hf.Revoker": true,
			  "hf.IntermediateCA": true,
			  "hf.GenCRL": true,
			  "hf.Registrar.Attributes": "*",
			  "hf.AffiliationMgr": true
			}
		  }
		]
		},
		"affiliations": {
			"fabric": []
    },
		"cfg": {
			"identities": {
				"passwordattempts": 3
			}
		}
	}
}
```

This snippet is provided only as an example of what the modified `JSON` would resemble. **Do not copy and edit this snippet**, as it does not contain the custom values for your configuration. Rather, edit the `JSON` from your console **Configuration JSON** box because it includes the settings for your node.

#### Considerations when including certificates

Unlike in the Fabric CA configuration file, where specification of a `certfile` includes a file path and certificate name, in this case you need to base64 encode the certificate file (or a concatenated chain of certificates) and then paste the resulting string into the CA `JSON` override. To convert a certificate file into base64 format, run the following command:

```
export FLAG=$(if [ "$(uname -s)" == "Linux" ]; then echo "-w 0"; else echo "-b 0"; fi)
cat <CERT_FILE> | base64 $FLAG
```

- Replace `<CERT_FILE>` with the name of the file that you need to encode.

Paste the resulting string into the CA `JSON` override.

#### Modifying CA settings after deployment

After a CA is deployed, a subset of the fields can be updated as well. Click the CA tile in the console and then the **Settings** icon to open a side panel. Click **Edit configuration JSON (Advanced)** to override the CA settings. The `JSON` in the **Current configuration** box contains the current settings for the CA. **Not all of these values can be overridden.**

Only the following fields can be updated:

```json
{
	"ca":{
		"cors": {
			"enabled": false,
			"origins": [
				"*"
			]
		},
		"debug": false,
		"crlsizelimit": 512000,
		"tls": {
			"certfile": null,
			"keyfile": null,
			"clientauth": {
				"type": "noclientcert",
				"certfiles": null
			}
		},
		"crl": {
			"expiry": "24h"
		},
		"db": {
			"type": "sqlite3",
			"datasource": "fabric-ca-server.db",
			"tls": {
				"enabled": false,
				"certfiles": null,
				"client": {
					"certfile": null,
					"keyfile": null
				}
			}
		},
		"csr": {
			"cn": "ca",
			"keyrequest": {
				"algo": "ecdsa",
				"size": 256
			},
			"names": [
				{
					"C": "US",
					"ST": "North Carolina",
					"L": "Location",
					"O": "Hyperledger",
					"OU": "Fabric"
				}
			],
			"hosts": [
				"<<<MYHOST>>>",
				"localhost"
			],
			"ca": {
				"expiry": "131400h",
				"pathlength": "<<<PATHLENGTH>>>"
			}
		},
		"idemix": {
			"rhpoolsize": 1000,
			"nonceexpiration": "15s",
			"noncesweepinterval": "15m"
		},
		"bccsp": {
			"default": "SW",
			"sw": {
				"hash": "SHA2",
				"security": 256,
				"filekeystore": null
			}
		},
		"cfg": {
			"identities": {
				"passwordattempts": 10,
				"allowremove": true
			}
		},
		"metrics": {
			"provider": "prometheus",
			"statsd": {
				"network": "udp",
				"address": "127.0.0.1:8125",
				"writeInterval": "10s",
				"prefix": "server"
			}
		}
	}
}
```

Paste the modified `JSON` that contains only the parameters that you want to update into the **Configuration JSON** box. For example, if you only needed to update the value for the `passwordattempts` field you would paste in this `JSON`:

```json
{
	"ca": {
		"cfg": {
			"identities": {
				"passwordattempts": 3
			}
		}
	}
}
```

If you need to enable deletion of registered users from a CA you would insert `"allowremove": true` into the `JSON` as follows:

```json
{
  "ca": {
    "cfg": {
    "identities": {
      "passwordattempts": 10,
      "allowremove": true
      }
    }
  }
}
```

>**_NOTE:_** The ability to update a CA configuration is not available for CAs that have been imported into the console.

## Peer deployment

When you deploy a peer, the following advanced deployment options are available:
* State database - Choose the database for your peers where ledger transactions are stored.
* Deployment zone selection - In a multi-zone cluster, select the zone where the node is deployed.
* External Certificate Authority configuration - Use certificates from a third-party CA.
* Resource allocation - Configure the CPU, memory, and storage for the node.
* Peer configuration override - Choose this option when you want to override peer configuration.

>**_IMPORTANT:_** You also have the ability to choose the version of Fabric that will be used to deploy your peer. It is recommended to always choose the latest version, as this version will have the latest fixes and improvements. However, note that you might have to re-vendor your smart contract if it was written in Golang. For more information, see [write and package your smart contract](../smart_contracts/console-smart-contracts-v2.md).


### State database

During the creation of a peer, it is possible to choose between two state database options: **LevelDB** and **CouchDB**. Recall that the state database keeps the latest value of all of the keys (assets) stored on the fabric. For example, if a car has been owned by Varad and then Joe, the value of the key that represents the ownership of the car would be "Joe".

Because it can be useful to perform rich queries against the state database (for example, searching for every red car with an automatic transmission that is owned by Joe), users will often choose a Couch database, which stores data as `JSON` objects. LevelDB, on the other hand, only stores information as key-value pairs, and therefore cannot be queried in this way. Users must keep track of block numbers and query the blocks directly (or within a range of block numbers), and parse the information. However, LevelDB is also faster than CouchDB, though it does not support database indexing (which helps performance).

This support for rich queries is why **CouchDB is the default database** unless a user selects the **State database selection** box during the process of adding a peer selects **LevelDB** on the subsequent tab.

>**_IMPORTANT:_** Because the data is modeled differently in a Couch database than in a Level database, **the peers in a channel must all use the same database type**. If data written for a Level database is rejected by a Couch database (which can happen, as CouchDB keys have certain formatting restrictions as compared to LevelDB keys), a state fork would be created between the two ledgers. Therefore, **take extreme care when joining a channel to know the database type supported by the channel**. It might be necessary to create a new peer that uses the appropriate database type and join it to the channel. Note that the database type cannot be changed after a peer has been deployed.

### Deployment zone selection

If your cluster is configured across multiple zones, when you deploy a peer you have the option of selecting which zone the peer is deployed to. Check the Advanced deployment option that is labeled **Deployment zone selection** to see the list of zones that is currently configured for your cluster.

If you are deploying a redundant node (that is, another peer when you already have one), it is a best practice to deploy this node into a different zone. You can determine the zone that the other node was deployed to by opening the tile of the node and looking under the Node location. Alternatively, you can use the APIs to deploy a peer or orderer to a specific zone. 

If **multizone-capable storage** is configured for your cluster, when a zone failure occurs, the nodes can come up in another zone with their associated storage intact, ensuring high availability of the node. In order to leverage this capability with the Fabric  Operatons Console, you need to configure your cluster to use **SDS (Portworx)** storage. And when you deploy a peer, select the advanced deployment option labeled **Deployment zone selection** and then select **Across all zones**. 

### Sizing a peer during creation

The peer pod has four containers that can be adjusted:

- **Peer container**: Encapsulates the internal peer processes (such as validating transactions) and the fabric (in other words, the transaction history) for all of the channels it belongs to. Note that the storage of the peer also includes the smart contracts that are installed on the peer.
- **CouchDB container**: Where the state databases of the peer are stored. Recall that each channel has a distinct state database.
- **Smart contract container**: Recall that during a transaction, the relevant smart contract is "invoked" (in other words, run). Note that all smart contracts that you install on the peer will run in a separate container inside your peer pod, which is known as a Docker-in-Docker container.
- **Smart contract launcher container**: Used to launch a separate pod for each smart contract, eliminating the need for a Docker-in-Docker container in the peer pod. Note that the smart contract launcher container is not where smart contracts actually run, and is therefore given a smaller default resource than the "smart contracts" container that used to be deployed along with a peer. It only exists to help create the pods where smart contracts run. You must make your own allowances in your deployment for the containers for smart contracts, as the pods spun up by the smart contract launcher are not bound by strict resource limitations. The pod will use as many resources as it needs depending on the size of a smart contract and the processing load it encounters. 

>**_IMPORTANT:_** Note that a separate pod will be created for each smart contract that is installed on each peer, even if you have multiple peers on the same channel that have all installed the same smart contract. So if you have three peers on a channel, and install a smart contract on each one, you will have three smart contract pods running. However, if these three peers are on more than one channel using the **exact same** smart contract, you will still only have three pods running. These smart contract pods will not be deleted if you delete the peer. You must delete them **separately**.


The peer also includes a gRPC web proxy container, you cannot adjust the compute for this container.

It is recommended to use the defaults for these peer containers and adjust them later when it becomes apparent how they are being utilized by your use case.

| Resources | Condition to increase |
|-----------------|-----------------------|
| **Peer container CPU and memory** | When you anticipate a high transaction throughput right away. |
| **Peer storage** | When you anticipate installing many smart contracts on this peer and to join it to many channels. Recall that this storage will also be used to store smart contracts from all channels the peer is joined to. Keep in mind that we estimate a "small" transaction to be in the range of 10,000 bytes (10k). As the default storage is 100G, this means that as many as 10 million total transactions will fit in peer storage before it will need to be expanded (as a practical matter, the maximum number will be less than this, as transactions can vary in size and the number does not include smart contracts). While 100G might therefore seem like much more storage than is needed, keep in mind that storage is relatively inexpensive, and that the process for increasing it is more difficult (require command line) than increasing CPU or memory. |
| **CouchDB container CPU and memory** | When you anticipate a high volume of queries against a large state database. This effect can be mitigated somewhat by using <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/couchdb_as_state_database.html#couchdb-indexes" target="_blank">indexes <img src="images/external.png" width="10" alt="external" valign="middle"></a>. Nevertheless, high volumes might strain CouchDB, which can lead to query and transaction timeouts. |
| **CouchDB (ledger data) storage** | When you expect high throughput on many channels and don't plan to use indexes. However, like the peer storage, the default CouchDB storage is 100G, which is significant. |
| **Smart contract container CPU and memory** | When you expect a high throughput on a channel, especially in cases where multiple smart contracts will be invoked at the same time. You should also increase the resource allocation of your peers if your smart contracts are written in JavaScript or TypeScript.|
| **Smart contract launcher container CPU and memory** | Because the smart contract launcher container streams logs from smart contracts back to a peer, the more smart contracts are running the greater the load on the smart contract launcher. |

>**_IMPORTANT:_** The Fabric  Operatons Console supports smart contracts that are written in JavaScript, TypeScript, Java, and Go. When you are allocating resources to your peer node, it is important to note that JavaScript and TypeScript smart contracts require more resources than contracts written in Go. The default storage allocation for the peer container is sufficient for most smart contracts. However, when you instantiate a smart contract, you should actively monitor the resources consumed by the pod that contains the smart contract in your cluster to ensure that adequate resources are available.


### Customizing a peer configuration

In addition to the peer settings that are provided in the console when you provision a peer, you have the extra option to override some of the peer settings. If you are familiar with Hyperledger Fabric, these settings are configured in the peer configuration `core.yaml` file when a peer is deployed. The Fabric  Operatons Console configures these fields for you using default settings and many of these fields are not exposed by the console. But the console also includes a panel where you can provide a `JSON` to override a set of these parameters before a peer is deployed. You can find the peer configuration `JSON` and an example of how to use the configuration override to customize your deployment in the sections below.

#### Why would I want to override a peer configuration?

A common use case would be to override some of the default timeouts, or peer private data settings. Additionally you can customize the gossip configuration. These are just a few suggestions of customizations you might want to make, but the full list of available overrides is provided below. This list contains all of fields that can be overridden via editing the `JSON` when a peer is deployed from the console. For more information about what each field is used for you can refer to the <a href="https://github.com/hyperledger/fabric/blob/release-2.2/sampleconfig/core.yaml" target=_blank">Fabric sample peer configuration file <img src="images/external.png" width="10" alt="external" valign="middle"></a> options.

```json
{
	"peer": {
		"id": "jdoe",
		"networkId": "dev",
		"keepalive": {
			"minInterval": "60s",
			"client": {
				"interval": "60s",
				"timeout": "20s"
			},
			"deliveryClient": {
				"interval": "60s",
				"timeout": "20s"
			}
		},
		"gossip": {
			"useLeaderElection": true,
			"orgLeader": false,
			"membershipTrackerInterval": "5s",
			"maxBlockCountToStore": 100,
			"maxPropagationBurstLatency": "10ms",
			"maxPropagationBurstSize": 10,
			"propagateIterations": 1,
			"propagatePeerNum": 3,
			"pullInterval": "4s",
			"pullPeerNum": 3,
			"requestStateInfoInterval": "4s",
			"publishStateInfoInterval": "4s",
			"stateInfoRetentionInterval": null,
			"publishCertPeriod": "10s",
			"skipBlockVerification": false,
			"dialTimeout": "3s",
			"connTimeout": "2s",
			"recvBuffSize": 20,
			"sendBuffSize": 200,
			"digestWaitTime": "1s",
			"requestWaitTime": "1500ms",
			"responseWaitTime": "2s",
			"aliveTimeInterval": "5s",
			"aliveExpirationTimeout": "25s",
			"reconnectInterval": "25s",
			"election": {
				"startupGracePeriod": "15s",
				"membershipSampleInterval": "1s",
				"leaderAliveThreshold": "10s",
				"leaderElectionDuration": "5s"
			},
			"pvtData": {
				"pullRetryThreshold": "60s",
				"transientstoreMaxBlockRetention": 1000,
				"pushAckTimeout": "3s",
				"btlPullMargin": 10,
				"reconcileBatchSize": 10,
				"reconcileSleepInterval": "1m",
				"reconciliationEnabled": true,
				"skipPullingInvalidTransactionsDuringCommit": false
			},
			"state": {
				"enabled": true,
				"checkInterval": "10s",
				"responseTimeout": "3s",
				"batchSize": 10,
				"blockBufferSize": 100,
				"maxRetries": 3
			}
		},
		"authentication": {
			"timewindow": "15m"
		},
		"BCCSP": {
			"Default": "SW",
			"SW": {
				"Hash": "SHA2",
				"Security": 256,
				"FileKeyStore": {
					"KeyStore": null
				}
			},
			"PKCS11": {
				"Library": null,
				"Label": null,
				"Pin": null,
				"Hash": null,
				"Security": null,
				"FileKeyStore": {
					"KeyStore": null
				}
			}
		},
		"client": {
			"connTimeout": "3s"
		},
		"deliveryclient": {
			"reconnectTotalTimeThreshold": "3600s",
			"connTimeout": "3s",
			"reConnectBackoffThreshold": "3600s",
			"addressOverrides": null
		},
		"adminService": null,
		"validatorPoolSize": null,
		"discovery": {
			"enabled": true,
			"authCacheEnabled": true,
			"authCacheMaxSize": 1000,
			"authCachePurgeRetentionRatio": 0.75,
			"orgMembersAllowedAccess": false
		}
	},
	"chaincode": {
		"startuptimeout": "300s",
		"executetimeout": "30s",
		"logging": {
			"level": "info",
			"shim": "warning",
			"format": "%{color}%{time:2006-01-02 15:04:05.000 MST} [%{module}] %{shortfunc} -> %{level:.4s} %{id:03x}%{color:reset} %{message}"
		}
	},
	"metrics": {
		"provider": "disabled",
		"statsd": {
			"network": "udp",
			"address": "127.0.0.1:8125",
			"writeInterval": "10s",
			"prefix": null
		}
	}
}
```        

#### Providing your own customizations when you create a peer

After you click **Create a peer** on the nodes tab and step through the peer configuration panels, you can click **Edit configuration** on the Summary panel to view and edit the `JSON`. Note that if you do not select any advanced options in the console, then the generated `JSON` is empty, but you can still insert your own customizations.

Alternatively, if you do check any of the advanced options when you configure the peer, those settings are included in the `JSON` on the Summary panel and can be additionally customized with other fields as needed. Any edits that you make will override what was specified in the console. For example, if you selected to use a LevelDB as the state database, but then overrode the setting to use CouchDB as the state database in the `JSON`, then the CouchDB database settings would be used when the peer is deployed. The override settings that are visible in the `JSON` on the **Summary page** are what is used when the peer is deployed.

You don't need to include the entire set of available parameters in the `JSON`, only the advanced deployment options that you selected in the console along with the parameters that you want to override. For example, if you want to deploy a peer and override the `chaincode startup timeout` and specify a different port for the `statsd address`, you would paste in the following `JSON`:

```json
{
  "peer": {
    "chaincode": {
      "startuptimeout": "600s"
    }
  },
  "metrics": {
    "statsd": {
      "address": "127.0.0.1:9443"
    }
  }
}
```

#### Modifying peer settings after deployment

After a peer is deployed, a subset of the fields can be updated as well. Click the peer tile in the console and then the **Settings** icon to open a side panel. Click **Edit configuration JSON (Advanced)** to open the panel where you can override the peer settings. The `JSON` in the **Current configuration** box contains the current settings for the peer. **Not all of these values can be overridden after the peer is deployed.**  A subset of these parameters can be overridden by pasting a `JSON` with the overrides into the **Configuration JSON** box. Again, you don't need to include the entire set of parameters from the **Current configuration** `JSON`, only paste the parameters you want to override into the **Configuration JSON** box.

The following subset of parameters can be overridden after a peer is deployed:

```json
{
	"peer": {
		"id": "jdoe",
		"networkId": "dev",
		"keepalive": {
			"minInterval": "60s",
			"client": {
				"interval": "60s",
				"timeout": "20s"
			},
			"deliveryClient": {
				"interval": "60s",
				"timeout": "20s"
			}
		},
		"gossip": {
			"useLeaderElection": true,
			"orgLeader": false,
			"membershipTrackerInterval": "5s",
			"maxBlockCountToStore": 100,
			"maxPropagationBurstLatency": "10ms",
			"maxPropagationBurstSize": 10,
			"propagateIterations": 1,
			"propagatePeerNum": 3,
			"pullInterval": "4s",
			"pullPeerNum": 3,
			"requestStateInfoInterval": "4s",
			"publishStateInfoInterval": "4s",
			"stateInfoRetentionInterval": null,
			"publishCertPeriod": "10s",
			"skipBlockVerification": false,
			"dialTimeout": "3s",
			"connTimeout": "2s",
			"recvBuffSize": 20,
			"sendBuffSize": 200,
			"digestWaitTime": "1s",
			"requestWaitTime": "1500ms",
			"responseWaitTime": "2s",
			"aliveTimeInterval": "5s",
			"aliveExpirationTimeout": "25s",
			"reconnectInterval": "25s",
			"election": {
				"startupGracePeriod": "15s",
				"membershipSampleInterval": "1s",
				"leaderAliveThreshold": "10s",
				"leaderElectionDuration": "5s"
			},
			"pvtData": {
				"pullRetryThreshold": "60s",
				"transientstoreMaxBlockRetention": 1000,
				"pushAckTimeout": "3s",
				"btlPullMargin": 10,
				"reconcileBatchSize": 10,
				"reconcileSleepInterval": "1m",
				"reconciliationEnabled": true,
				"skipPullingInvalidTransactionsDuringCommit": false
			},
			"state": {
				"enabled": true,
				"checkInterval": "10s",
				"responseTimeout": "3s",
				"batchSize": 10,
				"blockBufferSize": 100,
				"maxRetries": 3
			}
		},
		"authentication": {
			"timewindow": "15m"
		},
		"client": {
			"connTimeout": "3s"
		},
		"deliveryclient": {
			"reconnectTotalTimeThreshold": "3600s",
			"connTimeout": "3s",
			"reConnectBackoffThreshold": "3600s",
			"addressOverrides": null
		},
		"adminService": null,
		"validatorPoolSize": null,
		"discovery": {
			"enabled": true,
			"authCacheEnabled": true,
			"authCacheMaxSize": 1000,
			"authCachePurgeRetentionRatio": 0.75,
			"orgMembersAllowedAccess": false
		}
	},
	"chaincode": {
		"startuptimeout": "300s",
		"executetimeout": "30s",
		"logging": {
			"level": "info",
			"shim": "warning",
			"format": "%{color}%{time:2006-01-02 15:04:05.000 MST} [%{module}] %{shortfunc} -> %{level:.4s} %{id:03x}%{color:reset} %{message}"
		}
	},
	"metrics": {
		"provider": "disabled",
		"statsd": {
			"network": "udp",
			"address": "127.0.0.1:8125",
			"writeInterval": "10s",
			"prefix": null
		}
	}
}
```

Paste the modified `JSON` that contains only the parameters that you want to update into the **Configuration JSON** box. For example, if you only need to update the value for the `executetimeout` field you would paste this `JSON` into the **Configuration JSON** box:

```json
{
	"chaincode": {
		"executetimeout": "30s"
	}
}
```

>**_NOTE:_** The ability to update override settings for a peer configuration is not available for peers that have been imported into the console.

## Ordering node deployment

When you deploy an ordering node, the following advanced deployment options are available:
* Number of ordering nodes - Decide how many ordering nodes are needed.
* Deployment zone selection - In a multi-zone cluster, select the zone where the node is deployed.
* External Certificate Authority configuration - Use certificates from a third-party CA.
* Resource allocation - Configure the CPU, memory, and storage for the node.
* Orderer configuration override - Choose this option when you want to override ordering node configuration.

>**_IMPORTANT:_** You also have the ability to choose the version of Fabric that will be used to deploy your ordering nodes. It is recommended to always choose the latest version, as this version will have the latest fixes and improvements. Note that it is currently not possible to enable any v2.0 <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.0/capabilities_concept.html" target="_blank">Fabric capabilities <img src="images/external.png" width="10" alt="external" valign="middle"></a>.

### Number of ordering nodes

In Raft, a **majority of the total number of nodes** must be available for the ordering service to function (this is known as achieving a "quorum" of nodes). In other words, if you have one node, you need that node available to have a quorum, because the majority of one is one. While satisfying the quorum makes sure that the ordering service is functioning, production networks also have to think about deployment configurations that are highly available (in other words, configurations in which the loss of a certain number of nodes can be tolerated by the system). Typically, this means tolerating the loss of two nodes: one node going down during a normal maintenance cycle, and another going down for any other reason (such as a power outage or error).

This is why, by default, the console offers two options: one node or five nodes. Recall that the majority of five is three. This means that in a five node configuration, the loss of two nodes can be tolerated. Users who know that they will be deploying a production solution should therefore choose the five node option.

However many nodes a user chooses to deploy, they have the ability to add more nodes to their ordering service.

### Deployment zone selection

If your cluster is configured across multiple zones, when you deploy an ordering node you have the option of selecting which zone the node is deployed to. Check the Advanced deployment option that is labeled **Deployment zone selection** to see the list of zones that is currently configured for your cluster.

For a five node ordering service, these nodes will be distributed into multiple zones by default, depending on the relative space available in each zone. You also have the ability to distribute a five node ordering service yourself by clearing the default option to have the zones that are chosen for you and distributing these nodes into the zones you have available. You can check which zone a node was deployed to by opening the tile of the node and looking under the Node location. Alternatively, you can use the APIs to deploy an ordering node to a specific zone. 

If **multizone-capable storage** is configured for your cluster when a zone failure occurs, the nodes can come up in another zone, with their associated storage intact, ensuring high availability of the node. In order to leverage this capability with the Fabric  Operatons Console, you need to configure your cluster to use **SDS (Portworx)** storage. And when you deploy an ordering service or an ordering node, select the advanced deployment option labeled **Deployment zone selection** and then select **Across all zones**. 

### Sizing an ordering node during creation

Because ordering nodes do not maintain a copy of the state DB, they require fewer containers than peers do. However, they do host the fabric (the transaction history) because the fabric is where the channel configuration is stored, and the ordering service must know the latest channel configuration to perform its role.

Similar to the CA, an ordering node has only one associated container that we can adjust (if you are deploying a five-node ordering service, you will have five separate ordering node containers, as well as five separate gRPC containers):

* **Ordering node container**: Encapsulates the internal orderer processes (such as validating transactions) and the fabric for all of the channels it hosts.

It is recommended to use the defaults for the ordering node container and adjust them later as it becomes apparent how they are being utilized.

| Resources | Condition to increase |
|-----------------|-----------------------|
| **Ordering node container CPU and memory** | When you anticipate a high transaction throughput right away. |
| **Ordering node storage** | When you anticipate that this ordering node will be part of an ordering service on many channels. Recall that the ordering service keeps a copy of the fabric for every channel they host. The default storage of an ordering node is 100G, same as the container for the peer itself. |

If you plan to deploy a five node Raft ordering service, note that the total of your deployment will increase by a factor of five, a total of 1.75 CPU, 3.5 GB of memory, and 500 GB of storage for the five Raft nodes. A 4 CPU single worker node cluster is the minimum recommended to allow enough CPU for the ordering service cluster and any other nodes you deploy.

>**_IMPORTANT:_**  If an ordering service is overstressed, it might hit timeouts and start dropping transactions, requiring transactions to be resubmitted. This causes much greater harm to a network than a single peer struggling to keep up. In a Raft ordering service configuration, an overstressed leader node might stop sending heartbeat messages, triggering a leader election, and a temporary cessation of transaction ordering. Likewise, a follower node might miss messages and attempt to trigger a leader election where none is needed.

### Customizing an ordering service configuration

In addition to the ordering node settings that are provided in the console when you provision an ordering node, you have the option to override some of the default settings. If you are familiar with Hyperledger Fabric, these settings are configured in the `orderer.yaml` file when an ordering node is deployed. The Fabric  Operatons Console configures these fields for you using default settings so many of these fields are not exposed by the console. You can find the orderer configuration `JSON` and an example of how to use the configuration override to customize your deployment in the sections below.

#### Why would I want to override an ordering service configuration?

The need to customize the ordering node configuration is less common than the peer or CA. A common use case could be to override default timeouts or the default HSM settings. This list contains all of fields that can be overridden by editing the `JSON` when an ordering node is deployed from the console. For more information about what each field is used for you can refer to the <a href="https://github.com/hyperledger/fabric/blob/release-2.2/sampleconfig/orderer.yaml" target="_blank">Fabric sample orderer configuration file <img src="images/external.png" width="10" alt="external" valign="middle"></a> options.

```json
{
	"General": {
		"Keepalive": {
			"ServerMinInterval": "60s",
			"ServerInterval": "7200s",
			"ServerTimeout": "20s"
		},
		"BCCSP": {
			"Default": "SW",
			"SW": {
				"Hash": "SHA2",
				"Security": 256,
				"FileKeyStore": {
					"KeyStore": null
				}
			}
		},
		"Authentication": {
			"TimeWindow": "15m"
		}
	},
	"Debug": {
		"BroadcastTraceDir": null,
		"DeliverTraceDir": null
	},
	"Metrics": {
		"Provider": "disabled",
		"Statsd": {
			"Network": "udp",
			"Address": "127.0.0.1:8125",
			"WriteInterval": "30s",
			"Prefix": null
		}
	}
}
```        

#### Providing your own customizations when you create an ordering service

After you click **Add ordering service** on the nodes tab and step through the ordering service configuration panels, you can click **Edit configuration JSON** on the Summary panel to view and edit the `JSON`. Note that if you do not select any advanced options in the console, then the generated `JSON` is empty, but you can insert your own customizations.

Alternatively, if you do check any of the advanced options when you configure the ordering service, those settings are included in the `JSON` on the Summary panel. Any edits that you make to the`JSON` override what was specified in the console. You can insert additional fields or modify the generated `JSON`. The overrides that are visible in the `JSON` on the **Summary page** are what is used to override the default settings when the ordering node is deployed. **If you are deploying multiple ordering nodes, then the overrides are applied to each ordering node.**

You don't need to include the entire set of available parameters in the `JSON`, only any advanced deployment options that you selected in the console along with the parameters that you want to override. For example, if did not select any advanced options in the console and you want to deploy the ordering nodes with your own value for the  `ServerTimeout` and the `statsd address` port, you would paste the following `JSON` into the **Configuration JSON** box:

```json
{
	"General": {
		"Keepalive": {
			"ServerTimeout": "60s"
		}
	},
	"metrics": {
		"statsd": {
			"address": "127.0.0.1:9446"
		}
	}
}
```

#### Modifying ordering node settings after deployment>**_NOTE:_** 

After an ordering node is deployed, a subset of the fields can be updated as well. Click the ordering service tile in the console and select the ordering node, then click the **Settings** icon to open a side panel where you can modify the `JSON`.  The `JSON` in the **Current configuration** box contains the current settings for the ordering node. **Not all of these values can be overridden after deployment.** Again, you don't need to include the entire set of parameters from the **Current configuration** `JSON`, only paste the parameters you want to override into the **Configuration JSON** box.

The following list of parameters can be updated:

```json
{
	"General": {
		"Keepalive": {
			"ServerMinInterval": "60s",
			"ServerInterval": "7200s",
			"ServerTimeout": "20s"
		},
		"Authentication": {
			"TimeWindow": "15m"
		}
	},
	"Debug": {
		"BroadcastTraceDir": null,
		"DeliverTraceDir": null
	},
	"Metrics": {
		"Provider": "disabled",
		"Statsd": {
			"Network": "udp",
			"Address": "127.0.0.1:8125",
			"WriteInterval": "30s",
			"Prefix": null
		}
	}
}
```

Paste the modified `JSON` that contains only the parameters that you want to update into the **Configuration JSON** box. For example, if you only needed to update the value for the `ServerTimeout` field you would paste this `JSON` into the **Configuration JSON** box:

```json
{
	"General": {
		"Keepalive": {
			"ServerTimeout": "20s"
		}
	}
}
```

>**_NOTE:_** The ability to update an ordering node configuration is not available for ordering nodes that have been imported into the console.




