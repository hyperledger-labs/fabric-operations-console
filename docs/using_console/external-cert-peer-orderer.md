---
layout: default
title: Using certificates from an external CA with your peer or ordering service
parent: Advanced deployment options
nav_order: 7
description: "Using certificates from an external CA with your peer or ordering service in Fabric Operations Console"
keywords: external CA, ordering service, import msp, organization msp
---

## Using certificates from an external CA with your peer or ordering service

Instead of using a Fabric Operatons Console Certificate Authority as your peer or ordering service's CA, you can use certificates from an external CA, one that is not hosted by Hyperledger Fabric. To use an external CA, the CA needs to issue certificates in <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/identity/identity.html#digital-certificates" target="_blank">X.509 <img src="../images/external.png" width="10" alt="external" valign="middle"></a> format.

### Before you begin

1. You need to gather the following certificate information and save it to individual files that can be uploaded to the console.   
**Note:** The certificates inside the files can be in either `PEM` format or `base64 encoded` format.
	* **Peer or ordering node identity certificate** This is the signing certificate from your external CA that the peer or ordering node will use. This certificate must contain the Organizational Unit (OU) attribute "peer" or "orderer" depending on the type of node it is used for.
	* **Peer or ordering node identity private key** This is your private key corresponding to the signed certificate from your third-party CA that this peer or ordering node will use.
	* **Peer or ordering service TLS CA certificate** This is the public signing certificate created by your external TLS CA that will be used by this peer or ordering node. The certificate needs to contain the x.509 Subject alternative name (SAN) for the peer or ordering nodes. If you are using the <a href="https://hyperledger-fabric-ca.readthedocs.io/en/release-1.4/clientcli.html" target="_blank">Fabric CA client <img src="../images/external.png" width="10" alt="external" valign="middle"></a> to enroll the identity, you specify the SAN by passing the `--csr.hosts` parameter on the `enroll` command. If the host name is not yet known, you can specify a wild card with the domain name, for example: `--csr.hosts '*.fabricv2-cluster.us-south.containers.appdomain.cloud,127.0.0.1'`.
	* **Peer or ordering service TLS CA private key** This is the private key corresponding to the signed certificate from your TLS CA that will be used by this peer or ordering node for secure communications with other members on the network.
	* **CA root certificate** (Optional) This is the root certificate of your external CA. You can also provide an intermediate CA root certificate or both.
	* **TLS CA root certificate** (Optional) This is the root certificate of your external TLS CA. You must provide either a TLS CA root certificate or an intermediate TLS CA certificate, you can also provide both.
	* **Intermediate CA TLS certificate**: (Optional) This is the TLS certificate if your TLS certificate is issued by an intermediate TLS CA. Upload the intermediate TLS CA certificate. You must provide either a TLS CA root certificate or an intermediate TLS CA certificate, you may also provide both.
	* **Peer or ordering service admin identity certificate** This is the signing certificate from your external CA that the admin identity of this peer or ordering service will use. This certificate is also known as your peer or ordering service admin identity key. This certificate must contain the OU attribute "admin".
	* **Peer or ordering service admin identity private key** This is the private key corresponding to the signed certificate from your external CA that the admin identity of this peer or ordering service will use.
	* **Peer or ordering service organization MSP definition** You must manually generate this file by using instructions that are provided in [manually building a MSP JSON file](../using_console/console-organizations.md#manually-building-a-msp-json-file).

2. Import the generated peer or ordering service organization MSP definition file into the console, by clicking the **Organizations** tab followed by **import MSP definition**.

Now you have the choice of creating a peer or single-node ordering service node, or  a five node ordering service.

#### Consideration when using an external CA to generate certificates

If a generated private key is in PKCS #1 format, before it can be used by the console, it needs to be converted to PKCS #8 format by running the following openssl command:
```
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in identity.1.pem -out identity.8.pem
```

Replace:
- `identity.1.pem` with the name of the PKCS #1 private key `.PEM` file.
- `identity.8.pem` with the name that you want to give your PKCS #8 private key `.PEM` file.

Now the private key can be used by the console. If you plan to include it in an [organization MSP](../using_console/console-organizations.md#manually-building-a-msp-json-file) file, it needs to be encoded in base64 format.

### Option 1: Create a new peer or single-node ordering service using certificates from an external CA

>**_NOTE:_** You can skip to **Option 2** if you want to create a new five node ordering service. The following instructions are only for creating a peer or single-node ordering service with certificates from your external CA.

Now that you have gathered all the necessary certificates, you are ready to create a peer or ordering service that uses those certificates. Follow these instructions to create the peer or single-node ordering service with certificates from an external CA.

1. On the **Nodes** tab, click **Add peer** or **Add ordering service**.
2. Make sure the option to **Create** the peer or ordering service is selected. Then click **Next**.
3. After you enter a display name for the node, select the option to use an external CA.
4. Step through the panels and upload the files corresponding to the certificate and private key you gathered.
5. Ensure you select the peer or ordering service organization MSP definition that you imported into the console from the drop-down list.
6. On the last step when you are asked to associate an identity with your peer or ordering service, you need to click **New identity**.
7. Specify any value as the **Display name** for this identity. The display name will be visible in the Wallet after you create the node.
8. In the **Certificate** field, upload the file that contains the **Peer or ordering service admin identity certificate**.
9. In the **Private key** field, upload the file that contains the **Peer or ordering service admin identity private key**.
10. Review the information on the Summary page and click **Add peer** or **Add ordering service**.
11. After you have created the peer or ordering node, you can upload the orderer admin identity to the Fabric Operatons Console. On the **Wallet** tab, click **Add identity**:
 - In the **Name** field, enter an identity name that is used for your reference only.
 - In the **Certificate** field, upload a file that contains the admin identity's signing certificate (in base64 or PEM format).
 - In the **Private Key** field, upload a file that contains the admin identity's private key (in base64 or PEM format).  

	After you upload the certificate and private key of the identity to the console, you can use the console associate the identity with the peer or ordering node.

### Option 2: Create a five node ordering service using certificates from an external CA

 You  have the additional option of deploying a five node ordering service that uses the Raft consensus protocol. Before you deploy a five node ordering service, you need to build a `JSON` file that contains all of the certificates for the five nodes by using the following instructions:

#### Create the certificates JSON file

The required certificates `JSON` file contains an array of five `msp` entries, where each array element contains the certificates for one of the ordering nodes. You must specify unique certificates for each node. Do not reuse certificates across the different ordering nodes. The certificates in the `component` section represent the certificates for the node itself, while the `tls` section includes the certificates issued by the TLS CA.  

- **keystore**: The private key for this node
- **signcerts**: The public key (also known as a signing certificate or enrollment certificate) assigned by the CA for this node.
- **cacerts**: The certificate of the root CA.
- **admincerts**: The certificate of the admin users of the node. This might also be the admin of the organization.
- **intermediatecerts**: If your network includes multi-level CAs, paste in the certificate of the intermediate CA. If you did not use an intermediate certificate, you can leave this field blank.

Using the certificates that you gathered above, paste in the corresponding certificate in the fields below, in base64 format.

You can convert the contents of your certificate file, `<cert.pem>` from `PEM` format into a base64 string by running the following command on your local machine:

```
export FLAG=$(if [ "$(uname -s)" == "Linux" ]; then echo "-d"; else echo "-b 0"; fi)
cat <cert.pem> | base64 $FLAG
```

```json
[
    {
        "msp": {
            "component": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "admincerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            },
            "tls": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            }
        }
    },
    {
        "msp": {
            "component": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "admincerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            },
            "tls": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            }
        }
    },
    {
        "msp": {
            "component": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "admincerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            },
            "tls": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            }
        }
    },
    {
        "msp": {
            "component": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "admincerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            },
            "tls": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            }
        }
    },
    {
        "msp": {
            "component": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "admincerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            },
            "tls": {
                "keystore": “<cert>“,
                "signcerts": “<cert>“,
                "cacerts": [“<cert>“],
                "intermediatecerts": [“<cert>“]
            }
        }
    }
]
```

Save this definition as a ``JSON`` file.

#### Create the ordering service and use the certificates from the external CA for each ordering node

After you create the `JSON` file with all of the certificates for the ordering nodes, you are ready to create the ordering service.

1. On the **Nodes** tab, click **Add ordering service**.
2. Make sure the option to **Create** an ordering service is selected. Then click **Next**.
3. Enter a single **Display name** for the five ordering nodes. The display name that you provide will be the prefix for each ordering node name and a number will be appended to it.
4. In **Number of ordering nodes**, select **Five ordering nodes**. Then select **External Certificate Authority configuration** and click **Next**.
5. Click **Add file** to upload the `JSON` file that contains all of the certificates.
6. Select the **Organization MSP** definition that you imported.
7.  On the next panel, you have the opportunity to configure resource allocation for the nodes. The selections that you make here are applied to all five ordering nodes. If you want to learn more about how to allocate resources to your node, see this topic on [allocating resources](../using_console/console-advanced-deployment.md#allocating-resources).
8. Review the summary and click **Add ordering service**.
9. After you have created the ordering service, you can upload the orderer admin identity to the Fabric Operatons Console. On the **Wallet** tab, click **Add identity**:
  - In the **Name** field, enter an identity name that is used for your reference only.
  - In the **Certificate** field, upload a file that contains the admin identity's signing certificate (in base64 or PEM format).
  - In the **Private Key** field, upload a file that contains the admin identity's private key (in base64 or PEM format).  

	After you upload the certificate and private key of the identity to the console, you can use the console associate the identity with your ordering node.

#### What's next

You have gathered all of your peer or ordering service certificates from your third-party CA, created their corresponding organization MSP definition and created a peer or ordering service. If you are following along in the tutorials, you can return to the next step.
- If you created the peer node, the next step is to [create the node that orders transactions](../getting_started/console-build-network.md#step-two-create-the-ordering-service).
- If you created the node to join an existing network, the next step is to [add your organization to list of organizations that can transact](../getting_started/console-join-network.md#join-the-consortium-hosted-by-the-ordering-service).
- If you created an ordering service, the next step is to [create a channel](../getting_started/console-build-network.md#step-four-create-a-channel).