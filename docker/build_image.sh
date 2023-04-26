#!/bin/bash

IMAGE_BUILD_NAME=fabric-console:latest
# Info about the build is saved in tags on the docker image
COMMIT=$(git rev-parse --short HEAD)
GIT_TAG=$(git describe --tags)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives
echo "Found tag $GIT_TAG"

docker build \
	-t ${IMAGE_BUILD_NAME} \
	--build-arg BUILD_ID=${COMMIT} \
	--build-arg BUILD_DATE=${BUILD_DATE} \
	--build-arg CONSOLE_TAG=${GIT_TAG} \
	--pull -f ${SRC_DIR}/console/Dockerfile ${SRC_DIR}/../packages/.

docker tag ${IMAGE_BUILD_NAME} ghcr.io/hyperledger-labs/fabric-console:latest
if [[ -n $GIT_TAG ]]; then
	echo "Creating tagged image $GIT_TAG:"
	docker tag ${IMAGE_BUILD_NAME} ghcr.io/hyperledger-labs/fabric-console:${GIT_TAG}
fi
