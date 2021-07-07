#!/bin/bash
set -ev
PROJECT_NAME=$IMAGE_COMMIT_TAG
CLUSTER_NAME=openshift4x-ibpv2-test
CONSOLE_DOMAIN=openshift4x-ibpv2-test-68e10f583f026529fe7a89da40169ef4-0000.us-south.containers.appdomain.cloud

FABRIC_IMAGES_VERSION=2.2.1
FABRIC_VERSION=1.4.9
IBP_VERSION=2.5.1
IMAGE_TAG_DATE=20210112
FABRIC_CA_VERSION=${FABRIC_VERSION}
VERSION_14X="${FABRIC_VERSION}-0"
VERSION_CA_14X="${FABRIC_CA_VERSION}-0"
VERSION_2X="${FABRIC_IMAGES_VERSION}-0"
REGISTRYURL="us.icr.io/ibp-temp"
COUCHDB_VERSION="3.1.0"
INITJOB_IMAGE_TAGS=$(cat <<EOM
          enrollerImage: us.icr.io/ibp-temp/ibp-enroller
            enrollerTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
EOM
)

CONTENTS="
---
- name: Deploy IBM Blockchain Platform console
  hosts: localhost
  vars:
    state: present
    target: openshift
    arch: amd64
    project: $PROJECT_NAME
    console_domain: $CONSOLE_DOMAIN
    console_email: randomusername@email.com
    console_default_password: defaultpwsarebad
    image_registry: us.icr.io
    image_registry_url: "" # Can't pull image as fully qualified image names are specified
    image_registry_username: token
    image_registry_password: $ENTITLEMENT_KEY
    image_registry_email: $US_ICR_IO_EMAIL
    product_version: 2.5.1
    operator_image: us.icr.io/ibp-temp/ibp-operator
    operator_version: ${IMAGE_TAG_DATE}
    console_images:
        configtxlatorImage: us.icr.io/ibp-temp/ibp-utilities
        configtxlatorTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
        consoleInitImage: us.icr.io/ibp-temp/ibp-init
        consoleInitTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
        consoleImage: us.icr.io/op-tools/apollo-dev
        consoleTag: "$COMMIT-$TRAVIS_BUILD_ID" # Exclude 'amd64'
        couchdbImage: us.icr.io/ibp-temp/ibp-couchdb
        couchdbTag: 2.3.1-${IMAGE_TAG_DATE}
        deployerImage: us.icr.io/ibp-temp/ibp-deployer
        deployerTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
    console_versions:
      ca:
        ${VERSION_CA_14X}:
          default: true
          image:
            caImage: ${REGISTRYURL}/ibp-ca
            caInitImage: ${REGISTRYURL}/ibp-init
            caInitTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            caTag: ${FABRIC_CA_VERSION}-${IMAGE_TAG_DATE}
  ${INITJOB_IMAGE_TAGS}
          version: ${VERSION_CA_14X}
      orderer:
        ${VERSION_14X}:
          default: true
          image:
            grpcwebImage: ${REGISTRYURL}/ibp-grpcweb
            grpcwebTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            ordererImage: ${REGISTRYURL}/ibp-orderer
            ordererInitImage: ${REGISTRYURL}/ibp-init
            ordererInitTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            ordererTag: ${FABRIC_VERSION}-${IMAGE_TAG_DATE}
  ${INITJOB_IMAGE_TAGS}
          version: ${VERSION_14X}
        ${VERSION_2X}:
          default: false
          image:
            grpcwebImage: ${REGISTRYURL}/ibp-grpcweb
            grpcwebTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            ordererImage: ${REGISTRYURL}/ibp-orderer
            ordererInitImage: ${REGISTRYURL}/ibp-init
            ordererInitTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            ordererTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
  ${INITJOB_IMAGE_TAGS}
          version: ${VERSION_2X}
      peer:
        ${VERSION_14X}:
          default: true
          image:
            couchdbImage: ${REGISTRYURL}/ibp-couchdb
            couchdbTag: ${COUCHDB_VERSION}-${IMAGE_TAG_DATE}
            dindImage: ${REGISTRYURL}/ibp-dind
            dindTag: ${FABRIC_VERSION}-${IMAGE_TAG_DATE}
            fluentdImage: ${REGISTRYURL}/ibp-fluentd
            fluentdTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            grpcwebImage: ${REGISTRYURL}/ibp-grpcweb
            grpcwebTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            peerImage: ${REGISTRYURL}/ibp-peer
            peerInitImage: ${REGISTRYURL}/ibp-init
            peerInitTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            peerTag: ${FABRIC_VERSION}-${IMAGE_TAG_DATE}
  ${INITJOB_IMAGE_TAGS}
          version: ${VERSION_14X}
        ${VERSION_2X}:
          default: false
          image:
            chaincodeLauncherImage: ${REGISTRYURL}/ibp-chaincode-launcher
            chaincodeLauncherTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
            builderImage: ${REGISTRYURL}/ibp-ccenv
            builderTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
            goEnvImage: ${REGISTRYURL}/ibp-goenv
            goEnvTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
            javaEnvImage: ${REGISTRYURL}/ibp-javaenv
            javaEnvTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
            nodeEnvImage: ${REGISTRYURL}/ibp-nodeenv
            nodeEnvTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
            couchdbImage: ${REGISTRYURL}/ibp-couchdb
            couchdbTag: ${COUCHDB_VERSION}-${IMAGE_TAG_DATE}
            dindImage: ${REGISTRYURL}/ibp-dind
            dindTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
            fluentdImage: ${REGISTRYURL}/ibp-fluentd
            fluentdTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            grpcwebImage: ${REGISTRYURL}/ibp-grpcweb
            grpcwebTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            peerImage: ${REGISTRYURL}/ibp-peer
            peerInitImage: ${REGISTRYURL}/ibp-init
            peerInitTag: ${IBP_VERSION}-${IMAGE_TAG_DATE}
            peerTag: ${FABRIC_IMAGES_VERSION}-${IMAGE_TAG_DATE}
  ${INITJOB_IMAGE_TAGS}
          version: ${VERSION_2X}
    wait_timeout: 3600
  roles:
    - ibm.blockchain_platform.console
";

DEST=$PWD/deploy_scripts/playbooks/start_console.yml
touch $DEST

echo "$CONTENTS" > "$DEST"


CONTENTS="
- name: Remove IBM Blockchain Platform console from Red Hat OpenShift
  hosts: localhost
  vars:
    state: absent
    target: openshift
    arch: amd64
    project: $PROJECT_NAME
    wait_timeout: 3600
  roles:
    - ibm.blockchain_platform.console
";

DEST=$PWD/deploy_scripts/playbooks/remove_console.yml
touch $DEST

echo "$CONTENTS" > "$DEST"

echo "About to install ibmcloud CLI"
# Download and install ibmcloud cli
curl -sL https://ibm.biz/idt-installer | bash

echo "About to install OpenShift CLI"
# Download openshift cli
if [[ ${OSTYPE} = darwin* ]]; then
  curl https://mirror.openshift.com/pub/openshift-v4/clients/oc/4.6.0-202005061824.git.1.7376912.el7/macosx/oc.tar.gz --output oc.tar.gz
else
  curl https://mirror.openshift.com/pub/openshift-v4/clients/oc/4.6.0-202005061824.git.1.7376912.el7/linux/oc.tar.gz --output oc.tar.gz
fi
# Extract it
tar xvzf oc.tar.gz
chmod u+x ./oc
sudo mv ./oc /usr/local/bin/oc

echo "About to login to cluster"
# Login
ibmcloud login --apikey $OPENSHIFT_API_KEY --no-region
ibmcloud oc cluster config -c $CLUSTER_NAME
oc login -u apikey -p $OPENSHIFT_API_KEY

echo "About to create a new OpenShift CLI project"
PROJECT_NAME=$IMAGE_COMMIT_TAG
# Create project to contain console
oc delete namespace $PROJECT_NAME --wait=true | true
oc new-project $PROJECT_NAME

echo "Created playbooks"
