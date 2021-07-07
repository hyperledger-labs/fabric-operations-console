/*
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
*///------------------------------------------------------------
// compare_comp_reports.js
//
// Compare athena's report with deployer reports to find orphaned components
//
// report format:
/*
	{
		"summary":{
			siids_in_athena_not_in_deployer: 0,
			siids_in_deployer_not_in_athena: 0,
			siids_in_athena_and_in_deployer: 0,

			comps_in_athena_not_in_deployer(under-charging): 0,			// (this would lead to under charging a client)
			comps_in_deployer_not_in_athena(over-charging): 0,			// (this would lead to over charging a client)
			comps_in_athena_and_in_deployer(correct): 0,				// correct
		},
		"<region-here>": {

			// service instance ids that were found in both athena and deployer
			"siid_comp_errs":{

				"<siid-here>":{

					// components that athena knows about but deployer doesn't
					// (this would lead to under charging a client)
					"missing_comps_in_deployer": [
						"<deployer-component-id>",
					],

					// components that deployer knows about but athena doesn't
					// (this would lead to over charging a client)
					"missing_comps_in_athena": [
						"<deployer-component-id>",
					]
				}
			},

			// service instance ids that were in athena but not deployer
			"siids_missing_in_deployer": [],

			// service instance ids that was in deployer but not athena
			"siids_missing_in_athena": [],
		}
	}
*/
//
// > node compare_comp_reports.js
//------------------------------------------------------------

// --- Report --- //
const report = {
	summary: {
		siids_in_athena_not_in_deployer: 0,
		siids_in_deployer_not_in_athena: 0,
		siids_in_athena_and_in_deployer: 0,
		'comps_in_athena_not_in_deployer(under-charging)': 0,
		'comps_in_deployer_not_in_athena(over-charging)': 0,
		'comps_in_athena_and_in_deployer(correct)': 0,
	},
};

// things we might need
const tools = {
	url: require('url'),
	fs: require('fs'),
	path: require('path'),
	async: require('async'),
	request: require('request'),
	crypto: require('crypto'),
	winston: require('winston'),
};

// File names
const athena_report_name = './reports/athena_components.2020.12.09~1532.json';
const ages_file_name = tools.path.join(__dirname, './reports/reports_compared.ages.json');
const dep_file_names = {
	prod_ap_north: './reports/dep/apnorth.json',
	prod_ap_south: './reports/dep/apsouth.json',
	prod_eu_central: './reports/dep/eucentral.json',
	prod_uk_south: './reports/dep/uksouth.json',
	prod_us_east: './reports/dep/useast.json',
	prod_us_south: './reports/dep/ussouth.json',
};
const report_file_name = tools.path.join(__dirname, './reports/reports_compared.json');
const dates_file_name = tools.path.join(__dirname, './reports/athena_components.2020.12.09~2134.dates.json');


// make a graph of the data
const buckets = {};
for (let i = 0; i <= 52 * 2; i++) {
	const key = 'weeks_old_' + pad(i);
	buckets[key] = '';
}

// load all files
const athena_report = JSON.parse(tools.fs.readFileSync(athena_report_name));
const dep_reports = {};
for (let key in dep_file_names) {
	dep_reports[key] = JSON.parse(tools.fs.readFileSync(dep_file_names[key]));
}
const dates_report = JSON.parse(tools.fs.readFileSync(dates_file_name));

console.log('load complete', Object.keys(dep_reports));
parse_athena_report();
parse_deployer_reports();
only_comp_errors_in_report(report);
tools.fs.writeFileSync(report_file_name, JSON.stringify(report, null, '\t'));
tools.fs.writeFileSync(ages_file_name, JSON.stringify(buckets, null, '\t'));
console.info('fin.');

// iter over the athena report...
function parse_athena_report() {
	for (let region in athena_report) {
		console.log('working athena region', region);
		for (let siid in athena_report[region]) {

			if (!report[region]) {												// init region
				report[region] = {
					siid_comp_errs: {},
					siids_missing_in_deployer: [],
					siids_missing_in_athena: [],
				};
			}
			if (!report[region].siid_comp_errs[siid]) {								// init siid
				report[region].siid_comp_errs[siid] = {};
			}

			const deployers_siid_part = find_siid_in_dep_region(region, siid);	// find the siid
			if (!deployers_siid_part) {
				//console.error('siid is missing in deployer', region, siid);
				report[region].siids_missing_in_deployer.push(siid);			// siid not found, record it
				report.summary.siids_in_athena_not_in_deployer++;
			} else {
				report.summary.siids_in_athena_and_in_deployer++;

				for (let i in athena_report[region][siid]) {					// iter on components in the siid
					const component = athena_report[region][siid][i];
					if (component.imported === false) {							// skip imported ones

						const component_id = athena_report[region][siid][i].name;
						const found_comp = found_component_in_dep_siid(deployers_siid_part, component_id);
						if (!found_comp) {										// comp not found, record it
							console.error('deployer is missing component id', region, siid, component_id);

							if (!report[region].siid_comp_errs[siid].missing_comps_in_deployer) {
								report[region].siid_comp_errs[siid].missing_comps_in_deployer = [];
							}
							report[region].siid_comp_errs[siid].missing_comps_in_deployer.push(component_id);
							report.summary['comps_in_athena_not_in_deployer(under-charging)']++;
						} else {
							report.summary['comps_in_athena_and_in_deployer(correct)']++;
						}
					}
				}
			}
		}
	}
}

// convert '7817211e41ea462fb4b5d9d0ffc04da7' to '7817211e-41ea-462f-b4b5-d9d0ffc04da7
function convert_siid(str) {
	return str.substring(0, 8) + '-' + str.substring(8, 12) + '-' + str.substring(12, 16) + '-' + str.substring(16, 20) + '-' + str.substring(20);
}

// find the siid in the deployer report
function find_siid_in_dep_region(region, siid) {
	const dep_siid = convert_siid(siid);
	if (dep_reports[region] && dep_reports[region][dep_siid]) {
		return dep_reports[region][dep_siid];
	} else {
		return null;
	}
}

// find the component for this siid in the deployer report
function found_component_in_dep_siid(deployers_siid_section, dep_component_id) {
	for (let i in deployers_siid_section) {
		const comp = deployers_siid_section[i];
		if (comp.status === 'created' && comp.name === dep_component_id) {
			return true;
		}
	}
	return false;
}

// iter over the deployer reports...
function parse_deployer_reports() {
	for (let region in dep_reports) {
		console.log('working deployer region', region);
		for (let siid in dep_reports[region]) {
			const athena_siid = siid.replace(/-/g, '');							// convert to athena's siid

			if (!report[region]) {												// init region
				report[region] = {
					siid_comp_errs: {},
					siids_missing_in_deployer: [],
					siids_missing_in_athena: [],
				};
			}
			if (!report[region].siid_comp_errs[athena_siid]) {					// init siid
				report[region].siid_comp_errs[athena_siid] = {};
			}

			const athena_siid_part = find_siid_in_athena_region(region, athena_siid);	// find the siid
			if (!athena_siid_part) {
				//console.error('siid is missing in athena', region, athena_siid);
				report[region].siids_missing_in_athena.push(athena_siid);		// siid not found, record it
				report.summary.siids_in_deployer_not_in_athena++;
			} else {

				for (let i in dep_reports[region][siid]) {						// iter on components in the siid
					const component = dep_reports[region][siid][i];
					if (component.status === 'created') {						// skip deleted ones

						const component_id = dep_reports[region][siid][i].name;
						const found_comp = found_component_in_athena_siid(athena_siid_part, component_id);
						if (!found_comp) {										// comp not found, record it
							console.error('athena is missing component id', region, siid, component_id);

							if (!report[region].siid_comp_errs[athena_siid].missing_comps_in_athena) {
								report[region].siid_comp_errs[athena_siid].missing_comps_in_athena = [];
							}
							report[region].siid_comp_errs[athena_siid].missing_comps_in_athena.push(component_id);
							report.summary['comps_in_deployer_not_in_athena(over-charging)']++;
						}
					}
				}
			}
		}
	}
}


// find the siid in the athena report
function find_siid_in_athena_region(region, athena_siid) {
	if (athena_report[region] && athena_report[region][athena_siid]) {
		return athena_report[region][athena_siid];
	} else {
		return null;
	}
}

// find the component for this siid in the athena report
function found_component_in_athena_siid(athenas_siid_section, dep_component_id) {
	for (let i in athenas_siid_section) {
		const comp = athenas_siid_section[i];
		if (comp.imported !== true && comp.name === dep_component_id) {
			return true;
		}
	}
	return false;
}

// edit the report to only have siids with missing components
function only_comp_errors_in_report(the_report) {
	for (let region in the_report) {
		if (region === 'summary') {
			continue;
		}
		for (let siid in the_report[region].siid_comp_errs) {
			if (the_report[region].siid_comp_errs[siid]) {

				// if no errors, delete siid's record in report
				if (!the_report[region].siid_comp_errs[siid].missing_comps_in_athena && !the_report[region].siid_comp_errs[siid].missing_comps_in_deployer) {
					delete the_report[region].siid_comp_errs[siid];
				} else {
					add_to_buckets(region, siid);
				}
			}
		}
	}
}

function calc_weeks_old(timestamp) {
	const elasped_ms = Date.now() - timestamp;
	return Math.round(elasped_ms / 1000 / 60 / 60 / 24 / 7);
}

function find_age(region, siid) {
	if (dates_report && dates_report[region] && dates_report[region][siid]) {
		return calc_weeks_old(dates_report[region][siid]);
	}
}

function add_to_buckets(region, siid) {
	const age = find_age(region, siid);
	if (age) {
		const key = 'weeks_old_' + pad(age);
		buckets[key] += '*****';
	}
}

function pad(str) {
	if (!isNaN(str)) {
		str = str.toString();
		for (let i = str.length; i < 3; i++) {
			str = '0' + str;
		}
	}
	return str;
}
