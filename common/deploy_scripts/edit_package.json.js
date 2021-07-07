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
*/
//------------------------------------------------------------
// edit_package.json.js - remove dev dependencies from package.json to prevent npm audit from failing on dev modules
//------------------------------------------------------------
const fs = require('fs');
const package_json = JSON.parse(fs.readFileSync('./package.json'));
fs.writeFileSync('./package.orig.json', JSON.stringify(package_json, null, '\t'));
delete package_json.devDependencies;
fs.writeFileSync('./package.json', JSON.stringify(package_json, null, '\t'));
