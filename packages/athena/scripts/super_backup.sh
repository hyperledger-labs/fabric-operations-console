#!/usr/bin/env bash
# ---- run this script from ./scripts ---- #

echo "super saas backup starting..."
node backup_saas.js prod_ap_north.json
node backup_saas.js prod_ap_south.json
node backup_saas.js prod_eu_central.json
node backup_saas.js prod_uk_south.json
node backup_saas.js prod_us_east.json
node backup_saas.js prod_us_south.json
echo "super saas backup done!"
