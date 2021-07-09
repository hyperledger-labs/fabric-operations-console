---
layout: default
title: Deploy a smart contract
nav_order: 3
has_children: true
has_toc: false
permalink: ../smart_contract
description: "Deploying a smart contract in Fabric Operations Console"
keywords: smart contract, private data, private data collection, anchor peer, implicit collections
---

# Deploy a smart contract

 A smart contract is the code, packaged as chaincode, that applications interact with to read and update data on the Fabric Hyperledger. A smart contract turns business logic into an executable program that is agreed to and verified by all members of a fabric network. This tutorial is the third part in the [sample network tutorial series](#sample-network-tutorial-series) and describes how to deploy smart contracts to start transactions in the fabric network.

**Target audience:** This topic is designed for network operators who are responsible for creating, monitoring, and managing the fabric network. Additionally, application developers might be interested in the sections that reference how to create a smart contract.

## Sample network tutorial series

You are currently on the third part of our three-part tutorial series. This tutorial guides you through the process of using the console to deploy a smart contract onto a channel in your Fabric  Operatons Console network.

* [Build a network tutorial](../getting_started/console-build-network.md) guides you through the process of hosting a network by creating an orderer and peer.
* [Join a network tutorial](../getting_started/console-join-network.md) guides you through the process of joining an existing network by creating a peer and joining it to a channel.
* **Deploy a smart contract on the network** (Current tutorial) Provides information on how to write a smart contract and deploy it on your network.

You can use the steps in these tutorials to build a network with multiple organizations in one cluster for the purposes of development and testing. Use the **Build a network** tutorial if you want to form a fabric consortium by creating an orderer node and adding organizations. Use the **Join a network** tutorial to connect a peer to the network. Following the tutorials with different consortium members helps you create a truly **distributed** fabric network.

Select the tutorial that corresponds to your channel configuration:
- *** [Channel application capabilities and peer Fabric images are 2.x](../smart_contract/console-smart-contracts-v2.md)

  >**_IMPORTANT:_** *** Fabric v2.0 introduced a new distributed process to manage the lifecycle of a smart contract that allows for decentralizing the governance of smart contracts on a channel. Whenever possible, it is recommended that customers should move to using the new smart contract lifecycle to avoid any interruption of service in later upgrades when Fabric no longer supports the v1.4 process for installing and instantiating smart contracts.
