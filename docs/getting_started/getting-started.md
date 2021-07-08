---
layout: default
title: Getting Started with Fabric Operations Console
nav_order: 2
has_children: true
has_toc: false
permalink: ../getting_started
description: "Homepage for Fabric Operations Console"
keywords: Fabric Operatons Console, install operations console, Hyperledger Fabric Docker, Fabric test, Fabric samples
---

# Getting started with Fabric Operatons Console

## Before you begin

Before installing the Fabric Operatons Console, you need to download and install the Fabric samples for set up and run the Fabric test in your local environment. Make sure you have installed all of the <a href="https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html" target="_blank">Fabric prerequisites <img src="images/external.png" width="10" alt="external" valign="middle"></a> before <a href="https://hyperledger-fabric.readthedocs.io/en/latest/install.html" target="_blank">installing the Fabric Samples, Binaries and Docker Images <img src="images/external.png" width="10" alt="external" valign="middle"></a>.

Once you have completed downloading the samples and Hyperledger Fabric Docker images, use the scripts provided in the <a href="https://github.com/hyperledger/fabric-samples" target="_blank">`fabric-samples` repository <img src="images/external.png" width="10" alt="external" valign="middle"></a> and  the `./network.sh` to deploy and set up a test network. The test network contains two peer organizations with one peer each and a single node raft ordering service.

## Installation

### Step one: Install the Fabric Operatons Console

### Step two:

### Step three: Connect networks across clouds

You can use your console to operate components that are running on other clusters. First, you need to export the component information to a JSON file from the console where the component was originally deployed. Then, you can import the node JSON file into the console that is deployed on your local environment and manage the components. For more information, see [importing nodes](../using_console/console-import-nodes.md).
