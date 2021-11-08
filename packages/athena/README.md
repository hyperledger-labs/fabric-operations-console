
# Athena

v2.0 IBP Backend for [OpTools](https://github.ibm.com/IBM-Blockchain/OpTools)

Athena responsibilities include:

- Hosting the [Apollo UI](https://github.ibm.com/IBM-Blockchain/apollo)
- Translating certain user actions on the UI into API calls to a [Deployer](https://github.ibm.com/IBM-Blockchain/blockchain-deployer) backend service.  These actions include:
    - Creating a peer
    - Creating an orderer
    - Creating a CA
- Translating actions related to Fabric enroll IDs into calls to Hyperledger Fabric components. These actions include:
    - Registering enroll IDs
    - Enrolling enroll IDs
    - Deleting enroll IDs

Athena is designed to be capable of supporting these actions on a variety of cloud environments, including SaaS (a public IBM Cloud
Catalog Blockchain Platform service instance) and ICP/Software (IBM Cloud Private w/ Blockchain Platform).  This is achieved
by enforcing a standard API contract between Athena and the Deployer services in any given environment.  Even with this API
contract, a large part of the testing and bug-fixing for this project will involve differences between backend environments
that Athena supports.

# Table of Contents

- [Developer Onboarding](#developer-onboarding)
    - [Acquiring a Deployer Backend](#acquiring-a-deployer-backend)
        - [Acquiring a Deployer via the IBM Cloud Catalog](#acquiring-a-deployer-via-the-ibm-cloud-catalog)
            - [Creating a Kubernetes Cluster](#creating-a-kubernetes-cluster)
            - [Creating an Instance of Blockchain Platform](#creating-an-instance-of-blockchain-platform)
            - [Building a Configuration File](#building-a-configuration-file)
        - [Acquiring a Deployer in OpenShift](#acquiring-a-deployer-in-openshift)
            - [Get access to an OpenShift cluster](#get-access-to-an-openshift-cluster)
            - [Request IBP on OpenShift registry access and deploy IBP](#request-ibp-on-openshift-registry-access-and-deploy-ibp)
            - [Connect your local environment to OpenShift services](#connect-your-local-environment-to-openshift-services)
    - [Building a Local Athena Environment](#building-a-local-athena-environment)
        - [Running a Local CouchDB Service](#running-a-local-couchdb-service)
        - [Cloning and Running the Code](#cloning-and-running-the-code)
- [Release Management](#release-management)
    - [Preparing the Release](#preparing-the-release)
    - [Publishing a Release](#publishing-a-release)
    - [Deploying a Release to SaaS](#deploying-a-release-to-saas)
    - [Deploying a Release to ICP/Software](#deploying-a-release-to-icpsoftware)
- [Detect Secrets](#detect-secrets)
- [Tips](#tips)
- [Architecture](#architecture)

# Developer Onboarding

A local environment is crucial for any developer to be able to meaningfully contribute to Athena's development.  Setting
up one of these environments for yourself is accomplished in two main steps:

1. Acquiring a Deployer backend with a corresponding Athena configuration.
2. Building a local Athena environment to talk to this Deployer.

## Acquiring a Deployer Backend

There are multiple Deployer environments to choose from.  You will probably end up with multiple environments, switching
between them as you test new features or validate bug fixes.  This section will not have the steps necessary for all the
environments that you could have, but it will have enough to get you started as a new developer to the team.

These instructions assume you are going to work in a production environment. If you need IAM then you'll need to to work in either a staging or production
environment. While production is the most stable, staging will have the latest deployer and hyperion. The development environment can be used but does not
have IAM authentication. More on authentication below.

Whichever path you follow to acquire a Deployer backend, the result will be two files that will contain the configuration
information necessary for Athena to reach that backend, `dev.json` and `my_config.yaml`.  We're going to create placeholders
for those files now.

For a complete list of Athena's configuration parameters, including descriptions for what each parameter does, see the [env directory readme](env/README.md).
The gist is that `dev.json` will allow your Athena to connect to a CouchDB database and create a set of databases and
configuration documents for itself.  The initial configuration will be populated with the information from `my_config.yaml`,
which will have information on the Deployer backend that Athena should connect to.

Create a file called `dev.json` in the `env` directory with the following content:

```json
{
    "DB_CONNECTION_STRING": "http://localhost:5984",
    "DB_SYSTEM": "athena_system",
    "CONFIGURE_FILE": "./env/my_config.yaml"
}
```

Create a file called `my_config.yaml` in the `env` directory with the following content:

```yaml
initial_admin: myemail@us.ibm.com
default_user_password_initial: CHOOSE AN INITIAL PASSWORD
auth_scheme: couchdb
crn_string: 'CRN_STRING_GOES_HERE'
configtxlator_url_original: CONFIGTXLATOR_URL_GOES_HERE
deployer_url: DEPLOYER_URL_GOES_HERE
enforce_backend_ssl: false
host_url: http://localhost:3000
region: local
proxy_tls_fabric_reqs: true
proxy_tls_ws_url: http://localhost:3000
proxy_tls_http_url: ./
environment: dev
```
> As you might have guessed, Athena supports user authentication.  In fact, it supports several ways to authenticate users!
`auth_scheme: couchdb` configures Athena to use its simplest auth mechanism, where users are authenticated using a username and
password stored in Athena's CouchDB database.  For most local development, this setting should be fine, but it would be a
good idea to look at the [env directory readme](env/README.md) for more details on the other auth mechanisms that are supported.
Note that other auth schemes might require different configuration parameters and may change the login steps for Athena.

### Acquiring a Deployer via the IBM Cloud Catalog

If you get an instance of the Blockchain Platform service from the IBM Cloud Catalog, you'll be able to use the CRN, Deployer URL,
and Configtxlator URL for that instance in your local Athena configuration.

#### Gaining access to the team Blockchain Cloud account
You will need access to this account in order to setup port forwarding, which is required to communicate with deployer. At the time
of writing this, April 29, 2020, the account is named "1807777 - Blockchain Cloud". To find out if you have access, login to
[IBM Cloud](https://cloud.ibm.com/) and check the dropdown at the top.


If you have access then you can move to the next section
"Creating a Kubernetes cluster". Otherwise, follow these steps first as they require approval, which could take time.

1. Go to [IBM Access Hub](https://ibm.idaccesshub.com/ECM/workflowmanagement/requesthome?menu=1) and click on the box that says
   "Request or Manage Access".

2. Search for "IBM Blockchain Platform" and either add to cart or choose "modify existing account"
    ![access hub](docs/images/access_hub.png)

3. After it spins for a while, click on the "Checkout" button at the top of the page

4. Search for and select "Blockchain Cloud" from the available groups
    ![add blockchain group](docs/images/add_blockchain_group.png)

5. Click next and provide the justification and then complete the wizard.

#### Creating a Kubernetes cluster

The Blockchain Platform service is going to ask you to associate your service instance with a cluster on the IBM Cloud
Kubernetes service.  Basically, this is the cluster where orderers, peers, etc. will be deployed for your service instance.

The quickest way to accomplish this task is to [install the IBM Cloud CLI](https://cloud.ibm.com/docs/cli?topic=cloud-cli-ibmcloud-cli)
and run the following command to stand up a free cluster on your IBM Cloud account:

```
> bx cs cluster-create --name my_cluster --zone dal10
```
> The Blockchain Platform service requires that the cluster be in the same region as the service instance.  `--zone dal10`
ensures that the cluster will be in the `Dallas` region, which is supported by the service.

#### Creating an Instance of Blockchain Platform

Go to the [Blockchain Platform catalog page](https://cloud.ibm.com/catalog/services/blockchain-platform) and create an instance
of the service.  A wizard will walk you through the process of linking the cluster you created to the service instance.  Once
you've created the instance, you will be taken to the Athena server and Apollo UI that was deployed for that service instance.
You're going to connect your local Athena to the same services that were deployed for this service instance.  Take note of
the URL for the service instance.  It will probably look something like this:

```
https://7135d7f56ba5461f99c28bdbba9c1b1f-optools.bp01.blockchain.cloud.ibm.com
```

#### Building a Configuration File

Open the `/api/v1/settings` endpoint on your service instance URL.  You should see a large JSON object that contains your
Configtxlator URL and CRN string.

```json
{
    ...
    "CONFIGTXLATOR_URL": "https://7135d7f56ba5462f99e28bdbba9c1b1f-configtxlator.bp01.blockchain.cloud.ibm.com:",
    ...
    "CRN_STRING": "crn:v1:bluemix:public:blockchain:us-south:a/bb3c4e0987fad460c1e4f3e7f647c441:7135d8f5-6ba5-461f-99e2-8bdbba9c1b1f::",
    ...
}
```

Next, open the `/api/v1/private-settings` endpoint on your service instance URL.  You should see a smaller JSON object that
contains the Deployer URL.

```json
{
    ...
    "DEPLOYER_URL": "http://username:password@localhost:8080",
    ...
}
```

**-A digression into dealing with port forwarding since deployer no longer exposes a deployer url**

This Deployer URL isn't going to be very helpful locally until we setup port forwarding to hit port 8080 in deployer. These steps
on setting up port forwarding for athena to talk to deployer are covered in a little less detail below in this README.

1. Create an account api key by going to [Cloud API Keys](https://cloud.ibm.com/iam/apikeys). Click on "Create an IBM Cloud API key"
button. Fill out the name and description and then get the key. *NOTE* You won't be getting access to this key again so store it
somewhere safe.

2. Open a terminal on your local machine

3. Log in using the following command where `<api_key>` is the api key you created in step 1
```
> bx login --apikey <api_key>`, where `apikey` in the brackets
```

4. List all the clusters on the account
```
> bx cs clusters
```

5. Choose the cluster you want to work with and download the config. We'll use `staging-optools` in the example
```
> bx cs cluster config --cluster staging-optools
```

6. List all of the namespaces in that config (you'll use one of these in the next command)
```
> kubectl get ns
```

7. Your namespace is your service instance id. In the url above, it would be `7135d7f56ba5461f99c28bdbba9c1b1f`.
We'll get all the pods for that namespace
```
> kubectl get pods --namespace <your namespace>
```

8. From the output of the last command, use one of the `ibpconsole` instances (I use the first one) to forward the port.
In my case, the instance was `ibpconsole-5576b64b6b-5vn78`. `<your favorite local port>` can be any port you want to use
to communicate with deployer. 8080 is the deployer port we're forwarding to.
This command will setup port forwarding.
```
> kubectl port-forward <your ibpconsole instance> <your favorite local port>:8080
```

*Note:* You will need to leave the port-forwarding terminal open for the entire time you want to use athena
locally, if you intend to communicate with deployer. This also needs to be done every time you run locally.

**end of port forwarding digression and back to your regularly scheduled yaml file creation**

You're going to copy these fields into your `my_config.yaml` file in the following manner:

- Copy `CONFIGTXLATOR_URL` into the `configtxlator` field.
- Copy `CRN_STRING` into the `crn_string` field.
- Copy `DEPLOYER_URL` into the `deployer_url` field.

### Acquiring a Deployer in OpenShift

At a high level, this process is very similar to SaaS.  However, there is no Hyperion equivalent for OpenShift, meaning that
_you_ will have to modify and submit K8s deployment specs to the OpenShift cluster yourself.  Don't worry, the documentation for these
procedures is pretty straightforward.

1. Get access to an OpenShift cluster.
2. Submit a request to access the registry where IBM Blockchain Platform on OpenShift builds are stored.
3. Deploy IBP on OpenShift.
3. Setup port forwarding so you can access the Deployer from a local OpTools environment.
> You will need to setup port forwarding _every time_ you want to use this environment.

#### Get access to an OpenShift cluster

OpenShift clusters are expensive, so you probably won't be able to create one under your IBM Cloud account.  Instead, you'll
be sharing a preexisting OpenShift cluster with other IBP developers.  Contact [Varad Ramamoorthy](mailto:varad@us.ibm.com)
and ask him to add you to an account where a suitable OpenShift cluster is available.  Prove you have access by accessing
the OpenShift web console for your cluster:

1. Open the [OpenShift Clusters list on IBM Cloud](https://cloud.ibm.com/kubernetes/clusters?platformType=openshift).
    ![cluster list](docs/images/cluster_list.png)
    > Make sure you're selected the correct IBM Cloud account in the top right of the page.
2. Select the development cluster.
    ![cluster summary](docs/images/cluster_summary.png)
3. Open the OpenShift web console.  If you can see this page, you're ready to continue:
    ![openshift web console](docs/images/os_web_console.png)

#### Request IBP on OpenShift registry access and deploy IBP

Follow the instructions in the [`ibp-requests` repository](https://github.ibm.com/IBM-Blockchain/ibp-requests/blob/master/ibp-on-openshift/README.md).
These instructions will take you through the process of _both_ getting access to the docker registry where our OpenShift builds
are pushed and tested before they're published for customers _and_ running these builds on the OpenShift cluster.  When
you are asked to select an issue template, choose `IBP Software Access Request - IBMer`.

You can continue when you have `ibp-operator` and `ibpconsole` running in your personal project on the Openshift cluster.

```
$ oc project
Using project "davery-onboarding" on server "https://mycluster.us-south.containers.cloud.ibm.com:12345".

$ kubectl get pods
NAME                           READY   STATUS    RESTARTS   AGE
ibp-operator-fdc6d6b75-llrzn   1/1     Running   0          3h
ibpconsole-68b54477c5-xvz4v    4/4     Running   0          13m
```

Steal the settings from your `ibpconsole` deployment so you can use them in your `dev.json` and `my_config.yaml` files.
You can use `kubectl get routes` to figure out where to browse to.

```
$ kubectl get routes
NAME                    HOST/PORT                                                                                       PATH         SERVICES     PORT          TERMINATION   WILDCARD
ibpconsole-console      davery-onboarding-ibpconsole-console.my_cluster.us-south.containers.appdomain.cloud             ibpconsole   optools      passthrough   None
```

```
davery-onboarding-ibpconsole-console.my_cluster.us-south.containers.appdomain.cloud/api/v1/private-settings
{
  ...
  "DEPLOYER_URL": "http://user:pass@localhost:8080",
  ...
}

davery-onboarding-ibpconsole-console.my_cluster.us-south.containers.appdomain.cloud/api/v1/settings
{
  ...
  "CRN_STRING": "crn:v1:bluemix:public:blockchain:undefined:undefined:-::",
  "CONFIGTXLATOR_URL_ORIGINAL": "http://localhost:8083",
  ...
}
```

**Note: this environment uses self-signed certs.  As you create CAs, peers, etc., you may need to browse to the urls
associated with those services in your browser and accept the cert before the UI will be able to use these services.**

#### Connect your local environment to OpenShift services

`kubectl port-forward` allows you to forward traffic bound for a local port to a port on a container running on your cluster.
In our case, we'll be forwarding `localhost:8080` to port 8080 on the `deployer` container running on the OpenShift cluster.
This will allow you to access Deployer locally using the same `deployer_url` as the `optools` container running on the cluster.
**Note: This process needs to keep running in order for the port forwarding to function.**

```
$ kubectl describe pod ibpconsole-68b54477c5-xvz4v
Name:           ibpconsole-68b54477c5-xvz4v
Namespace:      davery-onboarding
...
Containers:
  optools:
    ...
    Ports:          3000/TCP, 3001/TCP
    ...
  deployer:
    ...
    Port:           8080/TCP
    ...
  configtxlator:
    ...
    Port:          8083/TCP
    ...
  couchdb:
    ...
    Port:           5984/TCP
...

$ kubectl port-forward pod/ibpconsole-68b54477c5-xvz4v 8080:8080
Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080
```
> The output to `kubectl describe pod` has been altered to remove irrelevant information.

You could use the same port forwarding to connect to the other services from your local OpTools environment.  In fact,
its probably easier to reuse the couchdb and configtxlator services from the OpenShift deployment than to stand
up your own.  **Note: You can use a configtxlator service from almost anywhere with your local instance.  Feel free to
use the `configtxlator_url_original` from a SaaS instance, if that's more convenient for you than opening terminals for
a bunch of `kubectl port-forward` processes.**

However you decide to forward the ports, make sure that decision is reflected in your `my_config.yaml` file.  For example,
if you decided you wanted the OpenShift Deployer to be expose at `localhost:65432` instead of `localhost:8080`, you would
update your `myconfig.yaml` to use `http://user:pass@localhost:65432` for the Deployer URL and forward the port using:
```
$ kubectl port-forward pod/ibpconsole-68b54477c5-xvz4v 65432:8080
```

## Building a Local Athena Environment

By this point, you should have a valid `dev.json` and `my_config.yaml` file for Athena.

### Running a Local CouchDB Service

We're just going to stand up a docker container based on the publicly available `couchdb` image and connect Athena to it.
Of course, you can use whatever CouchDB service you want, as long as you update the `DB_CONNECTION_STRING` in `dev.json`.

```
> docker run -d -e COUCHDB_USER=myemail@us.ibm.com -e COUCHDB_PASSWORD=password -p 5984:5984 -v $PWD/couchdb:/opt/couchdb/data couchdb
```
> The `-e COUCHDB_USER=myemail@us.ibm.com -e COUCHDB_PASSWORD=password` flags are used to set up the initial admin account,
you can choose your own username and password but you would need to update your `my_config.yaml`

> The `-p 5984:5984` flag is what allows the Athena instance on your laptop to connect to the CouchDB service inside the
container by hitting `localhost:5984`

> The `-v $PWD/couchdb:/opt/couchdb/data` flag will cause the CouchDB service to persist it's records in `$PWD/couchdb`.
This gives you the ability to save Athena's database records should you need to restart the couchdb container.

### Cloning and Running the Code

A complete Athena environment involves code from multiple repositories.  All of the repositories you will need to clone
are included in the Athena repository as git submodules.

- Clone this repository with all of its submodules.
    ```
    > git clone git@github.ibm.com:IBM-Blockchain/athena.git
    > cd athena

    # Clone the submodules
    > git submodule update --init --recursive
    ```
    > It is recommended that you create a [Personal Access Token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) for yourself on IBM Github Enterprise before
    cloning the submodules.  The submodule command will prompt you for your git username and password for every submodule.
    If you have PAT, you can just paste that in for every username and leave the passwords blank to get through all of these
    prompts.

- Install the NPM dependencies for Athena.
    ```
    # From the root of the Athena project
    > npm install
    ```

- Install the Apollo UI's dependencies and build Apollo.
    ```
    # Remember that Apollo is included as a submodule
    > cd ./apollo

    > npm install
    > npm run build

    # Return to the root of the project
    > cd ..
    ```

- Copy the `dev.json` and `my_config.yaml` from [Acquiring a Deployer Backend](#acquiring-a-deployer-backend) to the `env` directory.
    ```
    > cat env/dev.json
    {
        "DB_CONNECTION_STRING": "http://localhost:5984",
        "DB_SYSTEM": "athena_system",
        "CONFIGURE_FILE": "./env/my_config.yaml"
    }

    > cat env/my_config.yaml
    ---
    initial_admin: myemail@us.ibm.com
    ... You get the idea
    ```

- Run Athena.
    ```
    > node app.js
    ```

- RECOMMENDED: Run the app using `npm start`, a CLI tool that will restart Athena for you whenever you make a code change.
	```
	> npm start
	```

- Open your browser and go to the url defined in `HOST_URL` which is normally [http://localhost:3000](http://localhost:3000)

- Log in using the `initial_admin` and `default_user_password_initial` values from `my_config.yaml` for the username and password,
respectively.  You will be asked to change your password.

# Release Management

As you saw in the [Cloning and Running the Code](#cloning-and-running-the-code), a working build of Athena involves assembling
dependencies for both Athena and the Apollo UI submodule.  This completed software package is creating and published for
multiple target environments.  For now, there are two:

1. SaaS (a public IBM Cloud Catalog Blockchain Platform service instance)
2. ICP/Software (IBM Cloud Private w/ Blockchain Platform)

For any target environment, Athena is delivered through the following steps.

1. An Athena maintainer creates a release tag (`v0.4.23`, `v0.4.23-1`, `v0.4.24`, etc.) and pushes it to the repository.
2. A Travis build is kicked off that builds a docker image with a corresponding tag.
> See the [`.travis.yml`](.travis.yml) for more details.  Notice how certain jobs only run under certain conditions.
3. Either a dump of the image or the updated image tag are delivered to a handler for the target environment.

## Preparing the Release

As we implement new features and polish functionality, we sometimes want to highlight key features of a new release to users
in a set of release notes, which we display to users in a page on Apollo.  This page renders the information contained in
[releaseNotes.json](public/releaseNotes.json), a static file served up by Athena.  Before you create the tag for a large
release, you should update this file to help users understand what's changed in the new build.

Next, update apollo and build a new tag on athena, apollo & stitch with the script `update_build.sh`. This script will increment the pre-release version in `package.json` and push the tags.

```
sh ./scripts/update_build.sh
```

## Publishing a Release

Whenever a commit is pushed to this repository, whether it's an update to a branch, a new tag, or an update to a PR, the
`.travis.yml` in that commit is scanned by [IBM Travis](https://travis.ibm.com/IBM-Blockchain/athena).  If the pushed
commit satisfies the conditions of one or more jobs described in the file, a Travis build will be started for that
commit.  On tagged commits, a set of build jobs for creating OpTools docker images will be started in parallel.

For our example, let's assume you pushed a new release tag:
```
git checkout master  # Let's release the latest code!
git tag v0.4.20
git push --tags
```

1. Build an `amd64` docker image for SaaS.
    - Publishes the following images:
        - `registry.ng.bluemix.net/op-tools/op-tools:5c86779-amd64`
        - `registry.ng.bluemix.net/op-tools/op-tools:v0.4.45-amd64`
    - Updates the OpTools image tag used by the dev SaaS Deployer to `v0.4.45-amd64`.  [See below.](#deploying-a-release-to-saas)
2. Build an `amd64` docker image for ICP/Software.
    - Publishes the following images:
        - `wcp-ibp-stable-docker-local.artifactory.swg-devops.com/ibp-console.amd64:5c86779-ubi8`
        - `wcp-ibp-stable-docker-local.artifactory.swg-devops.com/ibp-console.amd64:v0.4.45-ubi8`
3. Build an `ppc64le` docker image for ICP/Software.
    - Publishes the following images:
        - `wcp-ibp-stable-docker-local.artifactory.swg-devops.com/ibp-console.ppc64le:5c86779-ubi8`
        - `wcp-ibp-stable-docker-local.artifactory.swg-devops.com/ibp-console.ppc64le:v0.4.45-ubi8`
4. Build an `s390x` docker image for ICP/Software.
    - Publishes the following images:
        - `wcp-ibp-stable-docker-local.artifactory.swg-devops.com/ibp-console.s390x:5c86779-ubi8`
        - `wcp-ibp-stable-docker-local.artifactory.swg-devops.com/ibp-console.s390x:v0.4.45-ubi8`

> We normally force users to set a `LICENSE=accept` env variable on our containers to use them for ICP/Software.  We
hardcode this parameter in the SaaS image, requiring a different build.

> Note that `registry.ng.bluemix.net` and `us.icr.io` resolve to the same registry.

## Deploying a Release to SaaS

In SaaS, Athena/OpTools deployments for many users run on a shared IKS cluster, separated by Kubernetes namespaces.  All
of these deployments are managed by [Deployer](https://github.ibm.com/IBM-Blockchain/blockchain-deployer).  Deployer is
controlled by a configuration document that specifies which docker images it should use for all of the various deployments
it is responsible for.  In order to put a new release within reach of SaaS users, you must first update Deployer to use an
tagged image for that release.

Deployer provides an API to allow you to update various config parameters, including image tag to be used when creating or
updating OpTools deployments.  Here are the URLs to use for the dev, staging, and prod Deployer APIs:

- Dev: `https://api.dev.blockchain.test.cloud.ibm.com/api/v2/internal_api/settings/deployer`
- Staging: `https://api.staging-ibp.us-south.containers.appdomain.cloud/api/v2/internal_api/settings/deployer`
- Production: Ping [Mihir Shah](mailto:mrshah@us.ibm.com) for updates to production. Production updates have their own
  process.  It takes sign-offs and approvals.  It's a _whole thing_.
> These APIs are authenticated using basic auth.  Contact [Varad Ramamoorthy](mailto:varad@us.ibm.com) or [Mihir Shah](mailto:mrshah@us.ibm.com)
> for credentials.

> On releases that fit the `vX.X.X` semver format (ex `v0.3.24`, `v1.3.5-1`, etc.), dev will automatically be updated to
> use the published image.  This will be posted in the `#ibp-code-promotion`.

You can update the OpTools tag a given Deployer is using via a `curl` call like the following:
```
$ curl -X POST -u <user>:<password> \
https://api.dev.blockchain.test.cloud.ibm.com/api/v2/internal_api/settings/deployer \
-H 'Content-Type: application/json' \
-d '{ "updates": { "image.optoolstag": "v0.4.20" } }'

ok
```

Once the updated tag is in the Deployer config, it can take up to 10 minutes for Deployer to pick up the change.  After
that, any new Blockchain Platform service instances or any instances where a user refreshes their associated cluster
will use the updated OpTools image to deploy OpTools.  Sometimes, it's good to check that this has gone through by
refreshing the cluster on an instance of your own after one of these updates.

## Deploying a Release to ICP/Software

Though we may publish images for multiple architectures from the Athena CI, it is the responsibility of the [ibp-image-push](https://github.ibm.com/ibp/ibp-image-push)
repo's CI to pull the images published by Athena's CI and package them with a bunch of other images to make a complete
software release. Contact [Mihir Shah](mailto:mrshah@us.ibm.com) or [Dhyey Shah](mailto:dbshah@ibm.com) if you need to
kick off a build from this repo and deploy a new ICP/Software release.

# Detect Secrets
Ok so this shit show of a program will try to find "secrets" in our source code.
It flags anything that remotely looks like a password w/o any context.
So its very error prone making it very annoying.
It almost doesn't work on Windows, so good luck if thats affects you.
It will fail strings differently when running on windows or linux.
Running it on windows is pointless.
Its hot garbage.

**How to use:**

Run this to install it (need `python` v3 and `pip`):
> pip install --upgrade git+https://github.com/ibm/detect-secrets.git@master#egg=detect-secrets

Run this command to update the "baseline" file:
> detect-secrets-hook --baseline .secrets.baseline

Run this command to verify each "password":
> detect-secrets audit .secrets.baseline

- alternatively you can edit the `.secrets.baseline` file and set `"is_secret": false` on each entry
- you need to run `detect-secrets scan > .secrets.baseline` to establish the initial baseline, but thats already done.
- detect-secrets link: https://w3.ibm.com/w3publisher/detect-secrets/developer-tool

# Tips

- Don't forget to keep submodules updated as you're testing and developing the code:
    ```
    # `cd` to the root of the Athena project first
    > git submodule update
    ```
    > If this command fails, make sure the `apollo` and `stitch` directories are clean (undo any local changes, `git status` should be empty)

- Having trouble understanding a specific Athena API?  The [docs](docs) directory has some great documentation on the Athena
REST APIs.  It is recommended that you peruse these documents for information on APIs that you're testing or developing.

- Download the master Postman Collection [OpTools.master.postman_collection.json](./json_docs/OpTools.master.postman_collection.json) and import it into your [Postman application](https://www.getpostman.com) on your laptop.

- There are more ways to get a development environment going than the ones mentioned in this guide.  Don't hesitate to reach out and ask for alternatives
if the steps described here don't get you what you need.

# Architecture

Below is a high level architecture diagram depicting an OpTools deployment.
See the [_architecture.md](./docs/_architecture.md) doc for many more details.
![](./docs/images/everything_diagram.png)

***

# Crypto Notes

Athena + Apollo + Stitch [crypto dependency breakdown](./docs/_crypto_notes.md).
