# Fabric-Deployer
Fabric Deployer is an api layer responsible for providing most of the backend functionality for Fabric Operations Console UI.

More details about the apis [here](./docs/v3_apis.md) and the sample responses [here](./docs/v3_responses/)

### Fabric Deployer Development

#### Build the Deployer

```shell
make build
```

```shell
# Build ghcr.io/ibm-blockchain/fabric-deployer:latest-amd64
make image
```

#### Unit Tests and other checks

```shell
make test
```


#### Commit Practices
Please refer this section for [contribution](./docs/contributing.md) and [command practices](https://github.com/hyperledger-labs/fabric-operator/blob/main/docs/DEVELOPING.md#commit-practices)