#!/bin/bash

SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives
FABRIC_VERSION="2.5.11"
CA_VERSION="1.5.15"

function networkUp() {
	networkDown
	cd $SRC_DIR/..
	curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
	./install-fabric.sh --fabric-version ${FABRIC_VERSION} --ca-version ${CA_VERSION}

	cd fabric-samples

	# default to fabric-samples main branch unless v2.2.x is downloaded
	if [[ "${FABRIC_VERSION}" =~ ^2\.2\.[0-9]+$ ]]; then
		git checkout release-2.2
	fi
	cd test-network
	./network.sh up createChannel -ca -c mychannel -s couchdb

	# Uncomment to install asset-transfer-basic or fabcar
	# ./network.sh deployCC -ccn basicgo -ccp ../asset-transfer-basic/chaincode-go/ -ccl go
	# ./network.sh deployCC -ccn fabcar -ccv 1 -cci initLedger -ccl go -ccp ../chaincode/fabcar/go/
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
