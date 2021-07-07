#!/bin/bash
trap 'detect_exit' 0 1 2 3 6
detect_exit()
{
  printf "\u001b[37m"  # white
  exit 0
}

# -----------------------------------------------------------
# Purpose
# - this script will create 1 orderer, 1 peer, 1 ca, 1 msp and 3 enroll ids
# - the enroll id private keys will be written to the file system (in this directory)
# -----------------------------------------------------------

# -----------------------------------------------------------
# Notes
# -----------------------------------------------------------
# http://patorjk.com/software/taag/#p=display&f=Big&t=Step%202%0A # step letter generator
# printf "\u001b[32m"  # green text
# printf "\u001b[34m"  # blue text
# printf "\u001b[37m"  # white text

# -----------------------------------------------------------
# Setup
# -----------------------------------------------------------
printf "\u001b[32m" # green
echo "starting"
#INSTANCE_URL="https://d448fcb111674f3ab6a7a70ca9b68096-optools.staging-optools.us-south.containers.appdomain.cloud"
INSTANCE_URL="http://localhost:3000"
ACCESS_KEY="admin"
ACCESS_SECRET="password"

# Set the MSP(org) Name you want
MSP_DISPLAY_NAME="FirstOrg"

# Set the MSP ID you want
MSP_ID="org1"

# Set the admin enroll ID/secret for the MSP(org)
ENROLL_ID_MAIN="admin"
ENROLL_SECRET_MAIN="admin"								# the secret is the same as id for demo convenience

# Set the orderer's enroll ID/secret
ENROLL_ID_ORDERER="admin-orderer"
ENROLL_SECRET_ORDERER="admin-orderer"					# the secret is the same as id for demo convenience

# Set the peer's enroll ID/secret
ENROLL_ID_PEER="admin-peer"
ENROLL_SECRET_PEER="admin-peer"							# the secret is the same as id for demo convenience

echo "------------- Setup -----------------"
echo "Using url: $INSTANCE_URL"
echo "Using key: $ACCESS_KEY"
echo "Will create msp id: $MSP_ID"
echo "Will create enroll id: $ENROLL_ID_MAIN"
echo "Will create enroll id: $ENROLL_ID_ORDERER"
echo "Will create enroll id: $ENROLL_ID_PEER"
echo "-------------------------------------"

# -----------------------------------------------------------
# 0. Install prereqs
# -----------------------------------------------------------
printf "\u001b[37m"  # white
jq --version > /dev/null
if [ "$?" != "0" ]; then
  echo "jq is not in path, checking locally directory..."
  ./jq --version > /dev/null

  if [ "$?" != "0" ]; then
    echo "jq is not locally directory..."
    printf "\n\n--- Installing jq for json parsing ---\n"
    wget -O jq https://github.com/stedolan/jq/releases/download/jq-1.5/jq-linux64
    chmod +x jq
    exit 1
  else
   echo "jq IS in locally directory"
  fi
else
  echo "jq IS in system path"
fi

# -----------------------------------------------------------
# 1. Provison a CA
# -----------------------------------------------------------
printf "\u001b[34m" # blue
echo "   _____ _               __ "
echo "  / ____| |             /_ |"
echo " | (___ | |_ ___ _ __    | |"
echo "  \___ \| __/ _ \ '_ \   | |"
echo "  ____) | ||  __/ |_) |  | |"
echo " |_____/ \__\___| .__/   |_|"
echo "                | |         "
echo "                |_| "
printf "\n"
CA_ROUTE="$INSTANCE_URL/ak/api/v1/kubernetes/components"
echo "Provisoning a CA. $CA_ROUTE"
PROVISION_CA_RESP=$(curl -X POST \
  "$CA_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"type":"fabric-ca", "enroll_id":"'$ENROLL_ID_MAIN'", "enroll_secret":"'$ENROLL_SECRET_MAIN'", "short_name":"My CA"}' \
  --connect-timeout 30 || true)

printf "\nResp: $PROVISION_CA_RESP\n"
MESSAGE=$(echo "$PROVISION_CA_RESP" | ./jq '.message' -r || true)    # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                      # this is a problem
  echo "Error - Could not provision your CA... check logs"
  exit 1;
else
  printf "CA provision was successful, woo\n\n"                        # this is ok
  TLS_CERT=$(echo "$PROVISION_CA_RESP" | ./jq '.tls_cert' -r || true)  # parse the response for the "message" field
  CA_NAME=$(echo "$PROVISION_CA_RESP" | ./jq '.ca_name' -r || true)    # parse the response for the "ca_name" field
  CA_URL=$(echo "$PROVISION_CA_RESP" | ./jq '.url' -r || true)         # parse the response for the "message" field
  TLS_CA_NAME=$(echo "$PROVISION_CA_RESP" | ./jq '.tlsca_name' -r || true) # parse the response for the "message" field

  CA_PROTOCOL="$(echo $CA_URL | grep :// | sed -e's,^\(.*://\).*,\1,g')"
  CA_URL2="$(echo $CA_URL | sed -e 's/^http:\/\///g' -e 's/^https:\/\///g')"
  CA_HOST="$(echo ${CA_URL2} | cut -d: -f1)"
  CA_PORT="$(echo $CA_URL | sed -e 's,^.*:,:,g' -e 's,.*:\([0-9]*\).*,\1,g' -e 's,[^0-9],,g')"
fi

echo "ca url: $CA_URL"
echo "ca proto: $CA_PROTOCOL"
echo "ca url2: $CA_URL2"
echo "ca host: $CA_HOST"
echo "ca port: $CA_PORT"

# -----------------------------------------------------------
# 1.1 Wait for CA to start running [07,10,13,16,19,22]
# -----------------------------------------------------------
i=0
while [[ "$RESP" != "HTTP/1.1 404 Not Found" && "$i" -lt "6" ]]
do
  printf "Waiting for CA to start... +$[$i*3+7] secs\n"
  sleep $[$i*3+7]s
  printf "\n\n--- Polling on CA (attempt $[$i+1]) ---\n"
  echo "$CA_URL"
  RESP=$(curl -X GET -k --head\
    "$CA_URL/hello-there" \
    -H 'Cache-Control: no-cache' \
    --connect-timeout 5 | head -n 1 || true)
  echo "CA resp: $RESP"
  i=$[$i+1]
done
if [ "$RESP" == "HTTP/1.1 404 Not Found" ]; then
  echo " - 404 is a 'good' response, ca is running"
  sleep 5
else
  echo " - ca is still not running. problem"
  exit 1
fi

# -----------------------------------------------------------
# 2. Enroll the admin id
# -----------------------------------------------------------
printf "\u001b[37m"  # white
echo "   _____ _               ___   "
echo "  / ____| |             |__ \  "
echo " | (___ | |_ ___ _ __      ) | "
echo "  \___ \| __/ _ \ '_ \    / /  "
echo "  ____) | ||  __/ |_) |  / /_  "
echo " |_____/ \__\___| .__/  |____| "
echo "                | |            "
echo "                |_|  "
printf "\n"
ENROLL_ROUTE="$INSTANCE_URL/ak/api/v1/cas/users/enroll"
echo "Enrolling enroll id. $ENROLL_ROUTE"
ENROLL_RESP=$(curl -X POST \
  "$ENROLL_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"ca_url":"'$CA_URL'", "ca_name":"'$CA_NAME'", "enroll_id":"'$ENROLL_ID_MAIN'", "enroll_secret":"'$ENROLL_SECRET_MAIN'"}' \
  --connect-timeout 15 || true)

printf "\nResp: $ENROLL_RESP\n"
MESSAGE=$(echo "$ENROLL_RESP" | ./jq '.message' -r || true)          # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                      # this is a problem
  echo "Error - Could not enroll the admin id... check logs"
  exit 1;
else
  printf "Orderer's ID enrollment was successful, woo\n\n"                      # this is ok
  ENROLL_ID_ADMIN_CERT=$(echo "$ENROLL_RESP" | ./jq '.certificate' -r || true)  # parse the response for the "certificate" field
  ENROLL_ID_ADMIN_KEY=$(echo "$ENROLL_RESP" | ./jq '.private_key' -r || true)   # parse the response for the "private_key" field
fi

printf "\u001b[33m"
echo "Warning - creating JSON file for admin's enroll id"
echo "Warning - file contains private key"
echo "Warning - save this file!"
echo "Warning - enroll_id_admin.json"
EXPORT_ID='{"name":"'$ENROLL_ID_MAIN'", "private_key":"'$ENROLL_ID_ADMIN_KEY'", "cert":"'$ENROLL_ID_ADMIN_CERT'", "ca_url":"'$CA_URL'", "enroll_id":"'$ENROLL_ID_MAIN'", "enroll_secret":"'$ENROLL_SECRET_MAIN'"}'
echo "$EXPORT_ID" | ./jq . > "enroll_id_admin_${ENROLL_ID_MAIN}.json"

# -----------------------------------------------------------
# 3. Generate a MSP Definition
# -----------------------------------------------------------
printf "\u001b[34m" # blue
echo "   _____ _               ____   "
echo "  / ____| |             |___ \  "
echo " | (___ | |_ ___ _ __     __) | "
echo "  \___ \| __/ _ \ '_ \   |__ <  "
echo "  ____) | ||  __/ |_) |  ___) | "
echo " |_____/ \__\___| .__/  |____/  "
echo "                | |             "
echo "                |_|             "
printf "\n"
MSP_ROUTE="$INSTANCE_URL/ak/api/v1/components"
echo "Generating a MSP. $MSP_ROUTE"
echo '{"type":"msp","msp_id":"'$MSP_ID'","short_name":"'$MSP_DISPLAY_NAME'","root_certs":["'$TLS_CERT'"],"certificate":"cert1","admins":["'$ENROLL_ID_ADMIN_CERT'"],"organizational_unit_identifiers":["ouiId1"],"fabric_node_ous":["ousId1"]}'
GEN_MSP_RESP=$(curl -X POST \
  "$MSP_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"type":"msp","msp_id":"'$MSP_ID'","short_name":"'$MSP_DISPLAY_NAME'","root_certs":["'$TLS_CERT'"],"certificate":"cert1","admins":["'$ENROLL_ID_ADMIN_CERT'"],"organizational_unit_identifiers":["ouiId1"],"fabric_node_ous":["ousId1"]}' \
  --connect-timeout 15 || true)
#  -d '{"type":"msp","msp_id":"'$MSP_ID'","short_name":"'$MSP_DISPLAY_NAME'","root_certs":["'$TLS_CERT'"],"certificate":"cert1","admins":["'$ENROLL_ID_ADMIN_CERT'"],"organizational_unit_identifiers":["ouiId1"],"fabric_node_ous":["ousId1"]}' \
printf "\nResp: $GEN_MSP_RESP\n"
MESSAGE=$(echo "$GEN_MSP_RESP" | ./jq '.message' -r || true)      # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                   # this is a problem
  echo "Error - Could not generate a MSP... check logs"
  exit 1;
else
  printf "MSP generation was successful, woo\n\n"                 # this is ok
fi
printf "\u001b[33m"
echo "Warning - creating JSON file for msp id"
echo "Warning - save this file!"
echo "Warning - msp.json"
EXPORT_MSP='{"name":"'$MSP_DISPLAY_NAME'","msp_id":"'$MSP_ID'","type":"msp","root_certs":["'$TLS_CERT'"],"admins":["'$ENROLL_ID_ADMIN_CERT'"],"tls_root_certs":["'$TLS_CERT'"]}'
echo "$EXPORT_MSP" | ./jq . > "msp_${MSP_ID}.json"

# -----------------------------------------------------------
# 4. Register new id for orderer
# -----------------------------------------------------------
printf "\u001b[37m"  # white
echo "   _____ _               _  _    "
echo "  / ____| |             | || |   "
echo " | (___ | |_ ___ _ __   | || |_  "
echo "  \___ \| __/ _ \ '_ \  |__   _| "
echo "  ____) | ||  __/ |_) |    | |   "
echo " |_____/ \__\___| .__/     |_|   "
echo "                | |              "
echo "                |_|  "
printf "\n"
REGISTER_ROUTE="$INSTANCE_URL/ak/api/v1/cas/users/register"
echo "Registering a new enroll id. $REGISTER_ROUTE"
REGISTER_ID_RESP=$(curl -X POST \
  "$REGISTER_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"ca_url":"'$CA_URL'", "ca_name":"'$CA_NAME'", "enroll_id":"'$ENROLL_ID_MAIN'", "enroll_secret":"'$ENROLL_SECRET_MAIN'", "new_enroll_id":"'$ENROLL_ID_ORDERER'","new_enroll_secret":"'$ENROLL_SECRET_ORDERER'", "affiliation":"org1", "type":"peer", "max_enrollments":-1}' \
  --connect-timeout 15 || true)

printf "\nResp: $REGISTER_ID_RESP\n"
MESSAGE=$(echo "$REGISTER_ID_RESP" | ./jq '.message' -r || true)     # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                      # this is a problem
  echo "Error - Could not register the orderer's id... check logs"
  exit 1;
else
  printf "Orderer's ID registeration was successful, woo\n\n"        # this is ok
fi

# -----------------------------------------------------------
# 5. Enroll the orderer's id
# -----------------------------------------------------------
printf "\u001b[34m" # blue
echo "   _____ _               _____  "
echo "  / ____| |             | ____| "
echo " | (___ | |_ ___ _ __   | |__   "
echo "  \___ \| __/ _ \ '_ \  |___ \  "
echo "  ____) | ||  __/ |_) |  ___) | "
echo " |_____/ \__\___| .__/  |____/  "
echo "                | |             "
echo "                |_|             "
printf "\n"
ENROLL_ROUTE="$INSTANCE_URL/ak/api/v1/cas/users/enroll"
echo "Enrolling enroll id. $ENROLL_ROUTE"
ENROLL_RESP=$(curl -X POST \
  "$ENROLL_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"ca_url":"'$CA_URL'", "ca_name":"'$CA_NAME'", "enroll_id":"'$ENROLL_ID_ORDERER'", "enroll_secret":"'$ENROLL_SECRET_ORDERER'"}' \
  --connect-timeout 15 || true)

printf "\nResp: $ENROLL_RESP\n"
MESSAGE=$(echo "$ENROLL_RESP" | ./jq '.message' -r || true)          # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                      # this is a problem
  echo "Error - Could not enroll the orderer's id... check logs"
  exit 1;
else
  printf "Orderer's ID enrollment was successful, woo\n\n"                        # this is ok
  ENROLL_ID_ORDERER_CERT=$(echo "$ENROLL_RESP" | ./jq '.certificate' -r || true)  # parse the response for the "certificate" field
  ENROLL_ID_ORDERER_KEY=$(echo "$ENROLL_RESP" | ./jq '.private_key' -r || true)   # parse the response for the "private_key" field
fi

printf "\u001b[33m"
echo "Warning - creating JSON file for orderer's enroll id"
echo "Warning - file contains private key"
echo "Warning - save this file!"
echo "Warning - enroll_id_orderer.json"
EXPORT_ID='{"name":"'$ENROLL_ID_ORDERER'", "private_key":"'$ENROLL_ID_ORDERER_KEY'", "cert":"'$ENROLL_ID_ORDERER_CERT'", "ca_url":"'$CA_URL'",  "enroll_id":"'$ENROLL_ID_ORDERER'", "enroll_secret":"'$ENROLL_SECRET_ORDERER'"}'
echo "$EXPORT_ID" | ./jq . > "enroll_id_orderer_${ENROLL_ID_ORDERER}.json"

# -----------------------------------------------------------
# 6. Create an Orderer
# -----------------------------------------------------------
printf "\u001b[37m"  # white
echo "   _____ _                 __   "
echo "  / ____| |               / /   "
echo " | (___ | |_ ___ _ __    / /_   "
echo "  \___ \| __/ _ \ '_ \  | '_ \  "
echo "  ____) | ||  __/ |_) | | (_) | "
echo " |_____/ \__\___| .__/   \___/  "
echo "                | |             "
echo "                |_| "
printf "\n"
ORDERER_ROUTE="$INSTANCE_URL/ak/api/v1/kubernetes/components"
echo "Provisoning an orderer. $ORDERER_ROUTE"
PROVISION_ORDERER_RESP=$(curl -X POST \
  "$ORDERER_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"type":"fabric-orderer","msp_id":"'$MSP_ID'","config":{"enrollment":{"component":{"cahost":"'$CA_HOST'","caport":"'$CA_PORT'","caname":"'$CA_NAME'","catls":{"cacert":"'$TLS_CERT'"},"enrollid":"'$ENROLL_ID_ORDERER'","enrollsecret":"'$ENROLL_SECRET_ORDERER'","admincerts":["'$ENROLL_ID_ADMIN_CERT'"]},"tls":{"cahost":"'$CA_HOST'","caport":"'$CA_PORT'","caname":"'$TLS_CA_NAME'","catls":{"cacert":"'$TLS_CERT'"},"enrollid":"'$ENROLL_ID_MAIN'","enrollsecret":"'$ENROLL_SECRET_MAIN'","admincerts":["'$ENROLL_ID_ADMIN_CERT'"],"csr":{"hosts":[]}}}},"short_name":"MyOrderer","tls_cert":"'$TLS_CERT'"}' \
  --connect-timeout 30 || true)

printf "\nResp: $PROVISION_ORDERER_RESP\n"
MESSAGE=$(echo "$PROVISION_ORDERER_RESP" | ./jq '.message' -r || true)    # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                           # this is a problem
  echo "Could not provision your orderer... check logs"
  exit 1;
else
  printf "Orderer provision was successful, woo\n\n"                      # this is ok
  ORDERER_URL=$(echo "$ENROLL_RESP" | ./jq '.url' -r || true)             # parse the response for the "url" field
fi

# -----------------------------------------------------------
# 7. Register new id for peer
# -----------------------------------------------------------
printf "\u001b[34m" # blue
echo "   _____ _               ______  "
echo "  / ____| |             |____  | "
echo " | (___ | |_ ___ _ __       / /  "
echo "  \___ \| __/ _ \ '_ \     / /   "
echo "  ____) | ||  __/ |_) |   / /    "
echo " |_____/ \__\___| .__/   /_/     "
echo "                | |              "
echo "                |_|   "
printf "\n"
REGISTER_ROUTE="$INSTANCE_URL/ak/api/v1/cas/users/register"
echo "Registering a new enroll id. $REGISTER_ROUTE"
REGISTER_ID_RESP=$(curl -X POST \
  "$REGISTER_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"ca_url":"'$CA_URL'", "ca_name":"'$CA_NAME'", "enroll_id":"'$ENROLL_ID_MAIN'", "enroll_secret":"'$ENROLL_SECRET_MAIN'", "new_enroll_id":"'$ENROLL_ID_PEER'","new_enroll_secret":"'$ENROLL_SECRET_PEER'", "affiliation":"org1", "type":"peer", "max_enrollments":-1}' \
  --connect-timeout 15 || true)

printf "\nResp: $REGISTER_ID_RESP\n"
MESSAGE=$(echo "$REGISTER_ID_RESP" | ./jq '.message' -r || true)       # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                        # this is a problem
  echo "Error - Could not register the peer's id... check logs"
  exit 1;
else
  printf "Peer's ID registeration was successful, woo\n\n"             # this is ok
fi

#-----------------------------------------------------------
# 8. Enroll the peer's id
#-----------------------------------------------------------
printf "\u001b[37m"  # white
echo "   _____ _                ___   "
echo "  / ____| |              / _ \  "
echo " | (___ | |_ ___ _ __   | (_) | "
echo "  \___ \| __/ _ \ '_ \   > _ <  "
echo "  ____) | ||  __/ |_) | | (_) | "
echo " |_____/ \__\___| .__/   \___/  "
echo "                | |             "
echo "                |_|  "
printf "\n"
ENROLL_ROUTE="$INSTANCE_URL/ak/api/v1/cas/users/enroll"
echo "Enrolling enroll id. $ENROLL_ROUTE"
ENROLL_RESP=$(curl -X POST \
  "$ENROLL_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"ca_url":"'$CA_URL'", "ca_name":"'$CA_NAME'", "enroll_id":"'$ENROLL_ID_PEER'", "enroll_secret":"'$ENROLL_SECRET_PEER'"}' \
  --connect-timeout 15 || true)

printf "\nResp: $ENROLL_RESP\n"
MESSAGE=$(echo "$ENROLL_RESP" | ./jq '.message' -r || true)          # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                      # this is a problem
  echo "Error - Could not enroll the peer's id... check logs"
  exit 1;
else
  printf "Peer's ID enrollment was successful, woo\n\n"                           # this is ok
  ENROLL_ID_PEER_CERT=$(echo "$ENROLL_RESP" | ./jq '.certificate' -r || true)     # parse the response for the "certificate" field
  ENROLL_ID_PEER_KEY=$(echo "$ENROLL_RESP" | ./jq '.private_key' -r || true)      # parse the response for the "private_key" field
fi

printf "\u001b[33m"
echo "Warning - creating JSON file for peer's enroll id"
echo "Warning - file contains private key"
echo "Warning - save this file!"
echo "Warning - enroll_id_peer.json"
EXPORT_ID='{"name":"'$ENROLL_ID_PEER'", "private_key":"'$ENROLL_ID_PEER_KEY'", "cert":"'$ENROLL_ID_PEER_CERT'", "ca_url":"'$CA_URL'", "enroll_id":"'$ENROLL_ID_PEER'", "enroll_secret":"'$ENROLL_SECRET_PEER'"}'
echo "$EXPORT_ID" | ./jq . > "enroll_id_peer_${ENROLL_ID_PEER}.json"

# -----------------------------------------------------------
# 9. Create a Peer
# -----------------------------------------------------------
printf "\u001b[34m" # blue
echo "   _____ _                ___   "
echo "  / ____| |              / _ \  "
echo " | (___ | |_ ___ _ __   | (_) | "
echo "  \___ \| __/ _ \ '_ \   \__, | "
echo "  ____) | ||  __/ |_) |    / /  "
echo " |_____/ \__\___| .__/    /_/   "
echo "                | |             "
echo "                |_|    "
printf "\n"
PEER_ROUTE="$INSTANCE_URL/ak/api/v1/kubernetes/components"
echo "Provisoning a peer. $PEER_ROUTE"
PROVISION_PEER_RESP=$(curl -X POST \
  "$PEER_ROUTE" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -u $ACCESS_KEY:$ACCESS_SECRET \
  -d '{"type":"fabric-peer","msp_id":"'$MSP_ID'","config":{"enrollment":{"component":{"cahost":"'$CA_HOST'","caport":"'$CA_PORT'","caname":"'$CA_NAME'","catls":{"cacert":"'$TLS_CERT'"},"enrollid":"'$ENROLL_ID_PEER'","enrollsecret":"'$ENROLL_SECRET_PEER'","admincerts":["'$ENROLL_ID_ADMIN_CERT'"]},"tls":{"cahost":"'$CA_HOST'","caport":"'$CA_PORT'","caname":"'$TLS_CA_NAME'","catls":{"cacert":"'$TLS_CERT'"},"enrollid":"'$ENROLL_ID_MAIN'","enrollsecret":"'$ENROLL_SECRET_MAIN'","admincerts":["'$ENROLL_ID_ADMIN_CERT'"],"csr":{"hosts":[]}}}},"short_name":"My Peer","tls_cert":"'$TLS_CERT'"}' \
  --connect-timeout 30 || true)

printf "\nResp: $PROVISION_PEER_RESP\n"
MESSAGE=$(echo "$PROVISION_PEER_RESP" | ./jq '.message' -r || true)       # parse the response for the "message" field

if [ "$MESSAGE" != "ok" ]; then                                           # this is a problem
  echo "Could not provision your peer... check logs"
  exit 1;
else
  printf "Peer provision was successful, woo\n\n"                         # this is ok
fi

# -----------------------------------------------------------
# done
# -----------------------------------------------------------
printf "\u001b[32m" # green
printf "\n\n--- We are done here. ---\n\n"
