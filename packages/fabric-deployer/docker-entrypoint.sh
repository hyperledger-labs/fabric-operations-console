#!/bin/sh
#
# Copyright contributors to the Hyperledger Fabric Operations Console project
#
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
# 	  http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
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