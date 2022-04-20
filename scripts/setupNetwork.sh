#!/bin/bash

SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives
FABRIC_VERSION="2.2.3"
CA_VERSION="1.5.2"

function networkUp() {
	networkDown
	cd $SRC_DIR/..
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- ${FABRIC_VERSION} ${CA_VERSION}
	cd fabric-samples
	if [ "${FABRIC_VERSION}" == "2.2.3" ]; then
		git checkout release-2.2
	fi
	cd test-network
	./network.sh up createChannel -ca -c mychannel -s couchdb
	./network.sh deployCC -ccn fabcar -ccv 1 -cci initLedger -ccl go -ccp ../chaincode/fabcar/go/
}

function networkDown() {
	if [[ -d $SRC_DIR/../fabric-samples/test-network ]]; then
		cd $SRC_DIR/../fabric-samples/test-network
		./network.sh down
		#rm -fr $SRC_DIR/../fabric-samples
	fi
}

function printHelp() {
 echo "./startNetwork up"
# echo "./startNetwork up -v 2.4.1"
 echo "./startNetwork down"
}
## Parse mode
if [[ $# -lt 1 ]] ; then
  printHelp
  exit 0
else
  MODE=$1
  shift
fi

while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    printHelp $MODE
    exit 0
    ;;
  -v )
    FABRIC_VERSION="$2"
	if [ ! -z "$3" ];then
	    CA_VERSION="$3"
	fi
    shift
    ;;
  esac
  shift
done

if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "down" ]; then
  networkDown
else
  printHelp
  exit 1
fi
