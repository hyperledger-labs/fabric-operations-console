# Stitch

Hyperledger Fabric SDK that runs in the browser (Javascript).  Used by [OpTools](https://github.ibm.com/IBM-Blockchain/OpTools)

## Key Features

- Client side
  - Uses grpc-web to facilitate gRPC calls to Fabric nodes.
  - This library cannot run with node.js. It only runs in a browser.
- Safe
  - Private keys never leave the local storage of a user's browser.
- Fast
  - Since calls are made directly from the browser to the node the typical client -> server latency is eliminated
  - It encodes/decodes protobuf messages locally.  Configtxlator is not needed for most operations *(still working on removing some reliance on configtxlator)*
- Stateless API
  - Every fabric call is stand alone. There is no memory between calls; no setup and fire, just fire.
- Fabric v1.4 && v2.0+ compatible
  - v1.1 -> v1.3 will _mostly_ work, but some block decoding fields get screwy.

# Table of Contents

- [How Stitch Works](#how-stitch-works)
    - [gRPC and Protobufs](#grpc-and-protobufs)
    - [grpc-web](#grpc-web)
- [Developer Onboarding](#developer-onboarding)
- [Release Management](#release-management)
    - [Building Protobufs for protobufjs](#building-protobufs-for-protobufjs)
    - [Building Protobufs for protoc](#building-protobufs-for-protoc)

# How Stitch Works

If you're just interested in installing and using Stitch, see [the Stitch setup instructions](docs/README.md).

## gRPC and Protobufs

Almost all communication with Hyperledger Fabric components (CAs, peers, orderers, etc.) uses a Remote Procedure Call framework
known as [gRPC](https://grpc.io/).  gRPC provides a spec for defining the shapes of messages that can be exchanged between
parties over a network.  A developer can write one of these specs and then use a gRPC library to compile the spec into
code that exposes methods and services for sending and receiving the messages defined in the spec.  These gRPC libraries
are available in a variety of different programming languages, including Javascript.

Stitch is able to communicate with Hyperledger Fabric components because it uses code generated from [the same protobufs](https://github.com/hyperledger/fabric/tree/master/protos)
that the components use themselves. Stitch actually uses not just one, but _two_ gRPC libraries to generate this code:

1. [protobufjs](https://github.com/protobufjs/protobuf.js#readme)
2. [protoc](https://github.com/protocolbuffers/protobuf/tree/master/js#readme)
> Why two?  Well, Stitch development started with `protoc`, but switched to `protobufjs` when it was found to be a lighter-weight,
easier-to-use library.

## grpc-web

In case you didn't already know, gRPC is a protocol built on top of [HTTP/2](https://en.wikipedia.org/wiki/HTTP/2).  Javascript
running in your browser is still using [HTTP 1.1](https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol).  Therefore, an
intermediary proxy must be used that can translate HTTP 1.1, browser client gRPC messages into HTTP/2 requests and vice-versa.
[grpc-web](https://github.com/grpc/grpc-web#readme) is the official service for this purpose.  This means, of course, that
Stitch will only be compatible with Hyperledger Fabric components that have a `grpc-web` instance pointing to them.

# Developer Onboarding

As a Stitch contributor, your tasks will generally involve these tasks:

1. Generating Typescript for new Hyperledger Fabric protobufs.
2. Writing or updating Typescript modules (Chaincode, Channel, Peer, etc.) that wrap this generated code into useful
functions (install chaincode, update channel config, etc.).

Before all of that, you should make sure you're development environment has everything it needs:

- Clone the project
- Install the Stitch development dependencies:
	```
	> npm install
	```
- Try building the Typescript code:
	```
	> npm run build
	```
    > `npm run build` will watch the TS files for changes and rebuild the non-minified version.

    > Files are built in the `./dist/` folder. See Docs for usage.

- Install Chrome, if you haven't already. Stitch's tests open a new chrome window, test Stitch functionality in the window,
and close it.
- Run the Stitch test suite:
	```
	> npm run test
	```

# Testing
	Run tests via `npm run test`.

	- atm the browser runs and auto closes, if you need this to stop:
		- remove `--browsers ChromeHeadlessNoSandbox` in the `scripts.test` line of `package.json`.
		- also change `singleRun: true` to `singleRun: false` in `karma.config.js`.
		- run via `npm run test` and after chrome opens click `Debug` & open the browser's console to see test output.


# Release Management

A "full" build of Stitch involves compiling protobufs from Hyperledger Fabric.  Because two gRPC libraries are in use, this
step requires building the protobufs twice.

## Building Protobufs for protobufjs

The portions of Stitch that use `protobufjs` are expecting the Hyperledger Fabric protobufs to be bundled in a single file.
Get (use git or just download) the latest proto files from the [Fabric Protos Repo](https://github.com/hyperledger/fabric-protos).
Save them into your fs: `./src/protoc/input/v2.0`.
Then run the command below to intelligently concat them.

- Run command: (using windows CMD notation)
  - If you see any errors you likely need to add a missing proto to the command.
```
> node ./node_modules/protobufjs/bin/pbjs -t proto3 ^
./src/protoc/input/v2.0/common/common.proto ^
./src/protoc/input/v2.0/common/configtx.proto ^
./src/protoc/input/v2.0/common/configuration.proto ^
./src/protoc/input/v2.0/common/ledger.proto ^
./src/protoc/input/v2.0/common/policies.proto ^
./src/protoc/input/v2.0/msp/msp_principal.proto ^
./src/protoc/input/v2.0/google/protobuf/timestamp.proto ^
./src/protoc/input/v2.0/ledger/rwset/rwset.proto ^
./src/protoc/input/v2.0/ledger/rwset/kvrwset/kv_rwset.proto ^
./src/protoc/input/v2.0/msp/identities.proto ^
./src/protoc/input/v2.0/msp/msp_config.proto ^
./src/protoc/input/v2.0/orderer/ab.proto ^
./src/protoc/input/v2.0/orderer/configuration.proto ^
./src/protoc/input/v2.0/peer/admin.proto ^
./src/protoc/input/v2.0/peer/chaincode.proto ^
./src/protoc/input/v2.0/peer/chaincode_event.proto ^
./src/protoc/input/v2.0/peer/chaincode_shim.proto ^
./src/protoc/input/v2.0/peer/configuration.proto ^
./src/protoc/input/v2.0/peer/events.proto ^
./src/protoc/input/v2.0/peer/peer.proto ^
./src/protoc/input/v2.0/peer/proposal.proto ^
./src/protoc/input/v2.0/peer/proposal_response.proto ^
./src/protoc/input/v2.0/peer/query.proto ^
./src/protoc/input/v2.0/peer/resources.proto ^
./src/protoc/input/v2.0/peer/signed_cc_dep_spec.proto ^
./src/protoc/input/v2.0/peer/transaction.proto ^
./src/protoc/input/v2.0/common/collection.proto ^
./src/protoc/input/v2.0/token/expectations.proto ^
./src/protoc/input/v2.0/token/transaction.proto ^
./src/protoc/input/v2.0/peer/collection.proto ^
./src/protoc/input/v2.0/peer/lifecycle/lifecycle.proto ^
./src/protoc/input/v2.0/peer/lifecycle/chaincode_definition.proto ^
./src/protoc/input/v2.0/peer/policy.proto ^
./src/protoc/input/v2.0/orderer/etcdraft/configuration.proto > ./proto-bundles/v2.0-protobuf-bundle.json
```
> Note that the `pbjs` executable is installed as a `node_module` dependencies when you run `npm install`.

> The format of the output file is not actually JSON compliant.  The `.json` extension is simply used to get around some
annoying browser file restrictions.

## Building Protobufs for protoc

This requires you to setup a Hyperledger Fabric build environment.

TODO add a link to relevant dev environment setup docs.

TODO add an example build command.

## Publishing a New Release

New Stitch releases are published via the `dist` directory of the repository.  To publish new releases, publish a tagged
commit that updates the contents of this directory.

1. Create a new branch, add the new features, make PR, merge PR.
2. Checkout `master` and update the contents of the `dist` directory.
    ```
    > git checkout master
    > git pull origin master
    > npm run build_all
    ```
3. Edit package.json version to `0.0.1`++
4. Commit `package.json` and new build files as `0.0.1`++
    ```
    > git add package.json dist
    > git commit -m "0.0.5"
    > git tag v0.0.5
    ```
    > Put your 0.0.1++ version in place of `0.0.5`
5. Push the `master` branch and the new tag.
    ```
    > git push origin master
    > git push --tags origin
    ```
    > You can push tags without updating a branch, but it's better to keep everything in sync.
