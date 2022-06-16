/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

// Libs built by us
import { logger, underscores_2_camelCase } from './misc';
import { MixedPolicySyntax } from './proto_handlers/collection_pb_lib';

// exports
export { conformPolicySyntax, detectImplicitPolicy, buildImplicitPolicySyntax, detectSignaturePolicy };

// -------------------------------------------------
// build Fabric's signature policy structure from some other syntax - returns object
// supported syntax:
// 	- Peer CLI syntax (example below)
// 	- Fabric SDK syntax (example below)
//	- Fabric structure - (example below), this is just a pass through, since its already in the right format
//	- see docs/sig_policy_syntax.md for more information and examples
/*
----------------
[PEER-CLI-SYNTAX] - nested logic is supported (supported logic commands: "AND", "OR", "OutOf" ) [case does not matter]
----------------
	input = "AND('Org1.member', 'Org2.member')"

	see peer cli docs for more examples: https://hyperledgendary.github.io/unstable-fabric-docs/endorsement-policies.html
*/
/*
----------------
[SDK-SYNTAX] - nested policies are supported (each entry in policy is either a "<number>-of" or "signed-by" object)
----------------

	input = {
		version: 0,						// [optional] - defaults 0
		identities: [					// put all identities that will have the ability to sign here, 1 for each
			{							// first identity that could sign
				role: {
					name: 'member',		// should match roles in channel, typically 'member' or 'admin'
					mspId: 'PeerOrg1'
				}
			},
			{							// second identity that could sign
				role: {
					name: 'member',		// should match roles in channel, typically 'member' or 'admin'
					mspId: 'PeerOrg2'
				}
			}
		],
		policy: {
			"<number>-of" : [			// <number> is the amount of signatures to get. eg "2-of" for 2 signatures
				{ 'signed-by': 0 },		// this is the array position of the identity in "identities" that can sign
				{ 'signed-by': 1 },		// this is the array position of the identity in "identities" that can sign
			]
		}
	}

	see fabric-sdk-node docs for more details: https://hyperledger.github.io/fabric-sdk-node/release-1.4/global.html#ChaincodeInstantiateUpgradeRequest
*/
/*
----------------
[FABRIC-SYNTAX] - nested rules are supported (each entry in "rules" is either a "nOutOf" or "signedBy" object)
----------------
	input = {
			version: 0,										// [optional] - defaults 0
			identities: [{
				principalClassification: 'ROLE'
				principal: {
					mspIdentifier: 'PeerOrg1',
					role: 'MEMBER'							// not case sensitive
				},
			},{
				principalClassification: 'ROLE'
				principal: {
					mspIdentifier: 'PeerOrg2',
					role: 'MEMBER'							// not case sensitive
				}
			}],
			rule: {
				nOutOf: {
					n: 2,
					rules: [{
						signedBy: 0
					},
					{
						signedBy: 1
					}]
				}
			}
		}
*/
// -------------------------------------------------
function conformPolicySyntax(input: string | MixedPolicySyntax) {
	const policy_obj: { version: number, identities: any, rule: any } = {
		identities: [],
		rule: {},
		version: 0,
	};
	const identityPositionMap: any = {};
	const break_words_regexp = new RegExp(/'|,|\(|\)|[a-zA-Z\d-.]+/, 'g');			// breaks up signature policy string into single words
	let onCmd = '';

	// ---- Peer CLI Syntax ----- //
	if (typeof input === 'string') {												// peer cli syntax is a simple string
		const msps = cli_syntax_find_msp_ids(input);
		logger.debug('[stitch] detected peer cli syntax - found msps in policy:', msps, identityPositionMap);
		for (let i in msps) {
			policy_obj.identities.push({											// first build the identities list
				principal: {
					mspIdentifier: msps[i].mspId,
					role: msps[i].role.toUpperCase()
				},
				principalClassification: 'ROLE',									// use principal_classification of 0="ROLE", b/c atm we only use "ROLE" classification
			});
		}
		policy_obj.rule = wrap_build_rules_from_cli();								// second build the rule list
	}

	// ---- Fabric Syntax ----- //
	else if (input.identities && input.rule) {
		logger.debug('[stitch] detected fabric syntax - found msps in policy:', input.identities);
		policy_obj.version = input.version || policy_obj.version;
		policy_obj.identities = underscores_2_camelCase(input.identities, null);
		policy_obj.rule = underscores_2_camelCase(input.rule, null);
	}

	// ---- Fabric SDK Syntax ----- //
	else if (input.identities && input.policy) {
		logger.debug('[stitch] detected fabric-sdk syntax - found msps in policy:', input.identities);
		policy_obj.version = input.version || policy_obj.version;
		policy_obj.identities = fmt_sdk_identities(underscores_2_camelCase(input.identities, null));
		policy_obj.rule = fmt_sdk_rule(input.policy, 0);
	}

	// ---- Unknown Syntax ----- //
	else {
		logger.error('[stitch] unknown signature policy syntax - unable to build protobuf');
		policy_obj.identities = null;
		policy_obj.rule = null;
	}

	// all done
	if (!policy_obj.rule || !policy_obj.identities) {
		// error already logged
		return null;
	} else {
		logger.info('[stitch] built signature policy object using Fabric syntax:', JSON.stringify(policy_obj, null, 2));
		return policy_obj;
	}

	// find all msp ids in signature policy and build a map (expecting peer cli syntax)
	function cli_syntax_find_msp_ids(str: string) {
		let msps: string[] = [];
		msps = str.match(/['"]?[a-zA-Z\d-.]+['"]?/g) || [];
		const ret = [];

		for (let i in msps) {
			const msp = msps[i].replace(/^['"]/, '').replace(/['"]$/, '');			// remove quotes
			const pos = msp.lastIndexOf('.');
			if (msp && pos >= 0) {
				if (typeof identityPositionMap[msp] === 'undefined') {				// only add if we haven't seen it yet
					ret.push({
						mspId: msp.substring(0, pos),
						role: msp.substring(pos + 1),
					});
					identityPositionMap[msp] = ret.length - 1;
				}
			}
		}
		return ret;
	}

	// -------------------------------------------------
	// catch all errors and return null if a problem happened
	// -------------------------------------------------
	function wrap_build_rules_from_cli(): any {
		try {
			if (typeof input === 'string') {
				const words = input.match(break_words_regexp) || [];
				return build_rules_from_cli(input, words, null, 0);
			}
		} catch (e) {
			// already logged
			return null;
		}
	}

	// -------------------------------------------------
	// recursively build the rules from the peer cli syntax of a signature policy - throws errors!
	// -------------------------------------------------
	function build_rules_from_cli(str: string, words: string[], ruleObj: any, depth: number): any {
		if (depth >= 1000) {													// watch dog, make sure we don't end up looping forever
			logger.error('[stitch] cannot build policy, too deep', depth);
			throw Error('cannot parse policy, too deep');
		}
		if (!words || words.length === 0) {										// check if we are at the end
			logger.debug('[stitch] a single rule is done, no more words to check', ruleObj, depth);
			return ruleObj;
		}

		const _AND = 'AND';
		const _OR = 'OR';
		const _OUTOF = 'OUTOF';
		const skippable_chars = `()'",`;										// list of single characters that can be skipped
		const uc_logic_commands = [_AND, _OR, _OUTOF];							// list of valid commands for the signature policy, uppercase
		let sc_words: string[] = [];

		// this function works by checking each word 1 by 1.
		// the signature policy string was broken up into single words.
		// this function takes that list and  walks it.
		// each word is either a logic-command, junk-character, n-number or msp descriptor.
		let onWord = words[0];
		const ucOnWord = onWord.toUpperCase();

		// ---- Logic Word ---- //
		// @ts-ignore
		if (uc_logic_commands.includes(ucOnWord)) {								// found a logic statement
			onCmd = ucOnWord;
			return parse_logic_cmd();
		}

		// ---- Skip Character ---- //
		else if (onWord.length === 1 && skippable_chars.includes(onWord)) {		// these characters are meaningless here
			logger.debug('[stitch] on skippable word: "' + onWord + '"');
			return build_rules_from_cli(str, words.slice(1), ruleObj, ++depth);
		}

		// ---- N Number Word ---- // (OutOf will have a integer parameter)
		else if (Number.isInteger(Number(onWord))) {
			if (onCmd !== _OUTOF) {
				logger.error('[stich] parsing error. unexpected range for command:', onCmd, 'range:', onWord);
				throw Error('invalid policy');
			} else {
				logger.debug('[stitch] on a n number word, skipping: "' + onWord + '"');
				return build_rules_from_cli(str, words.slice(1), ruleObj, ++depth);
			}
		}

		// ---- Probably a MSP Word ---- //
		logger.debug('[stitch] on suspected msp word:', onWord);
		if (!ruleObj.nOutOf.rules) { ruleObj.nOutOf.rules = []; }
		let msp = onWord;
		if (msp && typeof identityPositionMap[msp] !== 'undefined') {			// if its in the map, its definitely a msp word
			ruleObj.nOutOf.rules.push({ signedBy: identityPositionMap[msp] });	// the value of signedBy its the array position of this msp
			logger.debug('[stitch] added msp to inner ruleObj:', JSON.stringify(ruleObj, null, 2));
			return build_rules_from_cli(str, words.slice(1), ruleObj, ++depth);
		}

		// ---- Unknown Word ---- //
		else {
			logger.error('[stich] parsing error. msp is unknown which is impossible. maybe unknown command.', msp);
			throw Error('invalid policy');
		}

		// all done
		return null;

		// -------------------------------------------------
		// parse the logic command like AND(), OR(), OUTOF()
		// -------------------------------------------------
		function parse_logic_cmd() {
			logger.debug('[stitch] on logic command word:', ucOnWord);
			logger.debug('[stitch] orig words:', words);

			// find the end of this condition
			const parsed = getCondition(words.join(''));
			if (!parsed) {
				logger.error('[stich] unable to parse sig policy for a single condition. missing parentheses?', parsed);
				throw Error('invalid policy');
			} else {
				logger.debug('[stitch] parsed logic condition:', parsed);
				const single_condition = parsed.condition;
				sc_words = single_condition.match(break_words_regexp) || [];
				logger.debug('[stitch] parsed words', sc_words);
			}

			// build rules for THIS command
			const ruleObjInner = {
				nOutOf: {
					n: 99,															// set later, n is the number of rules that must be met
					rules: [],														// rules can contain a signedBy object or a recursive nOutOf object
				}
			};
			build_rules_from_cli(str, sc_words.slice(1), ruleObjInner, ++depth);	// go build the rules for this command
			ruleObjInner.nOutOf.n = setN(ucOnWord, words, ruleObjInner);			// now that the rules are built, set the n value

			// check the n value
			if (ucOnWord === _OUTOF) {
				if (ruleObjInner.nOutOf.n > ruleObjInner.nOutOf.rules.length) {
					logger.error('[stich] invalid value for "OutOf". requires ' + ruleObjInner.nOutOf.n +
						' rules to be met but there are only ' + ruleObjInner.nOutOf.rules.length + 'rules');
					throw Error('invalid value for "OutOf" [1]');
				}
				if (!Number.isInteger(ruleObjInner.nOutOf.n)) {
					logger.error('[stich] invalid value for "OutOf". must be an integer');
					throw Error('invalid value for "OutOf" [2]');
				}
			}

			// add rules to PREV command or if this is the fist, init the rule object
			if (!ruleObj) {
				ruleObj = ruleObjInner;												// ths is the very first rule in the outer most command
			} else {
				ruleObj.nOutOf.rules.push(ruleObjInner);							// add rules to PREV command
			}
			logger.debug('[stitch] finished inner ruleObj:', JSON.stringify(ruleObj, null, 2), parsed ? parsed.resume : null);

			// see if we need to resume a past command, else we are done and can return this rule object
			if (parsed && parsed.resume) {
				const resume_words = parsed.resume.match(break_words_regexp) || [];
				return build_rules_from_cli(str, resume_words.slice(1), ruleObj, ++depth);
			} else {
				return ruleObj;
			}
		}

		// -------------------------------------------------
		// set N if we can
		// -------------------------------------------------
		function setN(uc_logic: string, policy_words: string[], rules_obj: any) {
			if (uc_logic === _OR) {
				return 1;									// OR's need only 1 rule met, n=1
			}
			if (uc_logic === _AND) {
				if (!rules_obj || !rules_obj.nOutOf || !rules_obj.nOutOf.rules) {
					logger.error('[stich] invalid policy. cannot set n for "AND" bc the rules are missing.', rules_obj);
					throw Error('invalid policy for "AND" [1]');
				}
				return rules_obj.nOutOf.rules.length;		// AND's must have all rules met, n=length of rules
			}
			if (uc_logic === _OUTOF) {
				return Number(policy_words[2]);				// OutOf's n is in input, 3rd word -> [0]='OutOf', [1]='(', [2]=n
			}
			return null;
		}

		// -------------------------------------------------
		// filter the string to a single logical condition
		// -------------------------------------------------
		function getCondition(cStr: string) {
			let open = 0;
			for (let i in <any>cStr) {
				if (cStr[Number(i)] === '(') {
					if (open === 0 && Number(i) > 5) {		// the first open parentheses should be near the beginning, else its missing, error out
						return null;
					}
					open++;									// record open parentheses
				}
				if (cStr[<any>i] === ')') {
					open--;									// record closed parentheses
					if (open === 0) {						// once the parentheses are balanced we found the end, we are done
						return {
							condition: cStr.substring(0, Number(i) + 1),	// this is the complete string to look a single logic command
							resume: cStr.substring(Number(i) + 1),			// if there are more arguments, we will resume w/this string
						};
					}
				}
			}
			return null;
		}
	}

	// -------------------------------------------------
	// [SDK] format identities using fabric-sdk syntax to fabric syntax
	// -------------------------------------------------
	function fmt_sdk_identities(identities: [{ role: { mspId: string, name: string } }]) {
		const ret = [];
		for (let i in identities) {
			if (!identities[i].role || !identities[i].role.mspId || !identities[i].role.name) {
				logger.error('[stitch] cannot build policy b/c missing "mspId" or "name" in identities position:', i);
				policy_obj.identities = null;
				break;
			} else {
				ret.push({
					principal: {
						mspIdentifier: identities[i].role.mspId,
						role: identities[i].role.name.toUpperCase()
					},
					principalClassification: 'ROLE',				// use principal_classification of 0="ROLE", b/c atm we only use "ROLE" classification
				});
			}
		}
		return ret;
	}

	// -------------------------------------------------
	// [SDK] format rules using fabric-sdk syntax to fabric syntax
	// -------------------------------------------------
	function fmt_sdk_rule(policy: any, depth: number) {
		if (depth >= 1000) {
			logger.error('[stitch] sdk-policy-syntax - policy is too deeply nested or might be circular? aborting', depth);
			return null;
		} else if (!policy || Object.keys(policy).length === 0) {
			return null;																	// sub policy does not exist - this is okay
		}

		// "signed-by" type of policy
		if (policy['signed-by'] >= 0) {
			return { signedBy: policy['signed-by'] };										// return mostly as is, use camelCase
		}

		// "n-of" type of policy
		else {
			const policy_name = Object.keys(policy)[0];
			const matches = policy_name.match(/^(\d+)\-of/);								// parse "<number>-of" and get <number> out
			const signature_number = (matches && matches[1]) ? Number(matches[1]) : 1;		// make it a number

			const subPolicies = [];
			for (let i in policy[policy_name]) {											// build each sub policy
				const sub_policy: any = fmt_sdk_rule(policy[policy_name][i], ++depth);		// recursive!
				if (sub_policy) {
					subPolicies.push(sub_policy);
				}
			}

			return {																		// return using fabric's syntax
				nOutOf: {
					n: signature_number,
					rules: subPolicies
				}
			};
		}
	}
}

// -------------------------------------------------
// see if the policy is a signature policy (any syntax)
// -------------------------------------------------
function detectSignaturePolicy(policy: string | { identities: [], rule: object, policy: object }) {

	// ---- Peer CLI Syntax ----- //
	if (typeof policy === 'string') {
		const fmt = policy.trim().toUpperCase();				// clean up
		if (fmt.indexOf('AND') === 0) {
			return true;
		}
		if (fmt.indexOf('OR') === 0) {
			return true;
		}
		if (fmt.indexOf('OUTOF') === 0) {
			return true;
		}
	}

	if (policy && typeof policy === 'object') {
		// ---- Fabric Syntax ----- //
		if (Array.isArray(policy.identities) && policy.rule && typeof policy.rule === 'object') {
			return true;
		}

		// ---- Fabric SDK Syntax ----- //
		if (Array.isArray(policy.identities) && policy.policy && typeof policy.policy === 'object') {
			return true;
		}
	}

	return false;
}

// -------------------------------------------------
// see if the policy is a implicit policy
// -------------------------------------------------
function detectImplicitPolicy(policy: string) {
	if (typeof policy === 'string') {
		const fmt = policy.trim();						// clean up
		if (fmt.indexOf('ANY') === 0) {
			return true;
		}
		if (fmt.indexOf('MAJORITY') === 0) {
			return true;
		}
		if (fmt.indexOf('ALL') === 0) {
			return true;
		}
	}
	return false;
}

// -------------------------------------------------
// build a implicit policy
// -------------------------------------------------
// There are two types of policies.
//  - Type 2 - ImplicitMetaPolicy - has 3 sub types: (these types are defined by pb "ImplicitMetaPolicy")
//    - Rule 0 means ANY signature will pas
//    - Rule 1 means ALL signatures needed to pass
//    - Rule 2 means MAJORITY of signatures need to pass
function buildImplicitPolicySyntax(policy: string) {
	let ret = {
		type: 3,
		value: {
			rule: 'MAJORITY',
			sub_policy: 'Admins'
		}
	};
	if (typeof policy === 'string') {
		policy = policy.trim();						// clean up
		const parts = policy.split(' ');
		if (parts.length >= 2) {
			ret.value.rule = parts[0];
			ret.value.sub_policy = parts[1];
		}
	}
	return ret;
}
