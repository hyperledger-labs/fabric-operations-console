echo "About to build Ansible Collection image"
set -ev

docker build -t ibpcollection:1.0.0 ./deploy_scripts/build # Build Ansible Collection role - https://github.com/IBM-Blockchain/ansible-collection/blob/master/docker/Dockerfile

chmod -R go=u ~/.kube

echo "About to create console"
docker run --rm -v $PWD/deploy_scripts/playbooks:/playbooks -v ~/.kube:/home/ibp-user/.kube ibpcollection:1.0.0 ansible-playbook /playbooks/start_console.yml |& tee output.txt

CONSOLE_URL=$(cat output.txt | grep -Eo '(http|https)://[^/"]+')

echo "Console URL is $CONSOLE_URL"

CONTENTS="$CONSOLE_URL"

DEST=$PWD/test/functional/settings/console_url.txt
touch $DEST
echo "DEST is $DEST"

echo "$CONTENTS" > "$DEST"