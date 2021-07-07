#!/usr/bin/env bash
# Installs CouchDB on Ubuntu or OS X and creates the optools_preferences database

# Create string for OS type
operating_system_type=`uname`

fancy_echo() {
  local fmt="$1"; shift

  # shellcheck disable=SC2059
  printf "\n[CouchDB Installer] - $fmt\n" "$@"
}

append_to_file() {
  local file="$1"
  local text="$2"

  if ! grep -qs "^$text$" "$file"; then
    printf "\n%s\n" "$text" >> "$file"
  fi
}

create_bash_profile_and_set_it_as_shell_file() {
  if [ ! -f "$HOME/.bash_profile" ]; then
    touch "$HOME/.bash_profile"
  fi

  shell_file="$HOME/.bash_profile"
}

create_optools_preferences_database() {
  db_not_found=$(curl -sX GET http://127.0.0.1:5984/optools_preferences)
  if [[ ${db_not_found} == '{"error":"not_found","reason":"Database does not exist."}' ]] || \
     [[ ${db_not_found} == '{"error":"not_found","reason":"no_db_file"}' ]]; then
     # Create the optools_preferences database
     fancy_echo 'Creating the optools_preferences database...'
     curl -X PUT http://127.0.0.1:5984/optools_preferences
     fancy_echo 'The optools_preferences database has been created'
  else
    fancy_echo 'The optools_preferences database already exists'
  fi
}

if ! command which couchdb; then
  # Check if user is using Linux
  if [[ "$operating_system_type" == 'Linux' ]]; then

    # If Curl isn't installed then install it
    if ! command which curl; then
      echo '[CouchDB Installer] - Installing Curl...'
      sudo apt install curl
    else
      fancy_echo 'Curl is already installed. Skipping...'
    fi

    # If Ruby isn't installed then install it
    if ! command which ruby; then
      echo '[CouchDB Installer] - Installing Ruby...'
      yes '' | sudo apt install ruby-full
    else
      fancy_echo 'Ruby is already installed. Skipping...'
    fi

    # Installing CouchDB
    fancy_echo 'Starting CouchDB installation...'
    fancy_echo 'Updating Ubuntu...'; yes '' | sudo apt update
    fancy_echo 'Installing software-properties-common...'; yes '' | sudo apt install software-properties-common
    fancy_echo 'Adding the CouchDB repository...'; yes '' | sudo add-apt-repository ppa:couchdb/stable
    fancy_echo 'Updating Ubuntu again...'; yes '' | sudo apt update
    fancy_echo 'Installing CouchDB...'; yes '' | sudo apt install couchdb
    fancy_echo 'Starting CouchDB...'; yes '' | sudo service couchdb start

    # Wait until we're sure CouchDB has started
    until ruby -rsocket -e "TCPSocket.new('localhost',5984)"; do sleep 1; done

    # Create the optools_preferences database
    fancy_echo 'Creating the optools_preferences database...'
    curl -X PUT http://127.0.0.1:5984/optools_preferences
    fancy_echo 'CouchDB and the optools_preferences database have been created'

  # Check if user is using Mac OS X
  elif [[ "$operating_system_type" == 'Darwin'  ]]; then
    create_bash_profile_and_set_it_as_shell_file

    # If Homebrew isn't installed then install it
    if ! command -v brew >/dev/null; then
      fancy_echo 'Installing Homebrew ...'
      curl -fsS \
        'https://raw.githubusercontent.com/Homebrew/install/master/install' | ruby

      # shellcheck disable=SC2016
      append_to_file "$shell_file" 'export PATH="/usr/local/bin:$PATH"'
    else
      fancy_echo 'Homebrew already installed. Skipping...'
    fi

    # If Ruby isn't installed then install it
    if ! command which ruby; then
      fancy_echo 'Installing Ruby...'
      brew install ruby
    else
      fancy_echo 'Ruby already installed. Skipping...'
    fi

    # Install CouchDB
    fancy_echo 'Starting CouchDB installation...'
    fancy_echo 'Installing XCode...'; xcode-select --install
    fancy_echo 'Installing autoconf...'; brew install autoconf
    fancy_echo 'Installing autoconf-archive...'; brew install autoconf-archive
    fancy_echo 'Installing automake...'; brew install automake
    fancy_echo 'Installing libtool...'; brew install libtool
    fancy_echo 'Installing erlang...'; brew install erlang --without-docs
    fancy_echo 'Installing icu4c...'; brew install icu4c
    fancy_echo 'Installing spidermonkey...'; brew install spidermonkey
    fancy_echo 'Installing Curl...'; brew install curl
    fancy_echo 'Linking icu4c...'; brew link icu4c
    fancy_echo 'Linking erlang...'; brew link erlang
    fancy_echo 'Installing CouchDB...'; brew install couchdb
    fancy_echo 'Starting CouchDB...'; brew services start couchdb

    # Wait until we're sure CouchDB has started
    until ruby -rsocket -e "TCPSocket.new('localhost',5984)"; do sleep 1; done

    # Create the optools_preferences database
    fancy_echo 'Creating the optools_preferences database...'
    curl -X PUT http://127.0.0.1:5984/optools_preferences
    fancy_echo 'CouchDB and the optools_preferences database have been created'
  fi
else
  fancy_echo 'CouchDB is already installed. Starting CouchDB and checking for optools_preferences database...'
  if [[ ${operating_system_type} == 'Linux' ]]; then
    fancy_echo 'Starting CouchDB...'; yes '' | sudo service couchdb start
  elif [[ ${operating_system_type} == 'Darwin' ]]; then
    fancy_echo 'Starting CouchDB...'; brew services start couchdb
  fi

  # Wait until we're sure CouchDB has started
  until ruby -rsocket -e "TCPSocket.new('localhost',5984)"; do sleep 1; done

  # Create the optools_preferences database
  create_optools_preferences_database
fi
