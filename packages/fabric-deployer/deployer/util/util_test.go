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

package util_test

import (
	"errors"

	"github.com/IBM-Blockchain/fabric-deployer/deployer/util"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

var _ = Describe("Util", func() {

	It("generates a random component name with the specified prefix", func() {
		name := util.GenRandomName("random")
		Expect(name).Should(MatchRegexp(`random\d`))
	})

	Context("already exists error", func() {
		It("returns error if it is not an already exists error", func() {
			err := util.IgnoreAlreadyExistError(errors.New("failed to create resource"))
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("failed to create resource"))
		})

		It("does not return error if an already exists error", func() {
			err := util.IgnoreAlreadyExistError(errors.New("resource already exists"))
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("GetTotalDeploymentResources", func() {
		It("returns total value of memory", func() {
			r := map[corev1.ResourceName]resource.Quantity{}
			r[corev1.ResourceMemory] = resource.MustParse("2G")
			r2 := map[corev1.ResourceName]resource.Quantity{}
			r2[corev1.ResourceMemory] = resource.MustParse("1000M")
			resource := []*corev1.ResourceRequirements{
				&corev1.ResourceRequirements{
					Requests: r,
					Limits:   r,
				},
				&corev1.ResourceRequirements{
					Requests: r2,
					Limits:   r2,
				},
			}
			num := util.GetTotalDeploymentResources(resource)
			Expect(num.Requests.Memory).To(Equal("3000M"))
			Expect(num.Limits.Memory).To(Equal("3000M"))
		})
	})

	Context("ConvertMemToNum", func() {
		It("returns int value of resource", func() {
			mem := resource.MustParse("2G")
			num := util.ConvertMemToNum(&mem)
			Expect(num).To(Equal(2000))
		})
	})

	Context("GetZoneAndRegion", func() {
		It("returns correct value for zone and region if blank is passed for both", func() {
			zone, region := util.GetZoneAndRegion("", "")
			Expect(zone).To(Equal("select"))
			Expect(region).To(Equal("select"))
		})

		It("returns correct value when zone is set and region is blank", func() {
			zone, region := util.GetZoneAndRegion("zone1", "")
			Expect(zone).To(Equal("zone1"))
			Expect(region).To(Equal("select"))
		})

		It("returns correct value when zone is blank and region is set", func() {
			zone, region := util.GetZoneAndRegion("", "region1")
			Expect(zone).To(Equal("select"))
			Expect(region).To(Equal("region1"))
		})

		It("returns correct value when zone is set and region is set", func() {
			zone, region := util.GetZoneAndRegion("zone1", "region1")
			Expect(zone).To(Equal("zone1"))
			Expect(region).To(Equal("region1"))
		})

		It("returns correct value when zone is multizone and region is multizone", func() {
			zone, region := util.GetZoneAndRegion("x-multizone", "x-multizone")
			Expect(zone).To(Equal(""))
			Expect(region).To(Equal(""))
		})

		It("returns correct value when zone is multizone and region is blank", func() {
			zone, region := util.GetZoneAndRegion("x-multizone", "")
			Expect(zone).To(Equal(""))
			Expect(region).To(Equal(""))
		})

		It("returns correct value when zone is blank and region is x-multizone", func() {
			zone, region := util.GetZoneAndRegion("", "x-multizone")
			Expect(zone).To(Equal(""))
			Expect(region).To(Equal(""))
		})
	})

	Context("IsFullFabricVersion", func() {
		It("returns false if missing upgrade from version", func() {
			isFull := util.IsFullFabricVersion("1.4.7")
			Expect(isFull).To(Equal(false))
		})

		It("returns true if upgrade included in version", func() {
			isFull := util.IsFullFabricVersion("1.4.7-0")
			Expect(isFull).To(Equal(true))
		})
	})

	Context("GetFullFabricVersion", func() {
		It("returns version if digest not found in lookup", func() {
			tag := "sha:12345"
			version := util.GetFullFabricVersion("1.4.9", tag)
			Expect(version).To(Equal("1.4.9"))
		})

		It("returns version if digest found in lookup", func() {
			tag := "sha256:04b405a56b2e8e94862dd490d12e41ff8244990b8074214d2d3afc515a2022ba"
			version := util.GetFullFabricVersion("1.4.9", tag)
			Expect(version).To(Equal("1.4.9-1"))
		})

		It("returns full 2.0 version if 2.5.0 based operator", func() {
			tag := "2.1.1-20200618-amd64"
			version := util.GetFullFabricVersion("V2.0", tag)
			Expect(version).To(Equal("2.1.1-0"))
		})

		It("returns full 1.4 version if 2.5.0 based operator", func() {
			tag := "1.4.7-20200618-amd64"
			version := util.GetFullFabricVersion("V1.4", tag)
			Expect(version).To(Equal("1.4.7-0"))
		})
	})
})
