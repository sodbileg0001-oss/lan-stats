const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
// This generated output belongs to the build; refuse any path outside the project.
if (path.dirname(out) !== root || path.basename(out) !== 'dist') throw new Error('Unsafe build directory.');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of ['index.html', 'assets']) {
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}
console.log('Built dist/ — HTML, styles, scripts, and match data.');
