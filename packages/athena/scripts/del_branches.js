//------------------------------------------------------------
// del_branches.js - remove ALL local branches, except some...
//
// Copyright (c) 2017 IBM Corp.
// All rights reserved.
//------------------------------------------------------------

const async = require('async');
const winston = require('winston');
const exec = require('child_process').exec;
const logger = new (winston.Logger)({
	level: 'debug',
	transports: [
		new (winston.transports.Console)({ colorize: true })
	]
});
const keep_branches = ['active', 'dev', 'master', 'master_v2', 'staging', 'production', 'prod', 'test', 'openshift', 'saas', 'rip-ca-lib'];	// case insensitive
const removed_branches = [];

//-------------------------
// Get local branches and then delete them
//-------------------------
get_branches(function (e, branches) {
	logger.info('Branches:', branches.length);

	async.eachLimit(branches, 1, function (branch, cb_processed) {			// can only do 1 at a time...
		if (keep_branches.includes(branch.toLowerCase())) {
			logger.info('[delete branches] skipping branch', branch);
			cb_processed();
		} else {
			delete_branch(branch, function (e) {
				cb_processed();
			});
		}
	}, function () {
		logger.info('Delete', removed_branches.length, 'branches');
	});
});

// Get git branches
function get_branches(cb) {
	let branches = [];
	exec('git branch', function (error, stdout, stderr) {
		if (error !== null) {
			logger.error('[delete branches] could not get branches');
			console.log(error, stdout, stderr);
		} else {
			logger.info('[delete branches] Got branches');	// success
			const temp = stdout.split('\n');
			for (let i in temp) {
				const name = temp[i].trim();
				if (name && !name.includes('* ')) {			// can't delete the branch we are currently in
					branches.push(name);
				}
			}
		}
		cb(error, branches);
	});
}

// delete a branch
function delete_branch(branch, cb) {
	exec('git branch -D ' + branch, function (error, stdout, stderr) {
		if (error !== null) {
			logger.warn('could not delete the branch', branch);
			console.log(error);
			cb(error, null);
		} else {
			logger.debug('deleted the local branch', branch);
			removed_branches.push(branch);
			cb(null);
		}
	});
}
