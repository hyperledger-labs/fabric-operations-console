#!/bin/bash
IMAGE_BUILD_NAME=fabric-console:latest
# Info about the build is saved in tags on the docker image
GIT_TAG=$(git describe | grep -v -)

echo ${GITHUB_TOKEN} | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
docker push ghcr.io/hyperledger-labs/fabric-console:latest
if [[ -n $GIT_TAG ]]; then
	docker push ghcr.io/hyperledger-labs/fabric-console:${GIT_TAG}
fi
