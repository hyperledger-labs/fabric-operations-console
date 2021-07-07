# Appending Raft Nodes Notes
Aka adding a new orderer node to an existing raft orderer cluster.
- Reference [Deployer's Raft APIs](https://github.ibm.com/IBM-Blockchain/blockchain-deployer/blob/master/docs/ibp2.0_apis.md#add-orderer-to-existing-raft-cluster)

## Developer Steps:
Follow these steps to add a new node to an existing raft cluster.

**updated 08/26/2019**

1. Call the [athena api 1b](./deployer_apis.md#immediate2) to prepare an orderer node.
	- notice that `consenter_proposal_fin` in the response is `false`. this indicates the node is not ready for fabric work. in the UI it should use a different color/style or icon than other raft nodes.
1. Create a config block update that adds the new consenter. Follow these steps:
	- first get the TLS cert of the new orderer node with [this athena api](./deployer_apis.md#get_deployer_data).
	- then get the latest config block from another orderer [using stitch](https://github.ibm.com/IBM-Blockchain/stitch/tree/master/docs#getChannelConfigBlockFromOrderer):
		```js
		const opts4 = {
			msp_id: 'msp1',          //
			client_cert_b64pem: '',  // identity crypto material
			client_prv_key_b64pem: '',  // identity crypto material
			host: '',          // a WORKING orderer here (not the new one)
			channel_id: 'testchainid',  // system channel id
			include_bin: true,      // get the raw binary
		};
		stitch.getChannelConfigBlockFromOrderer(opts4, (e3, resp3) => {
			if (e3 || !resp3 || !resp3.data) {
				logger.error(e3, resp3);
			} else {

				// decode bin with v2 decoder
				const block = stitch.decodeBlockV2(resp3.grpc_message);
				logger.log('config block decoded v2:', JSON.stringify(block, null, 2));
			}
		});
		```
	- alter the config block by adding the new orderer's info. There are two fields to edit:
		```js
		// deep copy current block, will need both blocks
		const updated = JSON.parse(JSON.stringify(block));

		// field 1
		updated.data.data[0].payload.data.config.channelGroup.groups.Orderer.values.ConsensusType.value.metadata.consenters.push({
			clientTlsCert: new_orderers_tls_cert,
			host: new_orderers_hostname,
			port: new_orderers_port,
			serverTlsCert: new_orderers_tls_cert
		});

		// field 2
		updated.data.data[0].payload.data.config.channelGroup.values.OrdererAddresses.value.addresses.push(new_orderers_hostname + ':' + new_orderers_port);
		```
	- calculate a delta config update using configtxlator via stitch:
		```js
		const delta_opts = {
			cfxl_host: configtxlator_url,  // includes proto + host + port

			// do not send the entire block. just the config part.
			// configtxlator expects underscores instead of camel case
			original_json: stitch.camelCase_2_underscores(block.data.data[0].payload.data.config),
			updated_json: stitch.camelCase_2_underscores(updated.data.data[0].payload.data.config),
			channel_id: 'testchainid',  // system channel id
		};
		stitch.calculateConfigUpdatePb(delta_opts, (error, b_configUpdate) => {});
		```
1. Gather signatures you need for this update (the number depends on # of orgs and the policy):
	```js
		const b64_string = stitch.uint8ArrayToBase64(b_configUpdate); // first convert it to base 64
		const s_opts = {
			client_cert_b64pem: org1_cert,  // this is my cert in base 64 encoded PEM
			client_prv_key_b64pem: org1_private_key,  // this is my private key in base 64 encoded PEM
			protobuf: b64_string,
			msp_id: 'PeerOrg1',
		};
		stitch.signConfigUpdate(s_opts, (err, config_signature_as_b64) => {});
	```
1. Store signature tx in [athena using api](./signature_collection_apis.md#3-store-signature-collection-tx). Repeat this step and previous step as needed. Remember to include the field `reference_component_ids` in the sig collection request. The field should be an array of strings including the component id(s) of the raft node(s) you are adding. This will help apollo know which sig collection tx is for which raft node.
1. Submit the config block update proposal via stitch:
	```js
		const c_opts = {
			msp_id: 'PeerOrg1',
			client_cert_b64pem: org1_cert,
			client_prv_key_b64pem: org1_private_key,
			orderer_host: orderer_url,  // this is a url to a grpc-web proxy for my orderer
			config_update: b64_string,
			config_update_signatures: [config_signature_as_b64],
		};
		stitch.submitConfigUpdate(c_opts, (err, resp) => {});
	```
	I've seen it take 2.5 minutes before the new raft node gets the config block update. A manual restart should help.
1. Get the latest config block (again). Do not use the previous block you found in step 2.
	```js
		const opts4 = {
			msp_id: 'msp1',          //
			client_cert_b64pem: '',  // identity crypto material
			client_prv_key_b64pem: '',  // identity crypto material
			host: '',          // a WORKING orderer here (not the new one)
			channel_id: 'testchainid',  // system channel id
			include_bin: true,      // get the raw binary
		};
		stitch.getChannelConfigBlockFromOrderer(opts4, (e3, resp3) => {
			if (e3 || !resp3 || !resp3.data) {
				logger.error(e3, resp3);
			} else {

				// convert it to base 64
				const b64_config_block = stitch.uint8ArrayToBase64(resp3.grpc_message);
				console.log('base 64 config block:', b64_config_block);
			}
		});
		```
1. Submit the latest config block to deployer which will start the node. [athena submit component api](./component_apis.md#submit).
1. Edit the component doc and set `consenter_proposal_fin: true` using the [athena edit component api](./component_apis.md#edit). This will indicate that the node is ready for work.
1. Celebrate



# Brainstorming Notes

Unless you are david, you don't need to read this section and below

**[Idea 1] Dev steps to add node to a raft cluster:**
(This idea sends the genesis after the config update)
- **rejected** 08/08/2019 - for taking too many steps, a lot of back and forth between athena and apollo
- **update, selected** 08/26/2019 - going to use this idea after all, the other one had odd errors

1. Apollo gathers info on new raft node from customer and sends to Athena.
	- (state: `null`)
1. Athena calls deployer to "pre-create" a new orderer node. "pre-create" means deployer creates an orderer w/o a genesis block.
	- (update state: `waiting_on_tls_cert`)
1. Apollo proxy polls on athena for the deployer api to GET the tls cert for the new orderer node. Apollo spins here until successful or timeout.
1. Apollo gets the latest system channel config block from another (working) orderer node in the cluster.
1. Apollo builds a new config block (add the new orderer info).
1. **[If there are multiple orgs]:** Apollo opens new signature collection process on Athena for this block.
	- (update state: `waiting_for_signatures`)
1. **[Else]:** Apollo opens new signature collection process on Athena and auto signs as org. GO TO STEP 9.
	- (update state: `waiting_for_block_update`)
1. The customer completes the sig collection process.
	- (update state: `waiting_for_block_update`)
1. Apollo submits updated config block to a working orderer node.
	- (update state: `waiting_for_genesis`)
1. Finally Apollo sends the **genesis block** of the system channel to athena to proxy the block to deployer. This will finalize the new orderer node.
	- (update state: `complete`)

**[Idea 1] Green Path:**
 - `null` -> `waiting_on_tls_cert` -> `waiting_for_signatures` -> `waiting_for_block_update` -> `waiting_for_genesis` -> `complete`

**[Idea 1] User Steps:**
There are a few "plateaus" where the user can vanish for an unlimited time w/o breaking their progress.
These are just states w/o automatic progress or timeout errors.
From the user's perspective there are 4 steps:
- `Init Raft Node` -> `Get Genesis` -> `Gather Signatures` -> `Submit Config & Genesis`

It should be possible for a single org raft cluster to go through each step automatically.
If the "append raft node" panel is left open, we step automatically.
Else the user needs to click each step to proceed

```
// Example Raft Node Panel:
// - panel opens on either flow:
//    - after successful submission of the pre-create raft node deployer api
//    - when a pending raft node tile is clicked
// - steps progress automatically if panel is left open && 1 org raft
// 	  - if a step button auto clicks, disable button to prevent user from clicking again
// - once panel opens it should evaluate if all signatures are present, auto check this step if done
//
// -----------------------------------
// Raft1 Progress
//
// |-------------------------|
// |  [√] Init Raft Node     | <- not clickable, always checked
// |_________________________|
//             |                 [spinner] <- spins when any action pending
// |-------------------------|
// |  [ ] Get Config Block   | <- clickable if not spinning, fires dev step 3 & 4 & 5
// |_________________________|
//             |
// |-------------------------|
// |  [ ] Gather Signatures  | <- not clickable, or maybe opens notifications?
// |_________________________|
//             |
// |------------------------------|
// |  [ ] Submit Config & Genesis | <- clickable if not spinning, fires dev step 9 & 10, or 10
// |______________________________|
//
// -----------------------------------
//
```

***

<a name="idea2"></a>

**[Idea 2] Dev steps to add node to a raft cluster:**
(This idea sends the genesis before the config update. Handle a long request between apollo and athena)

- **selected** 07/31/2019 - going to implement this idea dsh
- **update, rejected** 08/26/2019 - had odd errors ""


1. **[Tx1 Init]** Apollo gathers info on new raft node from customer **and the genesis block** and sends to Athena.
1. **[Tx1 Continued]** Athena calls deployer to "pre-create" a new orderer node. "pre-create" means deployer creates an orderer w/o a genesis block.
1. **[Tx1 Continued]** Athena sends the **genesis block** of the system channel to deployer and retries until success or gives up.
1. **[Tx1 Response]** Athena replies to apollo, indicating the pre-create and genesis steps are done.
1. **[Tx2]** Apollo asks Athena to get the tls cert from deployer and sends it back to apollo.
1. **[Tx3]** Apollo gets the latest system channel config block from another (working) orderer node in the cluster.
1. **[-]** Apollo builds a new config block (add the new orderer info).
1. **[Tx4]** Apollo opens new signature collection process on Athena for this block.
1. **[-]** The customer completes the sig collection process.
1. **[Tx5]** Apollo submits updated config block to a working orderer node.

***

<a name="idea3"></a>

**[Idea 3] Dev steps to add node to a raft cluster:**
(This idea sends the genesis before the config update (same as idea 2) but its a short request, put state in doc + apollo polling)
- **rejected** b/c the state stuff, while more robust, is too much. especially since it doesn't take more than 30 seconds to combine the steps and make 1 "atomic" operation. we don't need states.

1. Apollo gathers info on new raft node from customer **and the genesis block** and sends to Athena.
	- (state: `null`)
	- Apollo polls on the GET component api in athena. It is looking for the `in_state` to change to `complete`. It stays here forever. No timeout for apollo. Athena will communicate the timeout via `in_state` field.
1. Athena calls deployer to "pre-create" a new orderer node. "pre-create" means deployer creates an orderer w/o a genesis block.
	- (update state: `waiting_on_tls_cert`)
1. Athena polls deployer api to GET the tls cert for the new orderer node. Athena spins here until successful or timeout. Athena stores tls cert in doc.
	- (update state: `sending_genesis` or `timeout_on_tls_cert`)
1. Athena sends the **genesis block** of the system channel to deployer via the "pre-create final" api.
	- (update state: `complete`)
1. Apollo gets the latest system channel config block from another (working) orderer node in the cluster.
1. Apollo builds a new config block (add the new orderer info).
1. Apollo opens new signature collection process on Athena for this block.
1. The customer completes the sig collection process.
1. Apollo submits the updated config block to a working orderer node.

**[Idea 2 & 3] User Steps:**

From the user's perspective there are 3 steps:
- `Init Raft Node` -> `Gather Signatures` -> `Submit Genesis`

```
// Example Raft Node Panel:
// - panel opens on either flow:
//    - after successful submission of the pre-create raft node deployer api
//    - when a pending raft node tile is clicked
// - once panel opens it should evaluate if all signatures are present, auto check this step if done
//
// -----------------------------------
// Raft1 Progress
//
// |-------------------------|  [spinner] <- spins when setting up node
// |  [ ] Init Raft Node     | <- not clickable
// |_________________________|
//             |
// |-------------------------|
// |  [ ] Gather Signatures  | <- not clickable, or maybe opens notifications?
// |_________________________|
//             |
// |-------------------------|  [spinner] <- spins when submitting config
// |  [ ] Submit Config      | <- clickable if not spinning, fires dev step last
// |_________________________|
//
// -----------------------------------
//
```

***

**Other Notes:**

- Should probably support appending multiple raft nodes at a time, but later. **update - a comment in the fabric code says we can't**
- Can submit the latest config block to the new orderer or genesis block (0).
- It might be possible to send the genesis block to the new orderer before we make the config block update. **update - confirmed**
- The pre-create + genesis block sending is pretty quick, under 15 seconds. so waiting for these 2 things to settle is not too bad.
- I've seen it take 2.5 minutes before the new raft node gets the config block update. Jason says restarting the node should speed this up.
