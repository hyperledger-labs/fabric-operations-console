# System Channel Removal

Hyperledger Fabric v2.2 introduced the capability to create application channels using [channel participation APIs](https://hyperledger-fabric.readthedocs.io/en/latest/create_channel/create_channel_participation.html).
Prior to v2.2, all application channels were created with transactions on the system channel.
Thus, the age of the system channel is now over, and they can (and should) be removed to improve security and performance.
The Fabric Operations console has added support for system-channel removal as of version `v1.0.3-16`.

With the latest console you can now:
- Manage orderers that do not use a system channel.
- Manage application channels that were created with channel participation APIs.
- Remove the system channel and application channels from orderer nodes (aka un-join a channel).

<br/>

**If you decide to upgrade an existing setup, be mindful if you have Node.js chaincode.**
<br/>You should update in stages. See [migration](#migrate-nodejs-chaincode-from-peer-v14x-to-v24x) notes for details.

<br/>

## Why?
Operating without a system channel has the following benefits:
- Increased security
  - The system channel is a shared entity for the consortium. For that reason, it is impossible to hide the existence of channels and their members from other consortium members. Operating without a system channel will allow obscuring channel names and their participants.
- Increased performance
  - The system channel consumes a small amount of CPU, networking and storage costs that can be better utilized for your application transactions.
  - The ability to un-join channels allows you to optimize your ordering nodes by recovering CPU/storage/networking resources from app channels you may no longer need.
- Enhanced channel maintenance
  - The channel participation APIs are lighter weight, easier to use, and deliver more features. This results in less code to manage your channel policies.
- [Fabric prefers it](https://hyperledger-fabric.readthedocs.io/en/latest/create_channel/create_channel_participation.html)
  - Check out their "Benefits of the new process" section

## Create environment without a system channel (requires Fabric v2.4+)
Since [fabric-samples](https://github.com/hyperledger/fabric-samples/tree/main/test-network) has had this feature enabled for some time, their latest code will work.
Meaning if you stand up a **test** network with the latest `fabric-samples` it is already configured to work without a system channel.
  - Channel participation APIs should already be enabled in a [fabric-samples](https://github.com/hyperledger/fabric-samples/tree/main/test-network) `test-network`. To double check, look for the setting `ORDERER_CHANNELPARTICIPATION_ENABLED` in the [config](https://github.com/hyperledger/fabric-samples/blob/main/test-network/compose/compose-test-net.yaml#L39).

### Creating Systemless Orderers - Details
If you need to know the details of creating the new style of ordering service, read on...
The new style of Ordering Service isn't much different than before, in fact it's simpler now.
In the old way each orderer node was given a config block (for a system channel) that was generated prior to creating the orderer container.
Each orderer was fed this block to bootstrap it and get it online.
This process is no longer needed.

"Blank" orderers can now be created and started.
They will simply wait for a channel participation API to join and process application channels.
- Orderers can be either `consenters` or `followers` of an application channel.
The `consenter` part means the same as it always has (it means this orderer's TLS cert is listed in the `consenters` field of the channel's config block & thus this node can participate in the ordering of transactions).
The new status is `follower`.
To be a `follower` means this orderer has joined the app channel, but it is not listed in the `consenter` field of the config block.
It cannot help order transactions, but it can download the ledger and stay up to date.
This is often done to enable some redundancy without adding extra consenter related networking/communication traffic.
A `follower` can always be upgraded to a `consenter` by editing the app channel's config block (and vice versa).
- This means that the old idea of orderers belonging to a central group (the consortium) is gone. Orderers are now a much more loosely grouped entity. They may or may not be members of the same channels. Each orderer can choose to join or unjoin any application channel.
- This also means that appending orderers to an ordering cluster and creating the whole cluster from scratch now follow the same path. Which is to create the nodes, wait for them to start, and then join them to an app channel.

## Remove system channel from existing orderers
Removing the system channel from an existing setup is only a few steps.
We recommend to first put the system channel into maintenance mode.
This will prevent further app channels from being created while the system channel is being removed.
Then it's a matter of "un-joining" the system channel from each orderer.
All the steps can be done from the Operations console.

### Removal Steps:

1. Ensure each orderer in your Ordering Service is running Fabric `v2.4.x` or higher.
2. Put the system channel into maintenance mode
    - This can be done from the console's UI. From the "Nodes" tab click an Ordering cluster tile.
    - Then click the "Ordering nodes" tab.
    - Then click the settings (gear) icon.
    - Then click the "Maintenance" button.
    - Follow the prompts to turn maintenance mode on.
3. Remove system channel from all orderers
    - This can be done from the console's UI. From the "Nodes" tab click an Ordering cluster tile.
    - Then remain on the "Details" tab.
    - Then click the un-join (trash can) icon on the system channel's tile.
    - Follow the prompts to un-join each ordering Node.js from the system channel.

## Migrate Node.js chaincode from Peer v1.4.x to v2.4.x
It's worth noting that Fabric has bumped the version of Node.js that is available for chaincode between Fabric v1.4 and Fabric v2.4 and **dropped the older Node.js support**.
Fabric has moved from Node.js `v12` to using `v16`.
If you are upgrading your peers and orderers (to use the channel participation APIs) you must also incrementally upgrade any Node.js chaincode as well.
Else transaction problems may occur.
1. Upgrade any `v1.4.x` peers to `v2.2.x`
    - Node.js chaincode using the older Node.js version (v12) will continue to work since Fabric `v2.2.x` has both Node.js environments available (v12 & v16)
2. Now update your chaincode locally to use a `v16.14.2` or higher Node.js environment (but still v16)
3. Next perform a [Fabric upgrade](https://hyperledger-fabric.readthedocs.io/en/release-2.2/chaincode_lifecycle.html#upgrade-a-chaincode) on each channel where this chaincode is used.
4. Finally upgrade your `v2.2.x` peers to Fabric `v2.4.x`.

## Console differences with no system channel
You will notice a few differences when using the console with an ordering cluster with no system channel.
Firstly, after you click the ordering cluster tile you may see a warning about missing a TLS identity.
This identity is a different type than we've used in the past (it is not something you would have added to your wallet before).
The identity we need to manage channels is now the same identity the orderer is using when it enrolls on startup against the TLS CA.
To get this identity:
- From the nodes page, select the CA tile that this orderer cluster used
- Find the row for your identity for this orderer and click the dot dot dot
- On the enroll wizard select the * TLS CA * in the CA drop down (**this is important**)
- Type the enroll secret
- Follow any other directions in the enroll wizard and click submit
- Go back to the nodes page and select your Orderer Cluster tile
  - The TLS error should be gone and you should be able to manage these orderers!

Something else that is new is the process of joining orderers to application channels.
This can be done in many different places on the console.

1. You can join orderers right after using the create channel wizard. The new join orderer process will open automatically. You can also skip this step and join orderers later. Deferring to join orderers will leave a pending channel tile on the channel page.
1. If you have a pending channel tile on the channel page you can simply click it to start the join orderer process. Once this is complete the pending channel tile will be removed. Further joins to this channel will requiring clicking the ordering cluster tile from the nodes page.
1. From the nodes page you can click an ordering cluster tile to get to the ordering cluster details page. From an ordering cluster details page you can click the `Join channel` blue button on the top right. This will allow joining this cluster's nodes to any channel that already has a joined orderer. However this page cannot join pending channels (channels with no orderers). Meaning some other orderer must already be joined to the channel.
1. From an ordering cluster details page you can click the plus sign button on each channel tile. This will start the join orderer process for the selected channel.

Once you are on the join orderer wizard, simply check the specific nodes to join and then click the blue "Join channel" button to submit.
