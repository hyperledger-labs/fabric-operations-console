#!/bin/bash

SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives

function networkUp() {
	networkDown
	cd $SRC_DIR/..
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.2.3 1.4.9
	cd fabric-samples
	git checkout release-2.2
	cd test-network
	./network.sh up createChannel -ca -c mychannel -s couchdb
	./network.sh deployCC -ccn fabcar -ccv 1 -cci initLedger -ccl go -ccp ../chaincode/fabcar/go/
}

function networkDown() {
	if [[ -d $SRC_DIR/../fabric-samples/test-network ]]; then
		cd $SRC_DIR/../fabric-samples/test-network
		./network.sh down
		rm -fr $SRC_DIR/../fabric-samples
	fi
}

function printHelp() {
 echo "./startNetwork up"
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

if [ "${MODE}" == "up" ]; then
  networkUp
elif [ "${MODE}" == "down" ]; then
  networkDown
else
  printHelp
  exit 1
fi
