#!/bin/bash

SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives

WORK_AREA=${SRC_DIR}/../workarea
rm -fr ${WORK_AREA}
mkdir -p ${WORK_AREA}/assets/Certificate_Authorities
mkdir -p ${WORK_AREA}/assets/Ordering_Services
mkdir -p ${WORK_AREA}/assets/Peers
mkdir -p ${WORK_AREA}/assets/Organizations

ASSETS_ROOT=${SRC_DIR}/../workarea/assets

TEMPLATE_ROOT=${SRC_DIR}/../common/templates/docker

if [[ $# -eq 1 ]] ; then
	TEMPLATE_ROOT=${SRC_DIR}/../common/templates/localhost
fi

ORG1_CAINFO=${WORK_AREA}/org1_ca.json
ORG2_CAINFO=${WORK_AREA}/org2_ca.json
ORDERER_CAINFO=${WORK_AREA}/orderer_ca.json

curl -k https://localhost:7054/cainfo > ${ORG1_CAINFO}
ORG1_ROOT_CERT=`jq .result.CAChain ${ORG1_CAINFO} -r`

curl -k https://localhost:8054/cainfo > ${ORG2_CAINFO}
ORG2_ROOT_CERT=`jq .result.CAChain ${ORG2_CAINFO} -r`

curl -k https://localhost:9054/cainfo > ${ORDERER_CAINFO}
ORDERER_ROOT_CERT=`jq .result.CAChain ${ORDERER_CAINFO} -r`

ORDERER_ADMIN_URL="https://localhost:7053"

# Create CA Imports
jq --arg ORG1_ROOT_CERT "$ORG1_ROOT_CERT" '.tls_cert = $ORG1_ROOT_CERT' ${TEMPLATE_ROOT}/Certificate_Authorities/org1ca-local_ca.json > ${ASSETS_ROOT}/Certificate_Authorities/org1ca-local_ca.json
jq --arg ORG2_ROOT_CERT "$ORG2_ROOT_CERT" '.tls_cert = $ORG2_ROOT_CERT' ${TEMPLATE_ROOT}/Certificate_Authorities/org2ca-local_ca.json > ${ASSETS_ROOT}/Certificate_Authorities/org2ca-local_ca.json
jq --arg ORDERER_ROOT_CERT "$ORDERER_ROOT_CERT" '.tls_cert = $ORDERER_ROOT_CERT' ${TEMPLATE_ROOT}/Certificate_Authorities/ordererca-local_ca.json > ${ASSETS_ROOT}/Certificate_Authorities/ordererca-local_ca.json

# Create Peer Imports
jq --arg ORG1_ROOT_CERT "$ORG1_ROOT_CERT" \
	'.msp.component.tls_cert = $ORG1_ROOT_CERT | .msp.ca.root_certs[0] = $ORG1_ROOT_CERT | .msp.tlsca.root_certs[0] = $ORG1_ROOT_CERT | .pem = $ORG1_ROOT_CERT | .tls_cert = $ORG1_ROOT_CERT | .tls_ca_root_cert = $ORG1_ROOT_CERT' \
	${TEMPLATE_ROOT}/Peers/org1_peer1-local_peer.json > ${ASSETS_ROOT}/Peers/org1_peer1-local_peer.json


jq --arg ORG2_ROOT_CERT "$ORG2_ROOT_CERT" \
	'.msp.component.tls_cert = $ORG2_ROOT_CERT | .msp.ca.root_certs[0] = $ORG2_ROOT_CERT | .msp.tlsca.root_certs[0] = $ORG2_ROOT_CERT | .pem = $ORG2_ROOT_CERT | .tls_cert = $ORG2_ROOT_CERT | .tls_ca_root_cert = $ORG2_ROOT_CERT' \
	${TEMPLATE_ROOT}/Peers/org2_peer1-local_peer.json > ${ASSETS_ROOT}/Peers/org2_peer1-local_peer.json

# Create Orderer Imports
jq --arg ORDERER_ROOT_CERT "$ORDERER_ROOT_CERT" \
	'.msp.component.tls_cert = $ORDERER_ROOT_CERT | .msp.ca.root_certs[0] = $ORDERER_ROOT_CERT | .msp.tlsca.root_certs[0] = $ORDERER_ROOT_CERT | .pem = $ORDERER_ROOT_CERT | .tls_cert = $ORDERER_ROOT_CERT | .tls_ca_root_cert = $ORDERER_ROOT_CERT' \
	${TEMPLATE_ROOT}/Ordering_Services/orderer-local_orderer.json > ${ASSETS_ROOT}/Ordering_Services/orderer-local_orderer.json

# Create MSP Imports
jq --arg ORG1_ROOT_CERT "$ORG1_ROOT_CERT" \
	'.root_certs[0] = $ORG1_ROOT_CERT | .tls_root_certs[0] = $ORG1_ROOT_CERT | .fabric_node_ous.admin_ou_identifier.certificate = $ORG1_ROOT_CERT | .fabric_node_ous.client_ou_identifier.certificate = $ORG1_ROOT_CERT | .fabric_node_ous.orderer_ou_identifier.certificate = $ORG1_ROOT_CERT | .fabric_node_ous.peer_ou_identifier.certificate = $ORG1_ROOT_CERT' \
	${TEMPLATE_ROOT}/Organizations/org1msp_msp.json > ${ASSETS_ROOT}/Organizations/org1msp_msp.json

jq --arg ORG2_ROOT_CERT "$ORG2_ROOT_CERT" \
	'.root_certs[0] = $ORG2_ROOT_CERT | .tls_root_certs[0] = $ORG2_ROOT_CERT | .fabric_node_ous.admin_ou_identifier.certificate = $ORG2_ROOT_CERT | .fabric_node_ous.client_ou_identifier.certificate = $ORG2_ROOT_CERT | .fabric_node_ous.orderer_ou_identifier.certificate = $ORG2_ROOT_CERT | .fabric_node_ous.peer_ou_identifier.certificate = $ORG2_ROOT_CERT' \
	${TEMPLATE_ROOT}/Organizations/org2msp_msp.json > ${ASSETS_ROOT}/Organizations/org2msp_msp.json

jq --arg ORDERER_ROOT_CERT "$ORDERER_ROOT_CERT" \
	'.root_certs[0] = $ORDERER_ROOT_CERT | .tls_root_certs[0] = $ORDERER_ROOT_CERT | .fabric_node_ous.admin_ou_identifier.certificate = $ORDERER_ROOT_CERT | .fabric_node_ous.client_ou_identifier.certificate = $ORDERER_ROOT_CERT | .fabric_node_ous.orderer_ou_identifier.certificate = $ORDERER_ROOT_CERT | .fabric_node_ous.peer_ou_identifier.certificate = $ORDERER_ROOT_CERT' \
	${TEMPLATE_ROOT}/Organizations/orderermsp_msp.json > ${ASSETS_ROOT}/Organizations/orderermsp_msp.json

cd ${WORK_AREA}
zip -r console_assets.zip ./assets/*
