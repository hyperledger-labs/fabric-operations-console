const fs = require('fs-extra')
const path = require('path')

const from = __dirname;
const dist = path.join(__dirname, '..', 'dist');

console.log('Copying protobuf bundles to dist');

// Get files ending with .json
const files = fs.readdirSync(from).filter((file) => file.endsWith('.json'));

fs.ensureDirSync(dist);

// Copy protobuf-bundles over to dist
files.forEach(file => fs.copySync(path.join(from, file), path.join(dist, file)));
