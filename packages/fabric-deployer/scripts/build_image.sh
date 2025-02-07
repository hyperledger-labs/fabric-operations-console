#!/bin/bash -xe

## clone fabric-deployer repo from opensource
git clone https://github.com/hyperledger-labs/fabric-operations-console.git --depth 1 --branch ${TAG}
cp -r ./fabric-operations-console/packages/fabric-deployer .
cd fabric-deployer
go build -o /tmp/build/_output/bin/deployer .
