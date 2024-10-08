# Fabric Operations Console

The console provides the following high level function:

- Ability to import and manage all Hyperledger Fabric Components from a single web console, no matter where they are located.
- Maintain complete control over identities, channels, and smart contracts.
- Join Peers to Channels and view channel membership as well as individual transactions and channel details.
- Register, view, delete, and re-enroll CA Users.
- View Ordering cluster and node information as well as view and modify consortium and channel membership.
- View and modify channel capabilities and ordering service parameters.
- Install and Instantiate chaincode.  Supports both 1.x and 2.x Lifecycle.
- View, Create, Import and Export Organizations and Identities.
- Role Based Access Control in UI to tightly control which Console users can perform which operations.

The console relies on [GRPC web](https://grpc.io/docs/platforms/web/) to allow GRPC based communication with Orderers and Peers via Node.js.  Management of Certificate Authorities is done via REST API and does not require a GRPC Web Instance.

For more Information see the [documentation for the current IBM production offerings](https://cloud.ibm.com/docs/blockchain-sw-252?topic=blockchain-sw-252-ibp-console-govern) which are driven by the code in this Lab proposal.

# High level architecture
![High level architecture](/docs/images/architecture_hl.png)

# Meetup Recordings
[Console Overview](https://youtu.be/ndrWBoBlTDM)

[AMA](https://youtu.be/HGThtz5A6S8)

[Manage orderers without system channel](https://youtu.be/qlR_56I3E7U)

# Running Fabric Operations Console

You can use the following steps to provision a network using Fabric test-network, add grpc-web proxy on that of that and import components into Console so that you can manage the test network.
## Prerequisites
* zip
* jq
* docker
* docker-compose (V2)
* Node.js v18 or higher
* _[WSL2](https://docs.microsoft.com/en-us/windows/wsl/install-win10) (Windows only)_

## Setup
Clone console

`git clone https://github.com/hyperledger-labs/fabric-operations-console`

`cd fabric-operations-console`

## Bring up a Fabric 2.2.3 network
You can find more information on the test network setup from here
https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html

`./scripts/setupNetwork.sh up`

## Bring up console
`./scripts/setupConsole.sh up`

## Create zip file
Run the following command to create a zip of the console JSONs to match the network setup above

`./scripts/createAssets.sh`

## Console setup
* Open browser to URL http://localhost:3000/
* Login with admin/password
* Change password

### Import components into console
* Switch to "Settings" page 
* Click "Import"
* Select zip file ./workarea/console_assets.zip

### Create Identities
* Switch to Nodes page and perform the following steps

#### ordererca
* Select CA "ordererca-local"
* Associate Identity
* Enter admin/adminpw for enroll id and secret
* Select the overflow menu (3 dots) against "ordererAdmin"
* Select "Enroll identity"
* Enter "ordererAdminpw" for Enroll secret
* Next
* Enter identity display name as "OrdererMSP Admin"
* Click "Add Identity to wallet"

#### org1ca
* Select CA "org1ca-local"
* Associate Identity
* Enter admin/adminpw for enroll id and secret
* Select the overflow menu (3 dots) against "org1admin"
* Select "Enroll identity"
* Enter "org1adminpw" for Enroll secret
* Next
* Enter identity display name as "Org1MSP Admin"
* Click "Add Identity to wallet"

#### org2ca
* Select CA "org2ca-local"
* Associate Identity
* Enter admin/adminpw for enroll id and secret
* Select the overflow menu (3 dots) against "org2admin"
* Select "Enroll identity"
* Enter "org2adminpw" for Enroll secret
* Next
* Enter identity display name as "Org2MSP Admin"
* Click "Add Identity to wallet"


### Associate Identity
* Switch to Nodes page and perform the following steps
* Select peer "org1_peer1 - local"
* Associate Identity
* Select "Org1MSP Admin"

* Select peer "org2_peer1 - local"
* Associate Identity
* Select "Org2MSP Admin"

* Select orderer "orderer_local"
* Associate Identity
* Select "OrdererMSP Admin"

## Enjoy!
You should be able to manage channels, Using 2.0 lifecycle to install, approve, commit smart contracts following the guide

## Bring down network

`./scripts/setupConsole.sh down`

`./scripts/setupNetwork.sh down`


## couchdb credentials (for console)
* URL - http://127.0.0.1:5985/_utils/
* Login - admin/password

# Configure Fabric Operations Console Wallet With Hashicorp Vault
The Fabric Operations Console wallet stores and manages the cryptographic materials that represent different entities and identities who interact on the Hyperledger Fabric network. By default, the wallet stores the crypto materials inside the browser's local store. If that is the preferred setup, no further configuration or action is needed to configure the wallet.

HashiCorp Vault is an open-source tool designed to manage secrets and protect sensitive data like certificates, tokens, passwords, etc. If you decide to use HashiCorp Vault to securely store and manage the cryptographic materials, you may configure the wallet to use HashiCorp Vault.

The configuration is a JSON file with the following structure:

```json
{
    "vaultEnginePath": "{% engine path %}",
    "authMethodPath": "{% user authentication path %}",
    "url": "{% Hashicorp Vault API url %}",
    "username": "{% user name %}",
    "password": "{% user password %}",
    "vaultPath": "{% folder path to store the crypto materials %}",
    "apiVersion": "v1"
}
```

The wallet requires a KV secrets engine path. You may create a new secrets engine dedicated to the console wallet. The configured user should be enabled with a username and password authentication method. The user should have a proper access policy to work with the configured secrets engine. You may configure the vault path variable to a convenient name. This path points to the root path under the configured secrets engine where your cryptographic materials will be stored and accessed by the wallet.

The properly configured JSON file should be accessible to the console at the following path:
```
/server/conf/vault/vault-config.json
```

You may consult the official [HashiCorp Vault documentation](https://developer.hashicorp.com/vault/docs) for detailed instructions on how to create and configure a HashiCorp Vault secrets engine, user, and respective authentication method and access policy.


You can transition from an operational Fabric Operations Console browser store wallet to the HashiCorp Vault wallet by first performing a bulk export of your existing identities. Be sure to complete this export before activating the HashiCorp Vault wallet in your console. Once the export is finished and the console is set up with the new wallet, you can then bulk import the identities into it. This process will ensure that the imported identities are stored in the new wallet. Similarly, the same method can be applied when moving from the HashiCorp Vault wallet to a local browser store-based wallet.


# Developing Fabric Operations Console
This repository is managed using [Lerna](https://github.com/lerna/lerna).

It contains the following applications:

- **packages/apollo**: Frontend React.js for the console
- **packages/athena**: Backend server for the console
- **packages/stitch**:


To run commands in this repository, install lerna:
```sh
npm install -g lerna
```

For more information, see the documentation at: https://lerna.js.org/

## Install

```sh
lerna bootstrap
```

_Note: You can use `lerna clean && lerna bootstrap` to delete existing `node_modules` before lerna runs `npm install`._

## Usage


<!-- ### Running
```sh
lerna ...
``` -->

### Developing Athena

Builds Apollo and starts the file watcher for Athena.

Before running, ensure that you have the necessary local env files in the `packages/athena/env` directory. See the [athena readme](https://github.com/hyperledger-labs/fabric-operations-console/tree/main/packages/athena#acquiring-a-deployer-backend) for all the details on what these files should contain.

```sh
lerna run dev:athena
```

### Developing Apollo

Starts Apollo and Athena in dev mode. Apollo proxies its backend requests to Athena.

```sh
lerna run build_all
lerna run dev:apollo
```

_Note: even though this command is for running Apollo in dev mode, Athena still needs a production build of Apollo to start. If this command fails, it's likely because there is no Apollo build present._

## Run tests

```sh
lerna run test
```

## Build your own docker images (for console and grpc-web proxy)
Ensure that the `docker` has enough resources to be able to build the images. We recommend 2 CPUs and 4 GB RAM available to build.

`./scripts/buildImages.sh`

If you do not have enough memory allocated to docker, the following command will fail with out of memory error similar to the below.

```
#16 109.5 The build failed because the process exited too early.
This probably means the system ran out of memory or someone called `kill -9` on the process.
```
___

## FAQ / Need Help?
Check out common error messages, fixes, and other questions in our [FAQ](./FAQ.md).

## APIs
Check out our [api doc](./docs/apis.md) for APIs offered by the Console.
