#!/bin/bash
# ------------------------------------------------------------------------
# The names of our docker images are used in a few places.  Source this script to dump them into env so everyone has them.
# ------------------------------------------------------------------------
set -ev

: "${DOCKER_PUSH_REGISTRY:=$DOCKER_SRC_REGISTRY}"
: "${GIT_TAG:=$(git describe | grep -v -)}"
: "${ARCH:=amd64}"
: "${BASEOS:=ubi8}"
: "${IMAGE_NAME:=ibp-console}"
export COMMIT=$APOLLO_COMMIT

IMAGE_PUSH_NAME=$DOCKER_PUSH_REGISTRY/$IMAGE_NAME/apollo-dev

IMAGE_VERSIONED_TAG=$GIT_TAG-$ARCH
IMAGE_VERSIONED_TAG=$IMAGE_VERSIONED_TAG-$ARCH
export IMAGE_COMMIT_TAG=$COMMIT-$TRAVIS_BUILD_ID-$ARCH


export IMAGE_COMMIT_NAME="$IMAGE_PUSH_NAME:$IMAGE_COMMIT_TAG"
if [[ -n $GIT_TAG ]]; then
  export IMAGE_VERSIONED_NAME="$IMAGE_PUSH_NAME:$IMAGE_VERSIONED_TAG"
fi