#!/usr/bin/env bash
# ---- run this script from athena root ---- #

echo "Tagging athena, apollo and stitch..."
if [[ -n $CI_GITHUB_TOKEN ]]; then
	git clone git@github.ibm.com:IBM-Blockchain/athena.git
	cd athena
	git remote add origin_t https://${CI_GITHUB_TOKEN}@github.ibm.com/IBM-Blockchain/athena.git
	git submodule update --init		# checkout the correct submodule commit before tagging
	cd apollo
	git remote add origin_t https://${CI_GITHUB_TOKEN}@github.ibm.com/IBM-Blockchain/apollo.git
	cd ../stitch
	git remote add origin_t https://${CI_GITHUB_TOKEN}@github.ibm.com/IBM-Blockchain/stitch.git
	cd ..
fi
export CURRENT_ATHENA_TAG=$(git describe --tags --abbrev=0)
git pull
git stash					# reset any local changes

git submodule update --init		# checkout the correct submodule commit before tagging
npm version prerelease
export NEW_ATHENA_TAG=$(git describe --tags --abbrev=0)
git submodule foreach git tag -m "$NEW_ATHENA_TAG" $NEW_ATHENA_TAG
echo 'TRAVIS_COMMIT_MESSAGE:' $TRAVIS_COMMIT_MESSAGE
echo 'CURRENT_ATHENA_TAG:' $CURRENT_ATHENA_TAG

if [[ ${CI_GITHUB_TOKEN} && "v${TRAVIS_COMMIT_MESSAGE}" != "${CURRENT_ATHENA_TAG}" ]]; then
	echo "found git token and not build tag commit for package.json... tagging remote branch"
	git submodule foreach git push origin_t HEAD:master --follow-tags
	git push origin_t HEAD:master --follow-tags
	echo "Git tagging complete. $NEW_ATHENA_TAG"
fi

if [[ -z "${CI_GITHUB_TOKEN}" ]]; then
	echo "tagging in local setup"
	git submodule foreach git push origin HEAD:master --follow-tags
	git push origin HEAD:master --follow-tags
	echo "local tagging complete. $NEW_ATHENA_TAG"
fi
