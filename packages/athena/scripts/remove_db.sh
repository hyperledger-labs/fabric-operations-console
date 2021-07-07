#!/usr/bin/env bash
# Remove CouchDB from Ubuntu or Mac OS X

# Create string for OS type
operating_system_type=`uname`

fancy_echo() {
  local fmt="$1"; shift

  # shellcheck disable=SC2059
  printf "\n[CouchDB Installer] - $fmt\n" "$@"
}

echo -n 'This will remove the optools_preferences database and CouchDB from your system. Do you want to proceed? (Y/y)'
read -r -n 1 response
if [ ${response} == 'y' ] || [ ${response} == 'Y' ]; then
  # Check if CouchDB is running and if so remove the optools_preferences database
  ps auxw | grep couchdb | grep -v grep > /dev/null

  if [[ $? == 0 ]]; then
    fancy_echo 'Deleting the optools_preferences database...'
    curl -X DELETE http://127.0.0.1:5984/optools_preferences
  fi

  # Check if user is using Linux
  if [[ "$operating_system_type" == 'Linux' ]]; then
    fancy_echo 'Stopping CouchDB'
    sudo service couchdb Stopping
    fancy_echo 'Removing CouchDB and configuration files...'
    sudo apt-get remove --auto-remove couchdb
    sudo apt-get purge --auto-remove couchdb
    fancy_echo 'The optools_preferences database and CouchDB have been removed from your system'
  # Check if user is using Mac OS X
  elif [[ "$operating_system_type" == 'Darwin'  ]]; then
    fancy_echo 'Stopping CouchDB...'
    brew services stop couchdb
    fancy_echo 'Removing CouchDB, dependencies, and configuration files...'
    brew uninstall couchdb --force
    brew remove --force autoconf autoconf-archive automake erlang couchdb icu4c spidermonkey nspr
    rm -rf ~/Library/Application\ Support/CouchDB2/
    rm -rf ~/Library/Application\ Support/Couchbase
    rm -rf ~/Library/Application\ Support/Membase
    fancy_echo 'The optools_preferences database and CouchDB have been removed from your system'
  fi
fi
