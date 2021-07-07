#!/bin/bash

COMMIT_ID=$1

if [ -z "${COMMIT_ID}" ]; then
	printf "\nCOMMIT_ID not provided"
	exit 1
fi

echo "Cloning github.ibm.com/ibp/updates ..."
git clone https://github.ibm.com/ibp/updates.git

cd updates

./scripts/update-image.sh consoleImage "us.icr.io/op-tools/op-tools"
./scripts/update-image.sh consoleTag "${COMMIT_ID}"

echo "git status"
git status

echo "git add ."
git add .

echo git -c user.name="optools" commit -m "Update deployerconfig.json with latest optools image tag"
git -c user.name="optools" commit -m "Update deployerconfig.json with latest optools image tag"

echo "git push origin master"
git push origin master
