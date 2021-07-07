#!/bin/sh
#
# Licensed Materials - Property of IBM
#
# XXXX-XXX
#
# (C) Copyright IBM Corp. 2019  All Rights Reserved.
#
# US Government Users Restricted Rights - Use, duplication or
# disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
#

if [ "${LICENSE}" = "accept" ]; then
  :
elif [ "${LICENSE}" = "view" ]; then
  cat /licenses/LA_en
  exit 0
else
  LANG_CODE=${LICENSE#view-*}
  if [ "${LANG_CODE}" = "${LICENSE}" ]; then
    echo "Please accept or view the License by setting the \"LICENSE\" env variable to \"accept\", \"view\" or \"view-<language-code>\""
    exit 1
  else
    cat /licenses/LI_${LANG_CODE}
    exit 0
  fi
fi

# Search for environment variables named SECRET_*, whose values specify a file
# name, and create a corresponding environment variable without the SECRET_
# prefix whose value is the contents of the specified file.
for secret_entry in $(env | grep '^SECRET_'); do
  name=${secret_entry%=*} && name=${name#SECRET_}
  value=${secret_entry#*=} && value=$(cat $value)
  export ${name}="${value}"
done

exec "$@"
