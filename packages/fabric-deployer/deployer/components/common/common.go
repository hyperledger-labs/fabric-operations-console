package common

import (
	current "github.com/IBM-Blockchain/fabric-operator/api/v1beta1"
)

func AdminCertsFromConfig(secretSpec *current.SecretSpec) []string {
	if secretSpec != nil && secretSpec.MSP != nil {
		if secretSpec.MSP.Component != nil && secretSpec.MSP.Component.AdminCerts != nil {
			return secretSpec.MSP.Component.AdminCerts
		}
	} else if secretSpec != nil && secretSpec.Enrollment != nil {
		if secretSpec.Enrollment.Component != nil && secretSpec.Enrollment.Component.AdminCerts != nil {
			return secretSpec.Enrollment.Component.AdminCerts
		}
	}

	return nil
}

func RemoveSensitiveDataFromCrypto(secretSpec *current.SecretSpec) {
	if secretSpec != nil && secretSpec.MSP != nil {
		if secretSpec.MSP.Component != nil {
			secretSpec.MSP.Component.KeyStore = "redacted"
		}
		if secretSpec.MSP.TLS != nil {
			secretSpec.MSP.TLS.KeyStore = "redacted"
		}
		if secretSpec.MSP.ClientAuth != nil {
			secretSpec.MSP.ClientAuth.KeyStore = "redacted"
		}
	}

	if secretSpec != nil && secretSpec.Enrollment != nil {
		if secretSpec.Enrollment.Component != nil {
			secretSpec.Enrollment.Component.EnrollSecret = "redacted"
		}
		if secretSpec.Enrollment.TLS != nil {
			secretSpec.Enrollment.TLS.EnrollSecret = "redacted"
		}
		if secretSpec.Enrollment.ClientAuth != nil {
			secretSpec.Enrollment.ClientAuth.EnrollSecret = "redacted"
		}
	}
}
