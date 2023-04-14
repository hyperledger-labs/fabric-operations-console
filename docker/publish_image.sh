#!/bin/bash
IMAGE_BUILD_NAME=fabric-console:latest

# Info about the build is saved in tags on the docker image
GIT_TAG=$(git describe --tags)
echo "Found tag $GIT_TAG"

# Push the images
echo "Pushing 'latest' image:"
echo ${GITHUB_TOKEN} | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
docker push ghcr.io/hyperledger-labs/fabric-console:latest

# -n means if GIT_TAG's length is greater than 0
if [[ -n $GIT_TAG ]]; then
	echo "Pushing tagged image $GIT_TAG:"
	docker push ghcr.io/hyperledger-labs/fabric-console:${GIT_TAG}
fi
