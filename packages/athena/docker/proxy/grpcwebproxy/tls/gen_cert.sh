#!/bin/bash
# Regenerate the self-signed certificate for local host. Recent versions of firefox and chrome(ium)
# require a certificate authority to be imported by the browser (localhostCA.pem) while
# the server uses a cert and key signed by that certificate authority.
# Based partly on https://stackoverflow.com/a/48791236
CA_PASSWORD=ibp-was-here

# Generate the root certificate authority key with the set password
openssl genrsa -des3 -passout pass:$CA_PASSWORD -out localhostCA.key 2048
echo "done 1"

# Generate a root-certificate based on the root-key for importing to browsers.
openssl req -x509 -new -nodes -key localhostCA.key -passin pass:$CA_PASSWORD -config localhostCA.conf -sha256 -days 1825 -out localhostCA.pem
echo "done 2"

# Generate a new private key
openssl genrsa -out localhost.key 2048
echo "done 3"

# Generate a Certificate Signing Request (CSR) based on that private key (reusing the localhostCA.conf details)
openssl req -new -key localhost.key -out localhost.csr -config localhostCA.conf
echo "done 4"

# Create the certificate for the webserver to serve using the localhost.conf config.
openssl x509 -req -in localhost.csr -CA localhostCA.pem -CAkey localhostCA.key -CAcreateserial \
-out localhost.crt -days 1024 -sha256 -extfile localhost.conf -passin pass:$CA_PASSWORD
echo "done 5"
