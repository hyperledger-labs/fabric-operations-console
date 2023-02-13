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

echo "Checking test coverage..."

TEST_RESULTS=$1

SC=0
INSUFFICIENT_COVERAGE=`awk '$1 == "?" || ($1 == "ok" && $5 != "100.0%" && substr($5, 0, length($5)-1) < 80)' $TEST_RESULTS`
if [ "$INSUFFICIENT_COVERAGE" != "" ]; then
   echo "*** BEGIN INSUFFICIENT TEST COVERAGE (less than 80%) ***"
   echo "$INSUFFICIENT_COVERAGE"
   echo "*** END INSUFFICIENT TEST COVERAGE (less than 80%) ***"
   SC=1
fi
exit $SC
