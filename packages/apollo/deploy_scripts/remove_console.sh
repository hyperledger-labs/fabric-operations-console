#!/bin/bash
set -ev
echo "Removing console"

cd /home/travis/build/IBM-Blockchain/athena/apollo
COMMIT=$(git rev-parse --short HEAD)
cd -

PROJECT_NAME="$COMMIT-$TRAVIS_BUILD_ID-amd64"

# docker run --rm -v $PWD/deploy_scripts/playbooks:/playbooks -v ~/.kube:/home/ibp-user/.kube ibpcollection:1.0.0 ansible-playbook /playbooks/remove_console.yml

echo "Deleting project: $PROJECT_NAME"
PROJECT_NAME=$IMAGE_COMMIT_TAG
oc delete project $PROJECT_NAME

sleep 10

echo "About to list processes"
ps -a

CHROMEPID=$(ps aux | grep 'chromedrive[r]' | awk 'NR==1 { print $2 }')

if [ -z "$CHROMEPID" ]; then
  echo "Chrome driver process not detected"
else
  kill -9 $CHROMEPID
fi

sleep 5

grep -E -q ' failed' results.txt && echo "Tests failed" || echo "Tests passed"
grep -E -q ' failed' results.txt && exit 1 || exit 0