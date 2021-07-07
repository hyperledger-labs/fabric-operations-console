# UI Component for Operational Tools

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).

Below you will find some information on how to perform common tasks.<br>
You can find the most recent version of this guide [here](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md).

# Contributing

- Create a branch on the Apollo repository and work off of that - forking the repository and making a pull request from there will fail!
- Install detect-secrets [here](https://w3.ibm.com/w3publisher/detect-secrets/developer-tool) - this is required in order to commit changes to the repository.

# Start server

`git clone git@github.ibm.com:IBM-Blockchain/apollo.git`

`git submodule update --init --remote`

If you get promopted to enter the user id and password visit [GitHub token](https://github.ibm.com/settings/tokens) page and get a personal token. Select the `repo` checkbox to allow that level of access. Use your git short name as the user name and the token as a the password. This should get persisted into the local machine and you shouldn't get prompted next time.

`npm install`

`npm run dev`

# Configure with backend

Clone athena

```
git clone git@github.ibm.com:IBM-Blockchain/athena.git
cd athena
git submodule update --init --remote
npm install
nodemon app.js
```

# Backend and Frontend in one app

```
git clone git@github.ibm.com:IBM-Blockchain/athena.git
cd athena
git submodule update --init --remote
cd apollo
npm install
npm run build
cd ..
npm install
nodemon app.js
```

Make sure the necessary databases are created by going to the following Couch UI

Access Couch DB - http://127.0.0.1:5984/_utils

# Setup Instructions to connect athena/apollo to deployer

Create a free cluster

Upgrade IKS cluster to 1.12

Upgrade worker node to 1.23

In athena setting doc set
`"deployer_url": "https://api.staging-ibp.us-south.containers.appdomain.cloud",`

In athena setting doc add capabilities

```
    "create_channel_enabled": true,
    "remote_peer_config_enabled": true,
    "saas_enabled": true
```

Once you create a service instance and associate it with your cluster, launch the URL for optools from the service instance.

Copy the `si_id` section from the URL and use it with the local setup.

Launch
http://localhost:3001/nodes?si_id=abc-def-43a4-af2c-a584475d59b9

# Resources

[React Carbon Components - Live](http://react.carbondesignsystem.com/)

[Duo](https://github.ibm.com/carbon/duo-monorepo)
