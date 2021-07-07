# Appending Raft Nodes - The API way

So you want to extend your raft ordering service manually?
The easy way is to use the IBP UI, but if that is not an option then these instructions _should_ help.
This is a long complicated process.
I have lost many on this quest, stay close and be vigilant.

Before we begin it will behoove us to point out the pre-reqs:
1. A working orderer service running Hyperledger Fabric v1.4.3+.
	- Each orderer is configured to use  `etcdraft`.
1. An IBM Blockchain Platform instance that has onboarded or created your ordering service.
1. The code + knowledge to perform these 3 Fabric operations:
	- get a config block from an orderer
	- submit a config block update to an orderer
	- produce a signature on a config block update for each Orderer MSP (or at least enough signatures to satisfy your system channel's update policy).

### Definitions:
- **Existing Orderer** - An **existing** orderer is already a valid consenter for your ordering service. It does not matter which one you use, it doesn't matter if its currently the leader. It should be up and running. It must be using `etcdraft`.
- **New Orderer** - The **new** orderer is the one we are appending. It does not exist in any form yet.

### Noteable Notes:
- Fabric limits consenter changes to 1 at a time. This means only 1 consenter addition, or 1 removal. Not both, not 2, only uno changes. Repeat these steps if you need multiple changes.
- Removing a consenter is largely the same as appending. The only difference is when editing the config block data you will remove the consenter url & tls information instead of appending.
- For Fabric operations I'd recommend using the [node.js sdk](https://fabric-sdk-node.github.io/release-1.4/index.html), but other Fabric compatible tools should work.


# Begin

1. **Init the orderer**

	The very first thing to do is to init or start an orderer.
	The orderer container must be created and ran far enough to build its unique TLS certificate.
	This is a fundamental first step because the TLS certificate forms the orderer's identity on the ordering service.
	It is what we will add to the config block to join as a consenter.
	- note that the orderer is not "fully" running.
	it was not given a block to boot strap from, so its only going to make a tls cert and hang out until we come back for it.
	- accomplish this by running the [pre-create orderer api](https://test.cloud.ibm.com/apidocs/blockchain#create-an-ordering-service)
		- setting `cluster_id` is how you turn the normal create-orderer into a pre-create-orderer api

1. **Retrieve the TLS Certificate**

	We need to retrieve this tls cert from the **new** orderer.
	The orderer isn't created instantly so you will need to wait and poll on this endpoint until it is successful or you lost your patience.
	- accomplish this by running the [retrieve the certificate IBP api](https://cloud.ibm.com/apidocs/blockchain) on the **new** orderer
	- the certificate you need is in the JSON field `"tls_cert"`
		- it will be a base 64 encoded PEM file

1.  **Get the Latest Config Block**

	OK. Next we want to edit the latest config block in order to add our new consenter.
	Thus we need to get the latest config block.
	- Use the some fabric cli/tool/api/thing to [retrieve the latest config block](https://fabric-sdk-node.github.io/release-1.4/Channel.html#getChannelConfig) from an **existing** orderer

1.  **Edit the Config Block**

	Now append the **new** orderer's TLS certificate and ip information to the current block.
	There are 2 fields to edit in the block. A JavaScript example is shown below:

	```js
		// JS Example:
		// This code assumes the current config block JSON is inside the var `block`

		// clone `block` - we want the original block and the updated block in different variables
		const updated = JSON.parse(JSON.stringify(block));

		// Edit #1 - Append New Consenter to Metadata
		updated.data.data[0].payload.data.config.channelGroup.groups.Orderer.values.ConsensusType.value.metadata.consenters.push({

			// the new orderer's hostname, do not include protocol
			host: new_orderers_hostname,

			// the new orderer's port, as a number
			port: new_orderers_port,

			// the new TLS certificate here
			// the certificate should be a string that is a base 64 encoded PEM file
			serverTlsCert: new_orderers_tls_cert_base64

			// the new TLS certificate here (again)
			// the certificate should be a string that is a base 64 encoded PEM file
			clientTlsCert: new_orderers_tls_cert_base64,
		});

		// Edit #2 - Append New Consenter to OrdererAddresses
		const address = new_orderers_hostname + ':' + new_orderers_port;
		updated.data.data[0].payload.data.config.channelGroup.values.OrdererAddresses.value.addresses.push(address);
	```

1. **Marshal the Config Update**

	Next convert this JSON into a ["ConfigUpdate"](https://github.com/hyperledger/fabric/blob/release-1.3/protos/common/configtx.proto#L78).
	Do this by sending the "config block before" and "config block after" to the delta/comparison REST route of the Fabric tool [configtxlator](https://hyperledger-fabric.readthedocs.io/en/release-1.4/commands/configtxlator.html#configtxlator-compute-update). This will make a structure that a Fabric orderer can understand.
	- the IBP service already has a configtxlator hosted for you. Find the url for it by using your [/ak/api/v1/settings IBP api](https://cloud.ibm.com/apidocs/blockchain#get-settings-for-the-ibm-blockchain-platform-conso). The configtxlator url weill be found in the JSON variable `"CONFIGTXLATOR_URL"`.
	- perform the [update config REST API on configtxlator](https://github.com/hyperledger/fabric/blob/release-1.4/common/tools/configtxlator/rest/router.go#L33)
		- the output of this API will be unreadable binary data
		- store it somewhere somehow

1. **Sign the Config Update**

	Right, now for the complicated part (I know right?).
	We need to sign the "ConfigUpdate" (the binary data you made in the last step) 1 or more times.
	The exact number of signatures depends on the current system channel policy.

	- the signature structures are binary and represent the Fabric protobuf ["ConfigSignature"](https://github.com/hyperledger/fabric/blob/release-1.4/protos/common/configtx.proto#L111)
	- store each signature structure binary somehow somewhere

1. **Submit the Config Update**

	Now that we have the right changes and it has all the right signatures (we hope), we need to submit it.
	- use the some fabric cli/tool/api/thing to [build a "SignedProposal"](https://github.com/hyperledger/fabric/blob/release-1.4/protos/peer/proposal.proto#L105) out of your "ConfigUpdate" and array of "ConfigSignature"s
	- use the some fabric cli/tool/api/thing to [submit the "SignedProposal"](https://fabric-sdk-node.github.io/release-1.4/Channel.html#sendSignedProposal) to an **existing** orderer

1.  **Get the Latest Config Block**

	After submitting we need to wait for it to be committed.
	Should take between 0 & 5 minutes.
	You could poll on the latest config block api (looking for your changes), or wait on the commit event of your tx id.

	Once this update is committed, retrieve the latest config block (deja vu).
	Same steps as last time:
	- Use the some fabric cli/tool/api/thing to [retrieve the latest config block](https://fabric-sdk-node.github.io/release-1.4/Channel.html#getChannelConfig) from an **existing** orderer

1. **Finalize the new Orderer**

	Finally we need to startup the **new** orderer by giving it the latest config block.
	It will boot strap from it, become aware of the other consenters and start to contribute to our ordering service workload.
	- Use the [submit config block orderer api](https://test.cloud.ibm.com/apidocs/blockchain#submit-config-block-to-orderer)
	- All done!
