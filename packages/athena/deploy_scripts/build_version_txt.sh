#!/bin/bash
# ------------------------------------------------------------------------
# This script will build version.txt file in the public directory of the athena server
# ------------------------------------------------------------------------
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives
SRC_PATH=$DIR/version.txt
DST_PATH=$DIR/../public/version.txt

if [ -z "$TRAVIS_TAG" ]; then
  echo "\$TRAVIS_TAG is empty.  'version.txt' will have an empty 'tag:' field."
else
  echo "\$TRAVIS_TAG=$TRAVIS_TAG  'version.txt' will have a 'tag:$TRAVIS_TAG' field."
fi
echo -n "tag:"  > "$SRC_PATH"
echo "$TRAVIS_TAG"  >> "$SRC_PATH"

if [ -z "$ATHENA_COMMIT" ] || [ -z "$APOLLO_COMMIT" ] || [ -z "$STITCH_COMMIT" ]; then
  echo "ATHENA_COMMIT=$ATHENA_COMMIT, APOLLO_COMMIT=$APOLLO_COMMIT, or STITCH_COMMIT=$STITCH_COMMIT is not set."
  source "$DIR/export_versions.sh"
fi

echo -n "athena:" >> "$SRC_PATH"
echo "$ATHENA_COMMIT" >> "$SRC_PATH"

echo -n "apollo:" >> "$SRC_PATH"
echo "$APOLLO_COMMIT" >> "$SRC_PATH"

echo -n "stitch:" >> "$SRC_PATH"
echo "$STITCH_COMMIT" >> "$SRC_PATH"

mv "$SRC_PATH" "$DST_PATH"

VERSION_TXT=$(cat "$DST_PATH")
printf "Generated version.txt at %s:\n%s\n" "$DST_PATH" "$VERSION_TXT"
