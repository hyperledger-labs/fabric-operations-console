#!/usr/bin/env bash
# ---- run this script from ./scripts ---- #

echo "super saas start - starting..."
node start_athena_mass.js prod_ap_north.json
node start_athena_mass.js prod_ap_south.json
node start_athena_mass.js prod_eu_central.json
node start_athena_mass.js prod_uk_south.json
node start_athena_mass.js prod_us_east.json
node start_athena_mass.js prod_us_south.json
echo "super saas start - done!"
