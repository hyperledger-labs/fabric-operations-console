---
layout: default
title: Writing powerful smart contracts
parent: Deploy a smart contract
nav_order: 2
keywords: smart contract, lifecycle, package, definition
---

# Writing powerful smart contracts

As Hyperledger Fabric and the Fabric Operatons Console have evolved, their processes have been made more decentralized and collaborative. This is why, for example, the old “Kafka” ordering service, in which a single organization owned and managed the ordering service, was replaced with a “Raft” ordering service in which multiple organizations can administer the ordering service and contribute nodes.

This same spirit of decentralization and collaboration also drove the development of a new series of processes around installing, managing, and using smart contracts (these processes are known as the “lifecycle” of a smart contract).

While these new processes are somewhat more elaborate and require more planning and forethought than the "old" lifecycle (in which a single organization proposed a smart contract instantiation on a channel), the new lifecycle provides many new powerful and elegant opportunities to satisfy a wider set of business use cases.

This topic will show how these opportunities can be exploited both during development of a smart contract and during its lifecycle servicing a channel.

## What's new in the new lifecycle

In the lifecycle used for Fabric versions before 2.0:

- Smart contracts were proposed for instantiation by a single channel member. Organizations could not formally propose endorsement policies or other smart contract parameters within the context of official Fabric processes.
- A “fingerprint” match was required for every smart contract installed on every peer, requiring the smart contract on every peer on a channel to be exactly the same. This fingerprinting was error prone --- the exact same smart contract could under certain circumstances produce a slightly different fingerprint, leading to mismatch errors that were difficult to resolve.
- Any change to the smart contract, no matter how minor, required a new package (which must be installed on every peer and re-fingerprinted) and re-instantiation on the channel.

In the "new" lifecycle used for Fabric versions after 2.0:

- Organizations collaborate in the channel-level decision making process regarding smart contracts.
- Fingerprint matches are no longer required.
- Smart contracts can be updated in some ways without the need for re-instantiation at a channel level.
- Different organizations and peers can install smart contracts that only contain code relevant to their business role, yet still be able to transact with other organizations and peers that contain only the code relevant to **their** role, while maintaining deterministic outcomes. More on this later.

## Packages and definitions

From a structural standpoint, the biggest change with the new smart contract lifecycle is the logical and physical separation of the “definition” of a smart contract and “package” of a smart contract.

The latter contains the actual code representing the business logic of the smart contract. When a peer is contacted to “endorse” a transaction or not, the package contains the code that runs and generates the read/write set.

The definition of a smart contract, on the other hand, contains information like the name, version, and endorsement policy of the smart contract. These definitions can be proposed by any channel member but must be approved (on a per-org basis) by enough organizations to satisfy the “lifecycle endorsement policy” of the channel, after which the definition is committed to the channel. This lifecycle endorsement policy can in theory be anything (including allowing any organization to commit a definition, or just a single organization), but generally speaking will, in the spirit of collaboration, be something like a “majority of channel admins”.

This separation of the definition (agreed to at the channel level) and the package that’s installed on the peers has powerful implications for how smart contracts can be written and managed, as we will see.

### Taking advantage of the ability for each organization to use a separate package

The elimination of the need for the smart contracts to exactly match their fingerprints opens up exciting new possibilities when developing smart contracts.

First, to address a natural question: how can results be predictable (or, more to the point, deterministic) if peers in different organizations aren’t running the same code?

An analogy might help to explain. If two people attempt to multiply two numbers together (33 by 7, for example), one might decide to multiply 30 by 7 and also 3 by 7 and then add the two resulting numbers together. While the other person might not use this trick, or choose to use a calculator. **It’s not important that both people use the same process, only that they arrive at the same answer**.

The same basic principle is true for different smart contract packages running on different peers producing the same read/write set, given a set of inputs. As long as the smart contracts running on every peer on a channel produce the same read/write set, it does not matter if they are running exactly the same code.

But why bother? Why not run the same code?

You certainly can, and it is probably advisable to run the same (or at least similar) code in order to eliminate corner cases that might emerge if substantially different code is being run against the same data.

However, consider a scenario in which the various organizations on a channel are all executing transactions against a set of data but have substantially different roles. In this scenario:

* **Org A**: an individual who wants to place an advertisement.
* **Org B**: the owner of the place where advertisements are posted.

Org A should, logically, be allowed to **request** an ad be placed, and also to **query** ads. Since their identity would lack the proper permissions to create an ad, why should the smart contract they install on their peer contain the relevant code for creating an ad? It’s just unnecessary waste and clutter.

Similarly, Org B would logically be able to **query** ads and to **create** them. But they would have no use for the ability to **request** an ad be placed since they already have the ability to create them.

A hypothetical third Org might only need the ability to **verify** information without actually needing the ability to query or create information of its own, a popular use case for government entities or other kinds of regulators.

While the desire to reduce unnecessary code clutter is always worthwhile on its own, this ability for different organizations to have different smart contracts is particularly useful in scenarios when the code to perform certain actions might contain sensitive information (the location of a server where ads are created, for example).

While the “old” lifecycle did include ways to separate roles through a permissions structure, the ability for different orgs to have different packages is a more secure and holistic approach to the separation of concerns central to fabric networks, and should be taken in account when developing smart contracts to run using the new lifecycle.

In any case, it is a best practice for smart contracts to be tested extensively (preferably on a test channel dedicated to this purpose) to ensure that all smart contract packages produce the same result, regardless of the underlying code generating that result. However, keep in mind that as long as an errant result is not reached by enough peers to satisfy the endorsement policy of a smart contract, the integrity of ledger data will be maintained.

>**_TIP:_** While the packages themselves can be different, the names of the packages must be identical and conform to the name given to the smart contract in the definition committed to the channel. If the packages have different names, the system will believe that the smart contracts do not contain compatible business logic.

## Updating smart contracts

Smart contracts can be updated for a variety of reasons. As part of onboarding a new member to a channel, for example, or to reflect new businesses processes and use cases.

In the onboarding example, it is likely that only the smart contract definition will need to be updated to reflect the new organization’s ability to endorse transactions (if that will indeed be their role). If the underlying business logic contained in the package changes, on the other hand, then both the package and the definition will have to change (the latter to reflect a new version).
While updating the version in the definition is enforced by Fabric whenever a new package is installed, the standards adopted by a channel for how those versions are organized are up to the members of the channel. However, it is recommended to use a consistent semantic versioning pattern.

>**_TIP:_** In production scenarios, new business logic might be agreed to by the channel members collectively (out of band) and then be written by a single channel member and passed to the others. If this code will replace custom code you have in your own smart contract package, make sure you do not overwrite custom variables you already have by replacing the section of your smart contract without analysis.


## Putting it all together

Like everything else about your network, your smart contracts should be tailored for your use case. While a simple smart contract shared in its entirety among every member of a channel might adequately fulfill your needs, the new lifecycle opens opportunities for specialization and separation of concerns that didn't exist before and shouldn't be ignored.

For more information about smart contract best practices (as well as how smart contracts relate to the concept of "chaincode"), see <a href="https://hyperledger-fabric.readthedocs.io/en/release-2.0/smartcontract/smartcontract.html" target="_blank">smart contracts and chaincode <img src="../images/external.png" width="10" alt="external" valign="middle"></a>.

## Smart contract development tooling

While a smart contract can be packaged using the peer CLI.


## Installing a package and proposing a definition

For information about how to use the console to install smart contract packages and propose and commit smart contract definitions on a channel, see [deploy a smart contract using Fabric v2.x](../smart_contracts/console-smart-contracts-v2.md).
