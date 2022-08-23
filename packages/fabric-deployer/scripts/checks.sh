#!/bin/bash
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

go mod download

echo "Running 'go vet'"
OUTPUT=`go vet -all ./... 2>&1`
if [ -n "$OUTPUT" ]; then
    echo "The following files contain go vet errors"
    echo $OUTPUT
    exit 1
fi
echo "No 'go vet' issues found"

cd /tmp
go install golang.org/x/tools/cmd/goimports@ff88973b1e4e
cd -
echo "Checking imports ..."
found=`goimports -l \`find . -path ./vendor -prune -o -name "*.go" -print\` 2>&1`
found=$(echo "$found" | grep -v generated)
if [ "$found" != "" ]; then
   echo "The following files have import problems:"
   echo "$found"
   echo "You may run 'goimports -w <file>' to fix each file."
   exit 1
fi
echo "All files are properly formatted"