#!/bin/bash
SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives

COMPONENT=$1
if [ "${COMPONENT}" == "grpc-web" ]; then
	# build grpc proxy image
  	docker build -t ghcr.io/hyperledger-labs/grpc-web:latest -f ${SRC_DIR}/../docker/grpc-web/Dockerfile .
elif [ "${COMPONENT}" == "console" ]; then
	# build console image
	$SRC_DIR/../docker/build_image.sh
else
	$SRC_DIR/../docker/build_image.sh
  	docker build -t ghcr.io/hyperledger-labs/grpc-web:latest -f ${SRC_DIR}/../docker/grpc-web/Dockerfile .
fi
