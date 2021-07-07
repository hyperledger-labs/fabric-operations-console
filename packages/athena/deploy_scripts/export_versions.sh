#!/bin/bash
# ------------------------------------------------------------------------
# This script will collect commit hashes for the projects being pulled into the build so other scripts don't have to.
# MONOREPO UPDATE: Gets the commit for the whole repo and copies it into the expected env vars
# ------------------------------------------------------------------------
set -ev

ATHENA_COMMIT=$(git rev-parse --short HEAD)
export ATHENA_COMMIT
APOLLO_COMMIT=$ATHENA_COMMIT
export APOLLO_COMMIT
STITCH_COMMIT=$ATHENA_COMMIT
export STITCH_COMMIT
echo "Found athena $ATHENA_COMMIT, apollo $APOLLO_COMMIT, and stitch $STITCH_COMMIT"
