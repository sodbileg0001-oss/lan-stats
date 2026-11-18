const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const LAN = require('../assets/core.js');

function syncAvatars() {
  const root = path.resolve(__dirname, '..');
  const directory = path.join(root, 'Profile pictures');
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/data.js'), 'utf8'), context);
  const players = LAN.players(context.window.LAN_DATA.matches);
  const pictures = {};
  const files = fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).filter(file => file.isFile() && /\.(jpe?g|png|webp)$/i.test(file.name)).sort((a, b) => a.name.localeCompare(b.name)) : [];
  for (const file of files) {
    const name = path.parse(file.name).name;
    const matches = players.filter(p => LAN.key(p.name) === LAN.key(name));
    if (!matches.length) continue;
    if (matches.length !== 1) throw new Error('Profile picture must match one player name: ' + file.name);
    const player = matches[0];
    if (pictures[player.id]) throw new Error('Multiple profile pictures for ' + player.name);
    pictures[player.id] = ['Profile pictures', file.name].map(encodeURIComponent).join('/');
  }
  fs.writeFileSync(path.join(root, 'assets/avatars.js'), 'window.LAN_AVATARS = ' + JSON.stringify(pictures).replace(/</g, '\\u003c') + ';\n');
  return Object.keys(pictures).length;
}

module.exports = syncAvatars;
if (require.main === module) console.log('Matched ' + syncAvatars() + ' profile pictures to players.');
