const fs = require('node:fs');
const path = require('node:path');
const X = require('../vendor/xlsx.full.min.js');
const LAN = require('../assets/core.js');
const filename = process.argv[2] || 'lan data.xlsx';
const wb = X.read(fs.readFileSync(filename), { type: 'buffer', sheets: ['Database', 'Duel sheet'], cellFormula: false });
if (!wb.Sheets.Database) throw new Error('Expected a Database sheet with player-match statistics.');
const rows = X.utils.sheet_to_json(wb.Sheets.Database, { header: 1, defval: null, blankrows: false });
const parsed = LAN.parseRows(rows, { filename: path.basename(filename) });
const duelRows = wb.Sheets['Duel sheet'] ? X.utils.sheet_to_json(wb.Sheets['Duel sheet'], { header: 1, defval: null, blankrows: false }) : null;
const duels = duelRows ? LAN.parseDuelSheet(duelRows) : [];
const players = LAN.players(parsed.matches), playerAliases = [];
// The workbook may omit a decorative heart from a nickname on the duel sheet.
// Resolve only a unique match; retain the sheet's original names and score text.
const comparableName = name => LAN.key(name).normalize('NFKC').replace(/[\u2661\u2665\u2764\uFE0F]+$/u, '').trim();
function resolveDuelPlayer(name) {
  const exact = players.find(p => LAN.key(p.name) === LAN.key(name));
  if (exact) return exact.id;
  const candidates = players.filter(p => comparableName(p.name) === comparableName(name));
  if (candidates.length > 1) throw new Error('Ambiguous duel nickname: ' + name);
  if (!candidates.length) return LAN.playerId(name);
  const player = candidates[0];
  if (!playerAliases.some(a => a.from === name)) playerAliases.push({ source: 'Duel sheet', from: name, to: player.name, playerId: player.id });
  return player.id;
}
for (const duel of duels) {
  duel.playerId = resolveDuelPlayer(duel.player);
  duel.opponentId = resolveDuelPlayer(duel.opponent);
}
const data = { version: 1, source: path.basename(filename), sheet: 'Database', matches: parsed.matches, duels, duelSource: 'Duel sheet', playerAliases, warnings: parsed.warnings };
fs.writeFileSync(path.join(__dirname, '../assets/data.js'), 'window.LAN_DATA = ' + JSON.stringify(data).replace(/</g, '\\u003c') + ';\n');
console.log(JSON.stringify({ players: players.length, matches: data.matches.length, records: parsed.count, duelRecords: duels.length, playerAliases, warnings: parsed.warnings }, null, 2));
