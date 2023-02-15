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

echo "Running unit tests..."

export PATH=$PATH:$GOPATH/bin

# List of packages to not run test for
EXCLUDED_PKGS=(
    "/mocks"
    "/integration"
    "/components$"
    "/cmd"
    "/deployer-to-go$"
    "api"
    "kube"
    "ibpoperator"
)

PKGS=`go list github.com/IBM-Blockchain/fabric-deployer/... | grep -v -f <(printf '%s\n' "${EXCLUDED_PKGS[@]}")`

COVERAGE=$TEST_COVERAGE
if [ "$COVERAGE" = true ]; then
  go test -cover -v $PKGS | tee test.results
  $PWD/scripts/check_test_results.sh test.results
else
  go test -cover $PKGS
fi

exit $?
