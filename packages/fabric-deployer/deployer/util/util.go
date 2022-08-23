/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 * 	  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package util

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"

	"github.com/IBM-Blockchain/fabric-deployer/config"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

func GenRandomName(prefix string) string {
	// Get a unique number of length 5
	num, _ := rand.Int(rand.Reader, big.NewInt(int64(5)))
	return prefix + num.String()
}

func IgnoreAlreadyExistError(err error) error {
	if !strings.Contains(err.Error(), "already exists") {
		return err
	}
	return nil
}

func GetErrorStatusCode(err error) int {
	derr := strings.ToLower(err.Error())
	if strings.Contains(derr, "bad request") {
		return http.StatusBadRequest
	}
	if strings.Contains(derr, "unauthorized") {
		return http.StatusUnauthorized
	}
	if strings.Contains(derr, "forbidden") {
		return http.StatusForbidden
	}
	if strings.Contains(derr, "not found") {
		return http.StatusNotFound
	}
	if strings.Contains(derr, "already exists") {
		return http.StatusConflict
	}
	return http.StatusInternalServerError
}

func GetDefaultVersion(comp string, versions *config.Versions) string {
	comp = strings.ToLower(comp)

	switch comp {
	case "ca":
		caVersions := versions.CA
		for versionString, version := range caVersions {
			if version.Default == true {
				return versionString
			}
		}
	case "peer":
		peerVersions := versions.Peer
		for versionString, version := range peerVersions {
			if version.Default == true {
				return versionString
			}
		}
	case "orderer":
		ordererVersions := versions.Orderer
		for versionString, version := range ordererVersions {
			if version.Default == true {
				return versionString
			}
		}
	}

	return ""
}

func IsValidVersion(comp string, version string, versions *config.Versions) bool {
	comp = strings.ToLower(comp)

	switch comp {
	case "ca":
		caVersions := versions.CA
		for versionString := range caVersions {
			if versionString == version {
				return true
			}
		}
	case "peer":
		peerVersions := versions.Peer
		for versionString := range peerVersions {
			if versionString == version {
				return true
			}
		}
	case "orderer":
		ordererVersions := versions.Orderer
		for versionString := range ordererVersions {
			if versionString == version {
				return true
			}
		}
	}
	return false
}

type ResourceReturn struct {
	Requests Resource `json:"requests"`
	Limits   Resource `json:"limits"`
}

type Resource struct {
	CPU    string `json:"cpu"`
	Memory string `json:"memory"`
}

func GetTotalDeploymentResources(resources []*corev1.ResourceRequirements) *ResourceReturn {
	var requestCPU int
	var requestMemory int
	var limitCPU int
	var limitMemory int

	for _, resource := range resources {
		requestCPU += ConvertCPUToNum(resource.Requests.Cpu())
		requestMemory += ConvertMemToNum(resource.Requests.Memory())
		limitCPU += ConvertCPUToNum(resource.Limits.Cpu())
		limitMemory += ConvertMemToNum(resource.Limits.Memory())
	}

	return &ResourceReturn{
		Requests: Resource{
			CPU:    strconv.Itoa(requestCPU) + "m",
			Memory: strconv.Itoa(requestMemory) + "M",
		},
		Limits: Resource{
			CPU:    strconv.Itoa(limitCPU) + "m",
			Memory: strconv.Itoa(limitMemory) + "M",
		},
	}
}

const (
	kibibyte = 1024
	kilobyte = 1000
	mebibyte = kibibyte ^ 2
	megabyte = kilobyte ^ 2
	gibibyte = mebibyte * kibibyte
	gigabyte = megabyte * kilobyte
)

func ConvertCPUToNum(cpu *resource.Quantity) int {
	str := cpu.String()

	var num int
	if strings.HasSuffix(str, "m") {
		num = atoi(strings.Split(str, "m")[0])
	} else {
		num = atoi(str)
		num = num * 1000
	}

	return num
}

func ConvertMemToNum(mem *resource.Quantity) int {
	str := mem.String()

	var num int
	if strings.Contains(str, "Ki") {
		num = atoi(strings.Split(str, "Ki")[0])
		num = num * kibibyte
	} else if strings.Contains(str, "K") {
		num = atoi(strings.Split(str, "K")[0])
		num = num * kilobyte
	} else if strings.Contains(str, "Mi") {
		num = atoi(strings.Split(str, "Mi")[0])
		num = num * mebibyte
	} else if strings.Contains(str, "M") {
		num = atoi(strings.Split(str, "M")[0])
		num = num * megabyte
	} else if strings.Contains(str, "Gi") {
		num = atoi(strings.Split(str, "Gi")[0])
		num = num * gibibyte
	} else if strings.Contains(str, "G") {
		num = atoi(strings.Split(str, "G")[0])
		num = num * gigabyte
	} else {
		num = atoi(str)
	}

	return num / megabyte
}

func GetServiceName(compName string) string {
	return fmt.Sprintf("%s", compName)

}

func GetZoneAndRegion(zone, region string) (string, string) {
	returnZone := zone
	returnRegion := region

	if zone == "x-multizone" || region == "x-multizone" {
		return "", ""
	}

	if zone == "" {
		returnZone = "select"
	}

	if region == "" {
		returnRegion = "select"
	}

	return returnZone, returnRegion
}

func GetMajorRelease(version string) int {
	if len(version) == 0 {
		return 0
	}

	if IsFullFabricVersion(version) {
		version = strings.Split(version, "-")[0]
	}

	if version[0:1] == "v" || version[0:1] == "V" {
		version = version[1:]
	}
	return atoi(strings.Split(version, ".")[0])
}

func atoi(s string) int {
	num, err := strconv.Atoi(s)
	if err != nil {
		// strconv.Atoi(string) returns 0 along with error, so just return 0
		return 0
	}

	return num
}

// Maps <fabricVersion>-<releaseDate> from <ca/orderer/peer>Tag to its corresponding fabric version
var Lookup = map[string]string{
	"1.4.6-20200520": "1.4.6-2",
	"1.4.7-20200618": "1.4.7-0",
	"1.4.7-20200714": "1.4.7-1",
	"1.4.7-20200825": "1.4.7-2",
	"1.4.7-20201001": "1.4.7-3",
	"2.1.1-20200618": "2.1.1-0",
	"2.1.1-20200714": "2.1.1-1",
	"2.1.1-20200825": "2.1.1-2",
	"2.1.1-20201001": "2.1.1-3",
	"sha256:5e41ad17db016c3d3026ec931b9f8bc4ecb44e7617def38b5ed8ef55d8cb0f6d": "1.4.9-0", // ca
	"sha256:2037c532f6c823667baed5af248c01c941b2344c2a939e451b81ea0e03938243": "1.4.9-1", // ca
	"sha256:3b9ef25ad835fa6289f8e5a6c7f48db016d1f317348bc1cee44be330a43aa176": "1.4.9-1", // peer 1.4
	"sha256:730dc10549f47e039e6609f18167825ce2bcefdaddf40715c37b54bf7bd5e017": "2.2.1-1", // peer 2.2
	"sha256:04b405a56b2e8e94862dd490d12e41ff8244990b8074214d2d3afc515a2022ba": "1.4.9-1", // orderer 1.4
	"sha256:f6993b4deb2c62f54954b98a20e515eb941c67d6d4477f12eb3d4e3efbb75f5e": "2.2.1-1", // orderer 2.2
	"sha256:889e64f33172a6bc900060c0327078a25b4893a5487d096961bd81066d523aaa": "1.4.9-2", // ca
	"sha256:668785bc9c125c4f511edd41f51db641586a09a1dc6b1204ac942c644ba77276": "1.4.9-2", // peer 1.4
	"sha256:a657e9269aa7d99da6c853fdf6cd8968f6bfcb83cf4fb0cc0543822c54be9644": "2.2.1-2", // peer 2.2
	"sha256:5ee941b705cd0a65ae227e328b7d40d3afde5c84c298339ef6b15375f998221e": "1.4.9-2", // orderer 1.4
	"sha256:5fda84689e5b9ef45ea31343106c838e7dc831c5f0d6cf3ed8879a7674a74cc3": "2.2.1-2", // orderer 2.2
	"sha256:9c0ffb13f2bb6443ba88ac83b1dfd8e96a4b550880952bd7090b37fa6c28e322": "1.4.9-3", // ca
	"sha256:c1cb180f85d0f6ffbbe861efc990bbe21f617736b401a6f4d9b1c8d8dfb69fb5": "1.4.9-3", // peer 1.4
	"sha256:c1c2f0ab4a76e3639d7e93c4d2276e9cd142f4e545b8f77f71066602d95e51ed": "2.2.1-3", // peer 2.2
	"sha256:13935d0d3dfbea91919478a0dfc0eb1284c3f62e9d9add663d1e5336eafe7b85": "1.4.9-3", // orderer 1.4
	"sha256:d8f2dfbb2219141adc07e4dcf9ade152ee2c3a4236f0bf175bffc49b040ad775": "2.2.1-3", // orderer 2.2
	"sha256:ad7591b7d8c141d7eac67c79178ad77a646515a4c1041843bd8c6a653a2d5f40": "1.4.9-4", // peer 1.4.9-4
	"sha256:fbddbab59e1a356479fe6b2d5a4244268026027707955d484c7603709d9066b2": "2.2.1-4", // peer 2.2.1-4
	"sha256:c29fda827e18f148573a020a28287aa6f7f160700bfca33ff795e648c6da54d0": "1.4.9-4", // orderer 1.4.9-4
	"sha256:d096e5815c3c28e9ee9fc4378c0672d6e10f871148cc13649ab4337ea177f7f7": "2.2.1-4", // orderer 2.2.1-4
	"sha256:d22fb839635e880abff622257c5e3c9d5984f27be0c06ec1106dc748a88baaa0": "1.4.9-5", // ca
	"sha256:b16fe2cbae5f53fc5494b7a09bdcf13e1d18da52f9a86b6ee6e852885c7fcd84": "1.4.9-5", // peer 1.4.9-5
	"sha256:fa051805656584edec209e538e156f1cc1b0929f4ef22831bdc89f65a61ea125": "2.2.1-5", // peer 2.2.1-5
	"sha256:a4454e9c2a0a42665512b005d1ddb2b2a0a3c07b0304daf0aea80a1f05339335": "1.4.9-5", // orderer 1.4.9-5
	"sha256:e2333d3545e814ab06aa5223fe53545d54b708bdf52dd1dbb8d10931a0408594": "2.2.1-5", // orderer 2.2.1-5
	"sha256:383ebcc1d9bcacf722284a506c03d5ebabd436bb4f84a0ddf75ffe85142cf77c": "1.4.9-6", // ca 1.4.9-6
	"1.4.9-20201030": "1.4.9-1",
	"1.4.9-20201119": "1.4.9-2",
	"1.4.9-20201208": "1.4.9-3",
	"1.4.9-20210112": "1.4.9-4",
	"1.4.9-20210222": "1.4.9-5",
	"2.2.1-20201030": "2.2.1-1",
	"2.2.1-20201119": "2.2.1-2",
	"2.2.1-20201208": "2.2.1-3",
	"2.2.1-20210112": "2.2.1-4",
	"2.2.1-20210222": "2.2.1-5",
}

const (
	V1_4 = "V1.4"
	V2_0 = "V2.0"

	// Current 2.5.1 versions
	V1_4_9 = "1.4.9"
	V2_2_1 = "2.2.1"
)

func IsFullFabricVersion(version string) bool {
	if strings.Contains(version, "-") {
		return true
	}
	return false
}

func GetFullFabricVersion(version, tag string) string {
	// Otherwise, use tag to get full fabric version.
	tagItems := strings.Split(tag, "-")
	if len(tagItems) != 3 {

		if strings.Contains(tag, "sha256") {
			fullVersion := Lookup[tag]
			return fullVersion
		}
		return version
	}

	fabVersion := tagItems[0]
	releaseDate := tagItems[1]
	prefix := fmt.Sprintf("%s-%s", fabVersion, releaseDate)
	fullVersion := Lookup[prefix]

	if fullVersion != "" {
		return fullVersion
	}

	if version == V1_4 || version == V2_0 {
		// Return x.y.z-0
		return fmt.Sprintf("%s-0", fabVersion)
	} else if version == "" {
		return fabVersion
	}

	return version
}
