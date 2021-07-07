#!/bin/bash
# ------------------------------------------------------------------------
# This script will collect commit hashes for the projects being pulled into the build so other scripts don't have to.
# ------------------------------------------------------------------------
APP='athena'
AUTH_USER='athena'
AUTH_PASS=$SLACK_AUTH
BRANCH_NAME=$TRAVIS_BRANCH
COMMIT_HASH=$TRAVIS_COMMIT
COMMITTER_EMAIL=$(git log -1 "$TRAVIS_COMMIT" --pretty="%cE")
: ${SLACK_CHANNELS:='["ibp-code-promotion"]'}

if [[ "$MESSAGE_TYPE" = "release" ]]; then
  SLACK_MESSAGE="Release: $TRAVIS_BRANCH for $ARCH\nPushed images:\n$IMAGE_COMMIT_NAME1\n$IMAGE_VERSIONED_NAME1\n$IMAGE_COMMIT_NAME2\n$IMAGE_VERSIONED_NAME2"
  # Gives me a way to quietly play with tagged builds
	if [[ "$TRAVIS_BRANCH" =~ ^test ]]; then
	  echo "Skipping slack notification for $TRAVIS_BRANCH"
		exit 0
	fi

elif [[ "$MESSAGE_TYPE" = "deploy" ]]; then
  SLACK_MESSAGE="Updated dev to use image $IMAGE_VERSIONED_NAME1"

else
  echo "Invalid message type '$MESSAGE_TYPE'.  Message was not sent."
  exit 1
fi
echo "Sending '$MESSAGE_TYPE' notification to '$SLACK_CHANNELS'"

echo "Sending slack message for branch: $BRANCH_NAME, and app: $APP"
BODY='{"channels": '$SLACK_CHANNELS', "message": "'$SLACK_MESSAGE'", "application": "'$APP'"}'
export SLACK_URL="https://$AUTH_USER:$AUTH_PASS@bcs-slack.ng.bluemix.net/api/ci/app/$AUTH_USER/branch/release/commit/$COMMIT_HASH/author/$COMMITTER_EMAIL"
echo $BODY | curl -X POST "$SLACK_URL" \
  -d @- \
  -H "Content-Type: application/json" -vvv || true
