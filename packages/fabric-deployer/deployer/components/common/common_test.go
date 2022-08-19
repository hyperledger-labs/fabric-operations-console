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

package common_test

import (
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	common "github.com/IBM-Blockchain/fabric-deployer/deployer/components/common"
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

var _ = Describe("Common", func() {
	const (
		testCert1 = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNwVENDQWtxZ0F3SUJBZ0lSQU1FeVZVcDRMdlYydEFUREhlWklldDh3Q2dZSUtvWkl6ajBFQXdJd2daVXgKQ3pBSkJnTlZCQVlUQWxWVE1SY3dGUVlEVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFUE1BMEdBMVVFQnhNRwpSSFZ5YUdGdE1Rd3dDZ1lEVlFRS0V3TkpRazB4RXpBUkJnTlZCQXNUQ2tKc2IyTnJZMmhoYVc0eE9UQTNCZ05WCkJBTVRNR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzFqWVM1aGNIQnpMbkIxYldGekxtOXpMbVo1Y21VdWFXSnQKTG1OdmJUQWVGdzB5TURBeE1qSXhPREExTURCYUZ3MHpNREF4TVRreE9EQTFNREJhTUlHVk1Rc3dDUVlEVlFRRwpFd0pWVXpFWE1CVUdBMVVFQ0JNT1RtOXlkR2dnUTJGeWIyeHBibUV4RHpBTkJnTlZCQWNUQmtSMWNtaGhiVEVNCk1Bb0dBMVVFQ2hNRFNVSk5NUk13RVFZRFZRUUxFd3BDYkc5amEyTm9ZV2x1TVRrd053WURWUVFERXpCcVlXNHkKTWkxdmNtUmxjbVZ5YjNKblkyRXRZMkV1WVhCd2N5NXdkVzFoY3k1dmN5NW1lWEpsTG1saWJTNWpiMjB3V1RBVApCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFTR0lHUFkvZC9tQVhMejM4SlROR3F5bldpOTJXUVB6cnN0Cm5vdEFWZlh0dHZ5QWJXdTRNbWNUMEh6UnBTWjNDcGdxYUNXcTg1MUwyV09LcnZ6L0JPREpvM2t3ZHpCMUJnTlYKSFJFRWJqQnNnakJxWVc0eU1pMXZjbVJsY21WeWIzSm5ZMkV0WTJFdVlYQndjeTV3ZFcxaGN5NXZjeTVtZVhKbApMbWxpYlM1amIyMkNPR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzF2Y0dWeVlYUnBiMjV6TG1Gd2NITXVjSFZ0CllYTXViM011Wm5seVpTNXBZbTB1WTI5dE1Bb0dDQ3FHU000OUJBTUNBMGtBTUVZQ0lRQzM3Y1pkNFY2RThPQ1IKaDloQXEyK0dyR21FVTFQU0I1eHo5RkdEWThkODZRSWhBT1crM3Urb2d4bFNWNUoyR3ZYbHRaQmpXRkpvYnJxeApwVVQ4cW4yMDA1b0wKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo="
		testCert2 = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNwVENDQWtxZ0F3SUJBZ0lSQU1FeVZVcDRMdlYydEFUREhlWklldDh3Q2dZSUtvWkl6ajBFQXdJd2daVXgKQ3pBSkJnTlZCQVlUQWxWVE1SY3dGUVlEVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFUE1BMEdBMVVFQnhNRwpSSFZ5YUdGdE1Rd3dDZ1lEVlFRS0V3TkpRazB4RXpBUkJnTlZCQXNUQ2tKc2IyTnJZMmhoYVc0eE9UQTNCZ05WCkJBTVRNR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzFqWVM1aGNIQnpMbkIxYldGekxtOXpMbVo1Y21VdWFXSnQKTG1OdmJUQWVGdzB5TURBeE1qSXhPREExTURCYUZ3MHpNREF4TVRreE9EQTFNREJhTUlHVk1Rc3dDUVlEVlFRRwpFd0pWVXpFWE1CVUdBMVVFQ0JNT1RtOXlkR2dnUTJGeWIyeHBibUV4RHpBTkJnTlZCQWNUQmtSMWNtaGhiVEVNCk1Bb0dBMVVFQ2hNRFNVSk5NUk13RVFZRFZRUUxFd3BDYkc5amEyTm9ZV2x1TVRrd053WURWUVFERXpCcVlXNHkKTWkxdmNtUmxjbVZ5YjNKblkyRXRZMkV1WVhCd2N5NXdkVzFoY3k1dmN5NW1lWEpsTG1saWJTNWpiMjB3V1RBVApCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFTR0lHUFkvZC9tQVhMejM4SlROR3F5bldpOTJXUVB6cnN0Cm5vdEFWZlh0dHZ5QWJXdTRNbWNUMEh6UnBTWjNDcGdxYUNXcTg1MUwyV09LcnZ6L0JPREpvM2t3ZHpCMUJnTlYKSFJFRWJqQnNnakJxWVc0eU1pMXZjbVJsY21WeWIzSm5ZMkV0WTJFdVlYQndjeTV3ZFcxaGN5NXZjeTVtZVhKbApMbWxpYlM1amIyMkNPR3BoYmpJeUxXOXlaR1Z5WlhKdmNtZGpZUzF2Y0dWeVlYUnBiMjV6TG1Gd2NITXVjSFZ0CllYTXViM011Wm5seVpTNXBZbTB1WTI5dE1Bb0dDQ3FHU000OUJBTUNBMGtBTUVZQ0lRQzM3Y1pkNFY2RThPQ1IKaDloQXEyK0dyR21FVTFQU0I1eHo5RkdEWThkODZRSWhBT1crM3Urb2d4bFNWNUoyR3ZYbHRaQmpXRkpvYnJxeApwVVQ4cW4yMDA1b0wKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0"
	)

	var (
		secret *current.SecretSpec
	)

	BeforeEach(func() {
		secret = &current.SecretSpec{
			Enrollment: &current.EnrollmentSpec{
				Component: &current.Enrollment{
					EnrollID:     "test",
					EnrollSecret: "testpw",
					AdminCerts:   []string{testCert1, testCert2},
				},
				TLS: &current.Enrollment{
					EnrollID:     "test",
					EnrollSecret: "testpw",
				},
			},
			MSP: &current.MSPSpec{
				Component: &current.MSP{
					KeyStore:   "this is a keystore",
					SignCerts:  testCert1,
					CACerts:    []string{testCert2},
					AdminCerts: []string{testCert1, testCert2},
				},
				TLS: &current.MSP{
					KeyStore:  "this is a keystore",
					SignCerts: testCert1,
					CACerts:   []string{testCert2},
				},
			},
		}
	})

	Context("AdminCertsFromConfig", func() {
		It("returns admincerts", func() {
			admincerts := common.AdminCertsFromConfig(secret)
			Expect(admincerts).To(HaveLen(2))
			Expect(admincerts).To(ContainElements(testCert1, testCert2))
		})
	})

	Context("RemoveSensitiveDataFromCrypto", func() {
		It("modifies secret object with private data redacted", func() {
			common.RemoveSensitiveDataFromCrypto(secret)
			Expect(secret.Enrollment.Component.EnrollSecret).To(Equal("redacted"))
			Expect(secret.Enrollment.Component.EnrollID).To(Equal("test"))
			Expect(secret.Enrollment.TLS.EnrollSecret).To(Equal("redacted"))
			Expect(secret.Enrollment.TLS.EnrollID).To(Equal("test"))
			Expect(secret.MSP.Component.KeyStore).To(Equal("redacted"))
			Expect(secret.MSP.Component.SignCerts).To(Equal(testCert1))
			Expect(secret.MSP.Component.CACerts).To(ContainElement(testCert2))
			Expect(secret.MSP.TLS.KeyStore).To(Equal("redacted"))
			Expect(secret.MSP.TLS.SignCerts).To(Equal(testCert1))
			Expect(secret.MSP.TLS.CACerts).To(ContainElement(testCert2))
		})
	})

})
