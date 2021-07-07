#!/usr/bin/env bash
# ---- run this script from athena root ---- #

echo "Updating apollo commit in athena..."
git pull
git submodule update --init --remote apollo
git add apollo
git commit -m "update apollo"
git push
sh ./scripts/tag_build.sh			# create tags too
