#!/bin/bash
# ------------------------------------------------------------------------
# The names of our docker images are used in a few places.  Source this script to dump them into env so everyone has them.
# ------------------------------------------------------------------------

: "${DOCKER_PUSH_REGISTRY1:=$DOCKER_SRC_REGISTRY}"
: "${DOCKER_PUSH_REGISTRY2:=$DOCKER_SRC_REGISTRY}"
: "${COMMIT:=$(git rev-parse --short HEAD)}"
: "${GIT_TAG:=$(git describe | grep -v -)}"
: "${ARCH:=amd64}"
: "${BASEOS:=ubi8}"

IMAGE_NAME1=op-tools
IMAGE_NAME2=ibp-console

# Our Artifactory pipelines assume each architecture gets its own image repo, so add a toggle for this behavior
IMAGE_NAME2=$IMAGE_NAME2.$ARCH ## Software image
IMAGE_PUSH_NAME1=$DOCKER_PUSH_REGISTRY1/$IMAGE_NAME1
IMAGE_PUSH_NAME2=$DOCKER_PUSH_REGISTRY2/$IMAGE_NAME2

IMAGE_VERSIONED_TAG=$GIT_TAG
IMAGE_COMMIT_TAG=$COMMIT

IMAGE_VERSIONED_TAG1=$IMAGE_VERSIONED_TAG-$ARCH
IMAGE_COMMIT_TAG1=$IMAGE_COMMIT_TAG-$ARCH

IMAGE_VERSIONED_TAG2=$IMAGE_VERSIONED_TAG-$BASEOS
IMAGE_COMMIT_TAG2=$IMAGE_COMMIT_TAG-$BASEOS

export IMAGE_COMMIT_NAME1="$IMAGE_PUSH_NAME1:$IMAGE_COMMIT_TAG1"
export IMAGE_COMMIT_NAME2="$IMAGE_PUSH_NAME2:$IMAGE_COMMIT_TAG2"
if [[ -n $GIT_TAG ]]; then
  export IMAGE_VERSIONED_NAME1="$IMAGE_PUSH_NAME1:$IMAGE_VERSIONED_TAG1"
  export IMAGE_VERSIONED_NAME2="$IMAGE_PUSH_NAME2:$IMAGE_VERSIONED_TAG2"
fi

echo "IMAGE_COMMIT_NAME1:$IMAGE_COMMIT_NAME1"
echo "IMAGE_VERSIONED_NAME1:$IMAGE_VERSIONED_NAME1"
echo "IMAGE_COMMIT_NAME2:$IMAGE_COMMIT_NAME2"
echo "IMAGE_VERSIONED_NAME2:$IMAGE_VERSIONED_NAME2"
