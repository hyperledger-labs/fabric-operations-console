# ------------------------------------------------------------------------
# This script will clone and modify an IBP swagger doc, making separate copies for Saas and Software APIs
# ------------------------------------------------------------------------

# ----------------------------
# 02/18/2020 - WARNING - this file is no longer called - see other_apis to get the swagger file - dsh (this file might come back)
# ----------------------------

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Where the script lives

DOCS_DIR=$DIR/../ibp-docs
SRC_PATH=$DOCS_DIR/ibp.yaml

PUBLIC_DIR=$DIR/../public
DST_SAAS_PATH=$PUBLIC_DIR/ibp_saas_swagger.yaml
DST_ICP_PATH=$PUBLIC_DIR/ibp_software_swagger.yaml

# [ Get swagger doc from cloud-api-docs/ibp ] - use the test branch b/c production is updated after this build is created...
git clone --single-branch --branch test --depth 1 "https://$CI_GITHUB_TOKEN@github.ibm.com/cloud-api-docs/ibp.git" "$DOCS_DIR"
ls "$DOCS_DIR"
cp "$SRC_PATH" "$DST_SAAS_PATH"
cp "$SRC_PATH" "$DST_ICP_PATH"
ls "$PUBLIC_DIR"

# [ Build the ICP swagger doc ]
sed -i "s/Blockchain Service Support/Blockchain Service Support Software/g" "$DST_ICP_PATH"
sed -i "s/BearerAuth/BasicAuth/g" "$DST_ICP_PATH"
sed -i "s/Bearer <token>/Basic <auth here>/g" "$DST_ICP_PATH"
sed -i "s/Bearer <IAM_token>/Basic <auth here>/g" "$DST_ICP_PATH"
sed -i "s/The IAM access token./Form basic auth with your username\/password or api_key\/api_secret./g" "$DST_ICP_PATH"
sed -i "s/This doc lists APIs that you can use to interact with your IBM Blockchain Platform console./This doc lists APIs that you can use to interact with your IBM Blockchain Platform console. This file is built for running IBP in \"Software\" mode (which has a differnet apis set than SaaS)./g" "$DST_ICP_PATH"
sed -i "s/###//g" "$DST_ICP_PATH"
cat "$DST_ICP_PATH"
