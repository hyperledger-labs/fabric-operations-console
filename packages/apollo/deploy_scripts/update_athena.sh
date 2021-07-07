#!/usr/bin/env bash
set -ev
echo "About to clone athena repository"
cd ..

# Clone Athena
git clone git@github.ibm.com:IBM-Blockchain/athena.git
cd athena

echo "Cloned reposistory, about to pull in Apollo commit"

# Update .gitmodules
git submodule update --init --remote apollo

echo "Updating apollo commit in athena..."
git add apollo
git commit -m "update apollo"
git remote add origin_t https://${CI_GITHUB_TOKEN}@github.ibm.com/IBM-Blockchain/athena.git
git push origin_t master --quiet

