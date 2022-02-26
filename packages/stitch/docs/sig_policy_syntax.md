# Signature Policy Syntax Support

Stitch supports 3 formats that describe a signature policy.
These formats were created by other Fabric tools and have been added to Stitch.
Check a format with the [conformPolicySyntax](./README.md#conformPolicySyntax) Stitch method.

Signature policies are used for a handful of Fabric controls:
- control which orgs must endorse chaincode proposals
- control which orgs must endorse private data changes
- control which orgs must endorse channel config changes


### 1. Peer CLI Syntax
This is the simplest syntax to write. It was created/offered by the Hyperledger Fabric Peer CLI. Stitch is 100% compatible.
- supported logic commands: `"AND"`, `"OR"`, `"OutOf"` (case does not matter)
- nested logic is supported
- the quotes around `'Org1.member'` can be single or double quotes (single recommended since thats whats in the tests)
- parentheses must be balanced (meaning for every open `(` there must be a closing `)`)
- policies that fail to be parsed will return an error
- for more examples see the [peer cli docs](https://hyperledgendary.github.io/unstable-fabric-docs/endorsement-policies.html)
```js
// ----------------
// [PEER-CLI-SYNTAX]
// ----------------

// [Example A] - Both org members must sign. [(Org1 & Org2)]
let signature_policy = "AND('Org1.member', 'Org2.member')"

// [Example B] - Either org members must sign. [(Org1) || (Org2)]
let signature_policy = "OR('Org1.member', 'Org2.member')"

// [Example C] - Any 2 org members must sign. [(Org1 & Org2) || (Org1 & Org3) || (Org2 & Org3)]
let signature_policy = "OutOf(2, 'Org1.member', 'Org2.member', 'Org3.member')"

// [Example D] - Member from Org1 must always sign and one from Org2 or Org3. [(Org1 & Org2) || (Org1 & Org3)]
let signature_policy = "AND('Org1.member', OR('Org2.member', 'Org3.member'))"
```


### 2. Fabric Syntax
This is the 2nd best syntax to write.
It was created/offered by the Hyperledger Fabric.
This is the actual protobuf message (`common.SignaturePolicyEnvelope`) representation of a policy.
Thus it is identical to the structure that gets committed.
- nested rules are supported (each entry in "rules" is either a "nOutOf" or "signedBy" object)
- policies that fail to be parsed will return an error
- all keys in the object can use camelCase or underscores (ie `"mspIdentifier"` or `"msp_identifier"`)

```js
// ----------------
// [FABRIC-SYNTAX]
// ----------------

// [Example A] - Both org members must sign. [(Org1 & Org2)]
let signature_policy = {

	// number - the format version of this policy (typically set to 0)
	version: 0,

	// array - put all identities that will have the ability to sign here, 1 for each
	identities: [{

		// [optional] always use 0 aka 'ROLE' here (or omit the field completely)
		principalClassification: 'ROLE'

		// object
		principal: {

			// string - msp id of the org - case sensitive
			mspIdentifier: 'Org1',

			// string - what role is valid for this org - not case sensitive
			// (typically 'member', 'peer' or 'admin', "PEER" recommended)
			role: 'PEER'
		},
	},{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org2',
			role: 'PEER'
		}
	}],

	// object - (the outer most rule is "rule" not "rules")
	rule: {

		// object
		nOutOf: {

			// number - the amount of signatures needed
			n: 2,

			// array - individual rules that satisfy this policy (all nested rules are "rules")
			rules: [{

				// number - array position of identity in "identities" that can sign for this rule
				signedBy: 0
			},
			{
				// number - array position of identity in "identities" that can sign for this rule
				signedBy: 1
			}]
		}
	}
}

// [Example B] - Either org members must sign. [(Org1) || (Org2)]
let signature_policy = {
	version: 0,
	identities: [{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org1',
			role: 'PEER'
		},
	},{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org2',
			role: 'PEER'
		}
	}],
	rule: {
		nOutOf: {
			n: 1,
			rules: [
				{ signedBy: 0 },
				{ signedBy: 1 },
			]
		}
	}
}

// [Example C] - Any 2 org members must sign. [(Org1 & Org2) || (Org1 & Org3) || (Org2 & Org3)]
let signature_policy = {
	version: 0,
	identities: [{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org1',
			role: 'PEER'
		},
	},{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org2',
			role: 'PEER'
		}
	},{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org3',
			role: 'PEER'
		}
	}],
	rule: {
		nOutOf: {
			n: 2,
			rules: [
				{ signedBy: 0 },
				{ signedBy: 1 },
				{ signedBy: 2 }
			]
		}
	}
}

// [Example D] - Member from Org1 must always sign and one from Org2 or Org3. [(Org1 & Org2) || (Org1 & Org3)]
let signature_policy = {
	version: 0,
	identities: [{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org1',
			role: 'PEER'
		},
	},{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org2',
			role: 'PEER'
		}
	},{
		principalClassification: 'ROLE'
		principal: {
			mspIdentifier: 'Org3',
			role: 'PEER'
		}
	}],
	rule: {
		nOutOf: {
			n: 2,
			rules: [
				{
					signedBy: 0
				},
				{
					nOutOf: {
						n: 1,
						rules: [
							{ signedBy: 1 },
							{ signedBy: 2 }
						]
					}
				}
			]
		}
	}
}
```


### 3. Node SDK Syntax
This is the worst syntax to write. It was created/offered by the Hyperledger Fabric Node SDK. Stitch is 100% compatible.
- nested policies are supported (each entry in "policy" is either a "[number]-of" or "signed-by" object)
- policies that fail to be parsed will return an error
- all keys in the object can use camelCase or underscores (ie `"mspId"` or `"msp_id"`)
- for more examples see the [fabric-sdk-node docs](https://hyperledger.github.io/fabric-sdk-node/release-1.4/global.html#ChaincodeInstantiateUpgradeRequest)

```js
// ----------------
// [SDK-SYNTAX]
// ----------------

// [Example A] - Both org members must sign. [(Org1 & Org2)]
let signature_policy = {

	// array - put all identities that will have the ability to sign here, 1 for each
	identities: [

		// object - first identity that could sign
		{
			role: {

				// string - what role is valid for this org (typically 'member' or 'admin') - not case sensitive
				name: 'member',

				// string - msp id of the org - case sensitive
				mspId: 'Org1'
			}
		},

		// object - second identity that could sign
		{
			role: {
				name: 'member',
				mspId: 'Org2'
			}
		}
	],
	policy: {

		// array - "<number>-of" is the amount of signatures needed.
		"2-of" : [

			// object - the array position of the identity in "identities" that can sign for this policy
			{ 'signed-by': 0 },

			// object - the array position of the identity in "identities" that can sign for this policy
			{ 'signed-by': 1 },
		]
	}
}

// [Example B] - Either org members must sign. [(Org1) || (Org2)]
let signature_policy = {
	identities: [
		{
			role: {
				name: 'member',
				mspId: 'Org1'
			}
		},
		{
			role: {
				name: 'member',
				mspId: 'Org2'
			}
		}
	],
	policy: {
		"1-of" : [
			{ 'signed-by': 0 },
			{ 'signed-by': 1 },
		]
	}
}

// [Example C] - Any 2 org members must sign. [(Org1 & Org2) || (Org1 & Org3) || (Org2 & Org3)]
let signature_policy = {
	identities: [
		{
			role: {
				name: 'member',
				mspId: 'Org1'
			}
		},
		{
			role: {
				name: 'member',
				mspId: 'Org2'
			}
		},
		{
			role: {
				name: 'member',
				mspId: 'Org3'
			}
		}
	],
	policy: {
		"2-of" : [
			{ 'signed-by': 0 },
			{ 'signed-by': 1 },
			{ 'signed-by': 2 },
		]
	}
}

// [Example D] - Member from Org1 must always sign and one from Org2 or Org3. [(Org1 & Org2) || (Org1 & Org3)]
let signature_policy = {
	identities: [
		{
			role: {
				name: 'member',
				mspId: 'Org1'
			}
		},
		{
			role: {
				name: 'member',
				mspId: 'Org2'
			}
		},
		{
			role: {
				name: 'member',
				mspId: 'Org3'
			}
		}
	],
	policy: {
		"2-of" : [
			{ 'signed-by': 0 },
			"1-of" : [
				{ 'signed-by': 1 },
				{ 'signed-by': 2 },
			]
		]
	}
}
```
