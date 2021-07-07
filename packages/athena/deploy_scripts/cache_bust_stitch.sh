#!/bin/bash
# ------------------------------------------------------------------------
# This script will rename stitch file based on the commit level and updates those references in apollo's index.html.
# Doing so causes users to pull updated stitch code whenever we publish a new version.
# ------------------------------------------------------------------------
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives
STITCH_DIR=$DIR/../stitch
DIST_DIR=$STITCH_DIR/dist
INDEX_HTML=$DIR/../apollo/public/index.html

# Allow version to be passed in as an alternative to needing git in our docker build images
if [ -z "$STITCH_COMMIT" ]
then
  echo "Stitch version was not given."
  source "$DIR/export_versions.sh"
fi

echo "Attaching $STITCH_COMMIT to Stitch files from $DIST_DIR to break JS caching.  Updating references to these files in $INDEX_HTML"
# rename stitch
cp "$DIST_DIR/stitch-main-min.js" "$DIST_DIR/stitch-main-min-$STITCH_COMMIT.js"
sed -i "s/stitch-main-min\.js/stitch-main-min-$STITCH_COMMIT\.js/g" "$INDEX_HTML"

# rename dependency
cp "$DIST_DIR/stitch-dependencies.min.js" "$DIST_DIR/stitch-dependencies.min-$STITCH_COMMIT.js"
sed -i "s/stitch-dependencies\.min\.js/stitch-dependencies\.min-$STITCH_COMMIT\.js/g" "$INDEX_HTML"

echo "Updated stitch files:"
ls "$DIST_DIR"

echo "Updated $INDEX_HTML:"
cat "$INDEX_HTML"
