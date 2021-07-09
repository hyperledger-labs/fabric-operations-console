---
layout: default
title: Advanced channel deployment and management
parent: Advanced deployment options
nav_order: 1
description: "Advanced channel deployment and management in Fabric Operations Console"
keywords: network components, Kubernetes, batch timeout, channel update, channels, governance, channel configuration, access control
---

# Advanced channel deployment and management

When you create a channel, there are a number of advanced options that allow you fine tune the configuration of your channel to fit your use case. In this topic we'll discuss how to edit those options as part of creating a channel or when editing a channel after it has been created.

**Target audience:** This topic is designed for network operators who are responsible for creating, monitoring, and managing channels.


>**_TIP:_** The roles played by the various participants in channel creation, as well as the underlying method used to create and update the channel configuration, is inherited from the <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/configtx.html" target="_blank">Hyperledger Fabric processes for creating and editing a channel <img src="../images/external.png" width="10" alt="external" valign="middle"></a>.

The parameters that govern how channels function, from the organizations on the channel to their permissions to the policies, are all contained in the channel configuration. When you create a channel, you are asked to decide on a number of these parameters. Some options, such as the channel name, cannot be changed after a channel has been created, while other options can only be changed after the channel has been created.

## General options

For an overview of the channel creation process that ignores the advanced options, see [Step four: Create a channel](../getting_started/console-build-network.md#step-four-create-a-channel).

* **Channel name**. Channels should be given distinctive names relevant to the purpose of the channel. Each ordering service can only have a single channel with a given name. If you see an error that a name has already been given to a channel on that ordering service, you will have to select a new name.

* **Ordering service**. Channels are hosted on a single ordering service and cannot be migrated from one ordering service to another.

* **Organizations**. This section of the panel is how organizations are added or removed from a channel. Organizations that can be added can be seen in the drop-down list. Note that an organization must be a member of the consortium of the ordering service before it can be added to a channel. For more information about how to add an organization to the consortium, see [add your organization to list of organizations that can transact](../getting_started/console-build-network.md#step-three-join-the-consortium-hosted-by-the-ordering-service).

  You can also update an organization's level of permission on the channel:

   - A channel **operator** has permission to create and sign channel configuration updates. There must be at least one operator in each a channel.
   - A channel **writer** can update the ledger by invoking a smart contract. A channel writer can also instantiate a smart contract on a channel.
   - A channel **reader** can only query the ledger, by invoking a read only function in smart contract for example.

* **Update policy**. The update policy of a channel specifies how many organizations (out of the total number of operators in the channel), who must approve of an update to the channel configuration. To ensure a good balance between collaborative administration and efficient processing of channel configuration updates, consider setting this policy to a majority of admins. For example, if there are five admins in a channel, choose `3 out of 5`.

## Advanced options

By clicking the box under advanced options, users can access parameters that users should take caution in updating. Note that if you are attempting to change any parameter that requires the signature of ordering service admins (for example, the **Block cutting parameters** or **ordering service consenters**) and are one of the ordering service admins on this channel, you will see a field for the ordering service organization. Select the MSP of the relevant ordering service organization from the drop-down list (if you are not an ordering service admin, the MSP will have to be exported to you). If you are not an admin of the ordering service organization, you can still make a request to change one of the block cutting parameters, but the request must be signed by an ordering service admin.

If the signature of an ordering service org admin is required, you will not see a pending tile for the channel in your console until the ordering service org has signed the request. When you see the tile, you can join your peer to it.
{:tip}

* **Capabilities**. If you're unfamiliar with capabilities, check out <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/capabilities_concept.html" target="_blank">channel capabilities <img src="../images/external.png" width="10" alt="external" valign="middle"></a> in the Fabric documentation. Note that there is a strict relationship between the Fabric version of your nodes and the levels of certain capabilities that must be followed to ensure that nodes do not crash and desired functionalities are available. Currently, only **application** and **orderer** capabilities can be set during channel creation. For information about **channel** capabilities (which are a level of capabilities that span both ordering nodes and peers and do not refer to "capabilities on the channel") and how to change them, check out the [capabilities](#capabilities) section below.

* **Lifecycle endorsement policy**. (Only available on networks using v2.0 `application` capabilities) This defines how many channel members must approve a smart contract definition before the smart contract can be used on the channel. This is different from the endorsement policy of the smart contract itself as it has nothing to do with the transactions invoke against the smart contract. Rather, the lifecycle endorsement policy is the criteria by which the organizations on the channel collaboratively decide to use a particular smart contract and agree on certain parameters. It is possible to make the lifecycle endorsement policy **ALL** (which means every channel member must approve the definition), **ANY** (which means any channel member can approve the definition), or to define a specific set of organizations. Note that if you don't specify a lifecycle endorsement policy, it defaults to **MAJORITY**, which means that a majority of **Admins** on the channel will have to approve smart contract definitions. For more information about smart contract lifecycle endorsement, see [deploy a smart contract using Fabric v2.x](../smart_contracts/console-smart-contracts-v2.md).

* **Smart contract endorsement policy**. (Only available on networks using v2.0 capabilities) If a smart contract definition does not define an endorsement policy for its transactions, the endorsement policy defined here will become the endorsement policy of the smart contract. By default this policy is **MAJORITY**, which means a majority of endorsing organizations will have to approve transactions that are invoked against this smart contract. However, as with the lifecycle endorsement policy, it is possible to make the endorsement policy **ALL**, **ANY**, or to define a specific set of organizations. For more information about default endorsement policies, see [install and propose a smart contract](../smart_contracts/console-smart-contracts-v2.md#step-two-install-and-propose-smart-contract).

* **Block cutting parameters**. These fields determine the conditions under which the ordering service cuts a new block. For information on how these fields affect when blocks are cut, see the [block cutting parameters](#block-cutting-parameters) section below. Note that changing these parameters will require the signature of an ordering service admin. If you are an ordering service admin, you can sign this update using the **Ordering service organization** panel.

* **Ordering service administrator** (only available when updating a channel). This section shows the ordering service administrator organizations for this channel. By default, all ordering organizations that are administrators are added to an application channel at channel creation time. If an ordering service organization was added as an administrator of the system channel after this application channel was created, it must be added here before any nodes belonging to it can be added as application channel consenters. Note: if your console is at a build before `2.1.3-104`, you will not see this option. To see the version of your build, click on the support icon in the upper right  corner (it resembles a question mark). 

* **Consenter set**. The ordering service nodes on a particular channel are known in a Raft consensus mechanism as a "consenter set". For this reason, the ordering nodes in a consenter set are sometimes referred to as "consenters". The orderer system channel will always contain all of the possible consenters available in a network (its consenter set is "all consenters"), while application channels might have all consenters or some subset of consenters. It is possible to add or remove particular nodes from this consenter set during both the creation of a channel and through a channel update (for example to add newly created nodes, which are first added to the system channel, to the consenter set of an application channel). To add a node to the consenter set, first ensure that the organization that owns the consenter is an admin of the ordering service of the application channel through the **Ordering service administrator** panel. You can then add the consenter through this **Consenter set** panel by opening the drop-down list, clicking on a node, and clicking **Add**. If you modify the consenter set, you also have the ability to change the size of the ordering service Snapshot. For more information about Snapshots, see <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/orderer/ordering_service.html#snapshots)" target="_blank">snapshots <img src="../images/external.png" width="10" alt="external" valign="middle"></a> in the Fabric documentation.

* **Ordering service signature**. If changes to the configuration are made that require the signature of an ordering service org admin (for example, to the block cutting parameters, orderer capability, or consenter set), this panel will allow you to send the change to the relevant ordering service admin organization. The console where the ordering service organization MSP was created will see a signature notification. After the ordering service organization signs the channel update request, it is sent back to the organization that requested the channel update to be submitted.

* **Access control lists (ACLs)**. To specify a finer grained control over resources, you can restrict access to a resource to an organization and a role within that organization. For example, setting access to the resource `ChaincodeExists` to `Application/Admins` would mean that only the admin of an application would be able to access the `ChaincodeExists` resource. Users have the option to edit the access control list one at a time or by uploading a JSON containing the list. For more information about Access Control, see <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/access_control.html" target="_blank">access Control Lists (ACLs) <img src="../images/external.png" width="10" alt="external" valign="middle"></a> in the Fabric documentation.

  >**_IMPORTANT:_** If you restrict access to a resource to a particular organization, be aware that only that organization will be able to access the resource. If you want other organizations to be able to access the resource, you will have to add them one by one. As a result, consider your access control decisions carefully. Restricting access to certain resources in certain ways can have a highly negative effect on how your channel functions.

## Updating a channel configuration

While creating a channel and updating a channel have the same goal, giving users the ability to ensure that the configuration of their channel is as well suited as possible to their use case, the two processes are in fact very different **as tasks** in the console. Creating a channel is a process undertaken by a **single organization**. As long as an organization is a member of the consortium of the ordering service, they can create the channel in any way they want. They can give it any name, add any organizations (as long as they are a member of the consortium), assign those organizations permissions, set access control lists, and so on.

The other organizations have the choice of whether to participate in this channel (for example, whether to join peers to it), but it is assumed that the collaborative process of deciding on the channel configuration will happen out of band, before an organization creates the channel.

Updating a channel is different. Rather than an organization acting alone, channel updates follow the collaborative governance procedures that are fundamental to the way the Fabric  Operatons Console functions. This collaborative process involves sending the channel configuration update requests to operator organizations that have an administrative role in the channel.

Because selecting [anchor peers](#anchor-peers) and [joining a peer to a channel](#join-a-peer-to-a-channel) are actions that only require the signature of the organization performing the action, they are updated through the **Channel details** panel inside a channel. To update other parameters, you must click on the **Settings** button next to the channel name at the top of the page and initiate a channel configuration update transaction. A panel will appear that looks very similar to the panel you use to create a channel.

### Signature collection flow

>**_IMPORTANT:_** For signatures to be verified, all of the organizations on a channel (including the ordering service organizations) should export the MSPs representing their organizations to the other organizations on the channel. To export an MSP, click the download button on your MSP (on the **Organizations** tab), then send it to other organizations out of band. When you receive an MSP JSON file, import it using the **Organizations** panel. For more information about exporting and importing, including information about to export and import in bulk, see [Importing nodes](../using_console/console-import-nodes.md).

Whenever a channel request is made that requires signatures (whether it is during channel creation, as when an ordering service admin signature is required, or during a channel update, when channel operators will likely need to sign), it will be sent to the organizations in the channel whose signatures are required. For example, if there are five operators (channel admins) in a channel, an update request will be sent to all five. For the channel request to be approved, the number of channel operators listed in the **channel update policy** must be satisfied. If this policy says `3 out of 5`, the new channel configuration update will take effect after three organizations have signed it and it has been submitted.

This process of knowing when you have an update to sign, as well as signing it, is handled through the **Notifications** button (which looks like a bell) in the top right of the console. When you see a blue dot on the **Notifications** button, it means that you either have a pending request to evaluate or are being notified of a channel-related event.

When you click on the **Notifications** button, you may have one or more actions you have the ability to take:

* **Needs attention**: a request needs to be signed or submitted (if all required signature have already been collected). The request might be to either your peers or ordering service, depending on the organizations in your console.
* **Open**: includes everything that **needs attention** as well as requests that have been signed by the user but still need to be signed by one or more other channel members.
* **Closed**: requests that have been submitted. No actions to be taken on these items. They can only be viewed.
* **All**: includes both open and closed requests.

If a channel configuration update request has been made, you have the ability to click on **Review and update channel configuration** and see the changes to the channel configuration update that are being proposed or have been made (if the new channel configuration has been approved). If you are an operator on the channel, and not enough signatures have been gathered to approve the channel configuration update request, you will have the ability to sign the update request.

>**_NOTE:_** You are not required to sign a channel configuration update, however note that there is no way to sign **against** a channel update. If you do not approve of a channel configuration update, you can simply close the panel and reach out to other channel operators out of band to voice your concerns. However, if enough operators in the channel approve of the update to satisfy the channel update policy, the new configuration will take effect.

### Channel configuration parameters you can update

It's possible to change many, but not all, of the configuration parameters of a channel after the channel has been created. The **Channel name**, for example, cannot be edited, nor can the ordering service where the channel is hosted.

First thing you will see is the **Organization updating channel** panel. Here you will specify the organization (MSP) and admin identity that will be submitting this channel configuration update. From here, you can navigate down to the parameter you want to change, which includes all of the same parameters you specified when creating the channel other than the **channel** capabilities and the **ordering service administrator**, which are only available when updating a channel.

>**_TIP:_** If your console is at a build before `2.1.3-104`, you will not see the **ordering service administrator** option. To see the version of your build, click on the support icon in the upper right corner (it resembles a question mark). 

If you are attempting to change any parameter that requires the signature of ordering service admins (for example, the **Block cutting parameters** or **ordering service consenters**) and are one of the ordering service admins on this channel, you will see a field for the ordering service organization. Select the MSP of the relevant ordering service organization from the drop-down list. If you are not an admin of the ordering service organization, you can still make a request to change these fields, but the request must be signed by an ordering service admin.

When you are done making your updates, the **Review channel information** panel will allow you to review your changes and then submit them.

#### Anchor peers

Because cross organizational <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/gossip.html" target="_blank">gossip <img src="../images/external.png" width="10" alt="external" valign="middle"></a> must be enabled for service discovery and private data to work, each organization should specify at least one <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/gossip.html#anchor-peers)" target="_blank">anchor peer <img src="../images/external.png" width="10" alt="external" valign="middle"></a> on each channel. This anchor peer is not a special **type** of peer. It is just the peer that bootstraps cross organizational gossip.

Note that while anchor peers are a channel configuration parameter, they are not set through the normal process of creating and editing a channel configuration.

To configure a peer to be an anchor peer, click the **Channels** tab and open the channel where the smart contract was deployed.
 - Click the **Channel details** tab.
 - Scroll down to the Anchor peers table and click **Add anchor peer**.
 - Select at least one peer from each organization in collection definition that you want to serve as the anchor peer for the organization. For redundancy reasons, you can consider selecting more than one peer from each organization in the collection.

#### Join a peer to a channel

The ordering service and the peers known to this console that are joined to this channel are listed in the **Nodes** field at the top of the channel page. It is possible to add peers to this channel by clicking the **Join peer** button. On the panel that opens, you can specify the peers you want to join this channel, as well as whether you want this peer to bootstrap gossip communication between your organization and other organizations by making this peer an anchor peer. If you already have specified an anchor peer for this channel, you do not need to make this peer an anchor peer (only one anchor peer is needed to bootstrap communication between organizations), though it is sensible to make anchor peers HA by making sure you have at least two anchor peers in each channel.

As with the process for joining any peer to any channel, make sure that the [database type](console-adv-deployment.md#state-database) of this peer is compatible with the database type of the channel. Similarly, ensure that the Fabric level of this peer is at the [application and channel capability](#advanced-options) levels of the channel.

Note that after a peer is removed from a channel, it might still show as being joined to the channel. This is because the ledger information of the channel up to the point the peer was removed is still available on the peer. Removing the peer from the channel means that the peer will receive no new channel updates, including the update that indicates that it is no longer a part of the channel. If you have any other peers joined to the channel, you can check the ledger height of those peers as compared to the peer that was removed to confirm that the removed peer is not receiving new blocks.

#### Capabilities

>**_TIP:_** For a thorough look at what capabilities are how they work, check out <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.2/capabilities_concept.html" target="_blank">channel capabilities <img src="../images/external.png" width="10" alt="external" valign="middle"></a>

The capability levels of a channel and the Fabric versions in the nodes on that channel must be coordinated in order for nodes and channels to function properly. That is because both nodes and capabilities work together to ensure that transactions are handled deterministically (that is, that all of the nodes process a transaction the same way). While the Fabric versions of a node are compatible with lower levels of capabilities, capabilities cannot be processed by lower levels of nodes. If a v1.4.x node attempts to read a configuration block containing a v2.x capability, the node will crash. For this reason, the console will attempt to ascertain the nodes that will be affected by a capability update and either warn you (or stop you) from updating a capability if it will cause a node to crash. More on this later.

Because of this, all of the nodes in a channel must be at least at the level of the capabilities relevant to the node. Therefore, if the organizations in your channel want to "move to v2.0", this is in practice a three step process:

1. Upgrade all of the nodes in the channel. 
2. Update the relevant capabilities of the channel. Do not attempt to edit the capabilities until you are sure your nodes are at the appropriate Fabric versions.
3. To use the 2.x smart contract lifecycle, an organization must have an endorsement policy defined. If any organization in the consortium (the list of organizations maintained by the ordering service that are allowed to create channels) do not have an endorsement policy defined, a warning message will appear on the **Details** page of the ordering service with a list of organization MSPs that must be updated. The best practice to add this endorsement policy to the MSP is to delete the MSP from the system channel and then re-add the MSP. The console detects the fact that the MSP does not contain the endorsement policy and automatically adds it. Note that this action can only be completed by an ordering service administrator. You do not need to delete and re-add the MSPs in the configuration of any application channels that have already been created. For these MSPs, the endorsement policy is added as part of the process of [deploying the smart contract using the v2.x lifecycle](../smart_contracts/console-smart-contracts-v2.md).

The `application` and `channel` capabilities are relevant to peers, while the `orderer` and `channel` capabilities are relevant to the ordering service.
{: tip}

While all capabilities can be edited as part of a channel configuration update request, you have the opportunity to edit these capabilities in a few places:

  * **Channel and orderer**: in the [system channel](#capabilities-in-the-system-channel) by ordering service admins.
  * **Application and orderer**: during [channel creation](#capabilities-in-application-channels).

Note that what you see in this section will depend on the configuration of your channel and the Fabric level of your peers and ordering nodes, as **only valid and possible capability upgrades will appear**. For example, if your channel, orderer, and application capabilities are already at the highest level, you will only see the capability levels that have been selected. Similarly, you will not see potential capability updates if your nodes in the channel are not at a sufficient Fabric level to process the capability. Note that the **default** orderer capability shown is inherited from the system channel, as noted above, while the default application capability is set to a reasonable level that will ensure that peers who attempt to join the channel will not crash. The application capability can always be updated later.

>**_IMPORTANT:_** To ensure that you will always be able to see and propose updates to get a channel to the latest capability levels, **it is a best practice to upgrade your peers and ordering nodes to the latest Fabric version as soon as it is available in the console**. From a channel management perspective, it is also a best practice to discuss capability updates with other organizations before proposing a change. This will allow organizations to update nodes, as necessary, before the channel update request is submitted.


#### Capabilities in the system channel

Because the ordering service is involved in the validation of the `orderer` and `channel` capabilities, these capability levels exist in the system channel maintained by the ordering service. By default, any channel that is created on this ordering service inherits these capability levels. Because only the `orderer` capability (and not the `channel` capability) is apparent when creating a channel, it is important to communicate the **channel** capability level to consortium members so they can ensure that the level of their peers is at the Fabric version of the capability level or higher.

>**_TIP:_** In order to edit the `orderer` or `channel` capabilities in the system channel, your organization must be an ordering service administrator.

To edit these capabilities, click on the **Settings** button inside the ordering service. Then click **Capabilities**. Note that the channel and orderer capabilities, as well as the application capabilities, can also be edited through a channel configuration update. However, an ordering service admin will have to sign any configuration update that edits the `orderer` or `channel` capabilities. Note that capability versions can only advance. **You cannot go back to a previous capability or downgrade from a default capability level to a lower version**.

>**_IMPORTANT:_** It is not possible to update the `orderer` or `channel` capabilities to a level that will crash your ordering nodes. If you want to update your capabilities on the system channel screen, you must first upgrade your nodes.

#### Capabilities in application channels

Application capabilities define the way transactions are handled exclusively by the peers. As a result, these capabilities are not inherited from the system channel (which is managed by the ordering service) and the full list of capabilities can be seen, starting with `1.1`, when creating a channel. Note that the Fabric version of all peers in the channel must be at least at the level of the application capability level and the channel capability level inherited from the ordering service. When creating a channel, the default application capability might be lower than the highest available level. This is done in cases where a new Fabric version with a new application capability has been released but it is not expected that most peers will be at the new Fabric version. You will see the default application capability in the **Review channel information** screen before creating the channel.

If you attempt create a channel with a `orderer` capability other than the default, the channel creation request must be signed by an ordering service organization. If this capability is incompatible with the Fabric version of your ordering nodes, the console blocks the signature from completing, as a successful signature would crash any ordering nodes at the lower Fabric version. You must upgrade all of the relevant nodes before the channel creation request can be signed.

Similarly, the console will block any attempt to join a peer to a channel with an `application` or `channel` capability it is incompatible with to prevent the peer from crashing. The peer must be upgraded before it can be joined to the channel.

>**_TIP:_** Because channel creation requests cannot be edited, if a capability is selected in error, a new channel creation request must be made.

The following table shows the compatibility levels of peer image versions with the application capability level of a channel and which smart contract deployment process is used:

| | Channel application capability 1.4 |  Channel application capability 2.x |
|-| -----------------------------------|-------------------------------------|
| **Peer image 1.4.x** | <img src="../images/checkmark-icon.png" width="16" align="center" alt="checkmark"> Uses legacy smart contract deployment flow and requires smart contract in .cds file format. |  Not possible |
| **Peer image 2.x** | <img src="../images/checkmark-icon.png" width="16" align="center" alt="checkmark"> Uses legacy smart contract deployment flow and requires smart contract in .cds file format.  | <img src="../images/checkmark-icon.png" width="16" align="center" alt="checkmark"> Uses Fabric 2.x smart contract lifecycle and requires smart contract in .tgz file format. |
<p style="text-align:center"><em>Table 1. Peer image version vs. channel application capability level</em></p>

- A peer that runs a Fabric 1.4.x image can join a channel that is configured with application capability 1.4.x. But that peer cannot join a channel that is configured with application capability 2.x.
- If a channel application capability level is upgraded to 2.x before the peer 1.4.x image is upgraded to 2.x, the peer stops functioning and needs to be upgraded to the 2.x image.
- It is possible for a peer that is running a 2.x image to join a channel with application capability 1.4 and another channel with application capability 2.x at the same time. But smart contracts on the peer in `.cds` format use the legacy smart contract deployment process where they have to be instantiated on the channel with `application` capability 1.4. Smart contracts on the peer in `tar.gz` format follow  the [Fabric 2.x smart contract lifecycle](../smart_contracts/console-smart-contracts-v2.md) process on the channel with `application` capability 2.x.

Like the orderer and channel capabilities, the application capability level can be edited through a channel configuration update. The orderer capability can also be specified during the creation of a channel, but will require the approval of the ordering service.

>**_IMPORTANT:_** If you are using the SDK to create or edit a channel, take caution to not submit a channel configuration with an invalid `application` capability. Because application capabilities are not validated by the ordering service, invalid application capabilities are not flagged. Because the peers cannot process capabilities that do not exist, the peers will crash when attempting to read the configuration block containing an invalid capability. Because the peers will be unable to progress beyond this configuration block, it will not be possible to reverse this configuration block and submit another one to "fix" the problem. A channel in this state is unrepairable.

## Tuning your ordering service

Performance of a console platform can be affected by many variables such as transaction size, block size, network size, as well as limits of the hardware. The orderer node includes a set of tuning parameters that together can be used to control orderer throughput and performance.  You can use these parameters to customize how your orderer processes transactions depending on whether you have many small frequent transactions, or fewer but large transactions that arrive less frequently. Essentially, you have the control to decide when the blocks are cut based on your transaction size, quantity, and arrival rate.

The following parameters are available in the console by clicking the orderer node in the **Nodes** tab and then clicking its **Settings** icon. Click the **Advanced** button to open the **Advanced channel configuration** for the orderer.

### Block cutting parameters

The following three parameters work together to control when a block is cut, based on a combination of setting the maximum number of transactions in a block as well as the block size itself.

- **Absolute max bytes**
  Set this value to the largest block size in bytes that can be cut by the orderer.  No transaction may be larger than the value of `Absolute max bytes`. Usually, this setting can safely be two to ten times larger than your `Preferred max bytes`.
  **Note**: The maximum size permitted is 99MB.
- **Max message count**
  Set this value to the maximum number of transactions that can be included in a single block.
- **Preferred max bytes**
  Set this value to the ideal block size in bytes, but it must be less than `Absolute max bytes`. A minimum transaction size, one that contains no endorsements, is around 1KB.  If you add 1KB per required endorsement, a typical transaction size is approximately 3-4KB. Therefore, it is recommended to set the value of `Preferred max bytes` to be around `Max message count * expected averaged tx size`. At run time, whenever possible, blocks will not exceed this size. If a transaction arrives that causes the block to exceed this size, the block is cut and a new block is created for that transaction. But if a transaction arrives that exceeds this value without exceeding the `Absolute max bytes`, the transaction will be included. If a block arrives that is larger than `Preferred max bytes`, then it will only contain a single transaction, and that transaction size can be no larger than `Absolute max bytes`.

Together, these parameters can be configured to optimize throughput of your orderer.

### Batch timeout

Set the **Timeout** value to the amount of time, in seconds, to wait after the first transaction arrives before cutting the block. If you set this value too low, you risk preventing the batches from filling to your preferred size. Setting this value too high can cause the orderer to wait for blocks and overall performance to degrade. In general, we recommend that you set the value of `Batch timeout` to be at least `max message count / maximum transactions per second`.

>**_IMPORTANT:_** When you modify these parameters, you do not affect the behavior of existing channels on the orderer; rather, any changes you make to the orderer configuration apply only to new channels you create on this orderer.
