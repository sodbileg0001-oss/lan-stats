const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
for (const name of ['index.html', 'assets', 'vendor']) {
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}
console.log('Built dist/ — HTML, styles, scripts, and match data.');
