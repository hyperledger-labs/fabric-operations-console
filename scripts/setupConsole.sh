#!/bin/bash

SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives

function networkUp() {
	docker-compose -f ${SRC_DIR}/../docker/docker-compose-console.yaml up -d
	docker-compose -f ${SRC_DIR}/../docker/docker-compose-grpc-web.yaml up -d
}

function networkDown() {
	docker-compose -f ${SRC_DIR}/../docker/docker-compose-console.yaml down
	docker-compose -f ${SRC_DIR}/../docker/docker-compose-grpc-web.yaml down
}

function printHelp() {
 echo "./startConsole up"
 echo "./startConsole down"
}
## Parse mode
if [[ $# -lt 1 ]] ; then
  printHelp
  exit 0
else
  MODE=$1
  shift
fi

if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "down" ]; then
  networkDown
else
  printHelp
  exit 1
fi
