# UI driven functional tests

These Cucumber driven Protractor tests are ran on every pull request in Travis.

Then general flow of what happens in Travis is the following:

1. Athena (master branch) is cloned, and the Apollo submodule is updated to pull in the changes from the pull request branch.

2. Several deploy scripts are ran in order to export environment variables, prepare Apollo, etc.

3. The Athena + Apollo project is built into a Docker image (these scripts were taken from Athena and adapted).

4. The OpenShift CLI & ibmcloud CLI are installed.

5. An OpenShift project is created with the name `<COMMIT_HASH>-<TRAVIS_BUILD_NUMBER>-amd64`.
   For example, `3f892dc8-36613587-amd64`.

6. Ansible playbooks are created for the IBM Blockchain Platform collection for Ansible - [documentation can be found here](https://ibm-blockchain.github.io/ansible-collection/index.html).

7. A Docker image is built to run the IBM Blockchain Platform collection for Ansible.

8. The playbook is ran - this stands up a console using the latest Athena with the latest PR changes.

9. The Cucumber driven Protractor tests are run headlessly.

10. The console is brought down and destroyed and the OpenShift project is also deleted.

## My tests failed in Travis, what should I do?

If the Travis job made it to building the Athena + Apollo project successfully, it's possible to run stand up a console for the pull request and run the tests locally.

First, find the line in the Travis job which looks like:

```
docker tag apollo-test:latest us.icr.io/op-tools/apollo-dev:3f892dc8-36613600-amd64
```

Make a note of the `3f892dc8-36613600-amd64` part! This will be different for every pull request.

Next, go to the `create_playbooks.sh` script and copy the contents that it used for creating the `start_console.yml` playbook.

E.g.

```
---
- name: Deploy IBM Blockchain Platform console
  hosts: localhost
  vars:
    state: present
    target: openshift
    arch: amd64
    project: $PROJECT_NAME

    ...
```

Create a new file, name it something like `start_console.yml`.
You will need to replace the following variables:

- `$PROJECT_NAME` should be set to the project name `3f892dc8-36613600-amd64` part

- `$IMAGE_TAG_DATE` should be set to `20200611`, or whatever is at the top of `create_playbooks.sh`.

- `consoleTag: "$COMMIT-$TRAVIS_BUILD_ID"` should be set to `consoleTag: "3f892dc8-36613600"` (the first two parts of the project name)

- `ENTITLEMENT_KEY` should be set to your entitlement key which can be retrieved from [here](https://myibm.ibm.com/products-services/containerlibrary)

- `$US_ICR_IO_EMAIL` should be set to an email with access to the IBM Container Registry

You can now build the IBM Blockchain Platform Collection for Ansible image and run the playbook to stand up the console - see `start_console.sh` for more details.

Once the console has been stood up, you are able to run the UI functional tests with `npm run functional`

## Additional Notes

- The URL for the OpenShift cluster is https://console-openshift-console.ibp-ui-automation-68e10f583f026529fe7a89da40169ef4-0000.us-south.containers.appdomain.cloud/

- Depending on how many builds are running, it's possible that the resources required by the consoles exceed the amount the cluster has. Where possible, the number of builds running at once should be limitted to about 2. It's always possible to restart a job!

- It may be necessary to go into the OpenShift cluster and delete old projects - these may be lingering from failed jobs.