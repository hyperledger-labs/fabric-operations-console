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
import { find_role } from './proto_handlers/policy_pb_lib';

// exports
export { convertPolicy2PeerCliSyntax, policyIsMet };

// -------------------------------------------------
// convert Fabric signature policy structure to Peer CLI syntax
// -------------------------------------------------
function convertPolicy2PeerCliSyntax(input: MixedPolicySyntax) {
	if (!input || !input.rule) {
		logger.error('[stitch] cannot parse signature policy - missing "rule" field', input);
		return null;
	} if (!Array.isArray(input.identities)) {
		logger.error('[stitch] cannot parse signature policy - missing or invalid "identities" array', input);
		return null;
	} else {
		logger.debug('[stitch] starting to build peer cli syntax from policy:', input);
		try {
			input = JSON.parse(JSON.stringify(input));
			input = underscores_2_camelCase(input, null);					// convert underscores to camelCase if needed
			return build_policy_from_rule(input.rule, 0);					// all done
		} catch (e) {
			logger.error('[stitch] cannot parse signature policy', e);
			return null;
		}
	}

	// -------------------------------------------------
	// build the msp string - "{$mspIdentifier}.{$role}"
	// -------------------------------------------------
	function build_msp_str(pos: number) {
		if (!input.identities[pos] || !input.identities[pos].principal || !input.identities[pos].principal) {
			logger.error('[stitch] [1] cannot find "mspIdentifier" or "role" in identities array at pos:', pos, input);
			throw Error(' [1] cannot find "mspIdentifier" or "role" in identities array at pos: ' + pos);
		} else {
			const role = (typeof input.identities[pos].principal.role === 'string') ?
				input.identities[pos].principal.role.toUpperCase() : find_role(input.identities[pos].principal.role);	// if role is still enum, convert w/map
			return '\'' + input.identities[pos].principal.mspIdentifier + '.' + role + '\'';
		}
	}

	// -------------------------------------------------
	// recursively build the peer cli syntax from the policy rule - throws errors!
	// -------------------------------------------------
	function build_policy_from_rule(rule: any, depth: number): any {
		if (depth >= 1000) {													// watch dog, make sure we don't end up looping forever
			logger.error('[stitch] cannot build policy, too deep', depth);
			throw Error('cannot build policy, too deep');
		}
		let policy_str = '';
		const _AND = 'AND';
		const _OR = 'OR';
		const _OUTOF = 'OutOf';

		if (!rule.nOutOf) {
			logger.error('[stitch] cannot build policy, missing "nOutOf" field at depth:', depth, input);
			throw Error('cannot build policy, missing "nOutOf" field at depth: ' + depth);
		} else if (!Array.isArray(rule.nOutOf.rules)) {
			logger.error('[stitch] cannot build policy, missing or invalid "rules" array at depth:', depth, input);
			throw Error('cannot build policy, missing or invalid "rules" array at depth: ' + depth);
		} else if (isNaN(rule.nOutOf.n)) {
			logger.error('[stitch] cannot build policy, missing or invalid "n" field at depth:', depth, input);
			throw Error('cannot build policy, missing or invalid "n" field at depth: ' + depth);
		} else {

			// --- Open the command --- //
			if (rule.nOutOf.n === rule.nOutOf.rules.length) {
				policy_str += _AND + '(';
			} else if (rule.nOutOf.n === 1) {
				policy_str += _OR + '(';
			} else {
				policy_str += _OUTOF + '(' + rule.nOutOf.n + ', ';
			}

			// --- Add each identity --- //
			for (let i in rule.nOutOf.rules) {
				if (!isNaN(rule.nOutOf.rules[i].signedBy)) {									// if its a number, build this msp string
					policy_str += build_msp_str(rule.nOutOf.rules[i].signedBy) + ', ';
				} else {																		// if its a nested rule, recurse
					policy_str += build_policy_from_rule(rule.nOutOf.rules[i], ++depth) + ', ';
				}
			}
			if (policy_str[policy_str.length - 2] === ',') {
				policy_str = policy_str.substring(0, policy_str.length - 2);					// remove trailing comma
			}

			// --- Close the command --- //
			policy_str += ')';
		}

		return policy_str;			// all done
	}
}

// -------------------------------------------------
// test if this policy has enough approvals (input should be a fabric policy structure as JSON)
// -------------------------------------------------
function policyIsMet(input: MixedPolicySyntax, approvals: StringObj, use_default_roles: boolean | null) {
	if (!input || !input.rule) {
		logger.error('[stitch] cannot parse signature policy - missing "rule" field', input);
		return null;
	} if (!Array.isArray(input.identities)) {
		logger.error('[stitch] cannot parse signature policy - missing or invalid "identities" array', input);
		return null;
	} else {
		logger.debug('[stitch] starting to test policy for readiness:', input, approvals);
		try {
			input = underscores_2_camelCase(input, null);					// convert underscores to camelCase if needed
			approvals = format_approvals(approvals);
			logger.debug('[stitch] formatted approvals:', approvals);
			return test_rule_readiness(input.rule, 0);						// all done
		} catch (e) {
			// error already logged
			return null;
		}
	}

	// -------------------------------------------------
	// format **approval** roles - bring to uppercase, create copies as needed
	// -------------------------------------------------
	function format_approvals(obj: StringObj) {
		const ret: StringObj = {};
		const PEER_ROLE = 'PEER';
		const MEMBER_ROLE = 'MEMBER';
		const ADMIN_ROLE = 'ADMIN';

		for (let oldKey in obj) {
			const parts = oldKey.split('.');
			let newKey = '';
			if (!parts || parts.length <= 1) {
				logger.debug('[stitch] "role" was not provided in approval key, will default to "' + PEER_ROLE + '"', oldKey, obj);
				newKey = oldKey + '.' + PEER_ROLE;									// default to the PEER role
				ret[newKey] = obj[oldKey];
			} else {
				parts[parts.length - 1] = parts[parts.length - 1].toUpperCase();	// the "role" should be last, make it uppercase
				newKey = parts.join('.');
				ret[newKey] = obj[oldKey];
			}

			if (newKey && newKey.includes('.' + PEER_ROLE)) {						// the MEMBER role is satisfied with a PEER role.
				const newKey2 = oldKey + '.' + MEMBER_ROLE;							// so if a peer has signed the role "member" is also met
				ret[newKey2] = obj[oldKey];											// copy approval state for easier approval lookup later
			}

			if (newKey && newKey.includes('.' + ADMIN_ROLE)) {						// the MEMBER role is satisfied with a ADMIN role.
				const newKey2 = oldKey + '.' + MEMBER_ROLE;							// so if a admin has signed the role "member" is also met
				ret[newKey2] = obj[oldKey];											// copy approval state for easier approval lookup later
			}
		}
		return ret;
	}

	// -------------------------------------------------
	// return true if this identity has approved
	// -------------------------------------------------
	function has_approved(pos: number) {
		if (!input.identities[pos] || !input.identities[pos].principal || !input.identities[pos].principal || !input.identities[pos].principal.role) {
			logger.error('[stitch] [2] cannot find "mspIdentifier" or "role" in identities array at pos:', pos, input);
			throw Error('[2] cannot find "mspIdentifier" or "role" in identities array at pos: ' + pos);
		} else {
			const mspIdentifier = input.identities[pos].principal.mspIdentifier;
			const role = input.identities[pos].principal.role.toUpperCase();
			const key = mspIdentifier + '.' + role;
			if (approvals[key] === true) {
				return true;
			} else {
				return false;
			}
		}
	}

	// -------------------------------------------------
	// test if this rule has enough approvals - recursive!
	// -------------------------------------------------
	function test_rule_readiness(rule: any, depth: number): any {
		if (depth >= 1000) {													// watch dog, make sure we don't end up looping forever
			logger.error('[stitch] cannot test policy, too deep', depth);
			throw Error('cannot test policy, too deep');
		}
		let this_rule_passes = false;
		const orig_depth = depth;

		if (!rule.nOutOf) {
			logger.error('[stitch] cannot parse policy, missing "nOutOf" field at depth:', depth, input);
			throw Error('cannot parse policy, missing "nOutOf" field at depth: ' + depth);
		} else if (!Array.isArray(rule.nOutOf.rules)) {
			logger.error('[stitch] cannot parse policy, missing or invalid "rules" array at depth:', depth, input);
			throw Error('cannot parse policy, missing or invalid "rules" array at depth: ' + depth);
		} else if (isNaN(rule.nOutOf.n)) {
			logger.error('[stitch] cannot parse policy, missing or invalid "n" field at depth:', depth, input);
			throw Error('cannot parse policy, missing or invalid "n" field at depth: ' + depth);
		} else {
			let approvals_at_rule = 0;

			// --- eval each rule, look for nested rules --- //
			for (let i in rule.nOutOf.rules) {
				if (!isNaN(rule.nOutOf.rules[i].signedBy)) {		// if its a number, check if org has approved
					approvals_at_rule += has_approved(rule.nOutOf.rules[i].signedBy) ? 1 : 0;
				} else {											// if its a nested rule, recurse
					approvals_at_rule += test_rule_readiness(rule.nOutOf.rules[i], ++depth) ? 1 : 0;
				}
			}

			logger.debug('[stitch[ policy readiness: at rule', orig_depth, 'have', approvals_at_rule, 'approvals, need', rule.nOutOf.n);
			if (approvals_at_rule >= rule.nOutOf.n) {
				this_rule_passes = true;
			}
		}

		return this_rule_passes;			// all done
	}
}

interface StringObj {
	[index: string]: boolean;
}
