const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../assets/core.js');
const context = { window: {} }; vm.runInNewContext(fs.readFileSync('assets/data.js', 'utf8'), context);
const data = JSON.parse(JSON.stringify(context.window.LAN_DATA));
const headers = ['Player', 'Team', 'Result', 'Kills', 'Deaths', 'Assists', 'Map', 'HLTV 2.1 rating', 'KAST %', 'ADR'];
test('original workbook produces exactly five matches, fifty records, twelve real players', () => {
  assert.equal(data.matches.length, 5); assert.equal(data.matches.flatMap(m => m.rows).length, 50); assert.equal(C.players(data.matches).length, 12);
  assert.equal(new Set(data.matches.map(m => m.map)).size, 4);
  for (const m of data.matches) { assert.equal(m.rows.length, 10); assert.equal(m.teams.length, 2); assert.equal(m.rounds, null); assert.equal(m.date, null); }
});
test('every career profile agrees with its original source kills, deaths, damage, and official ratings', () => {
  for (const p of C.players(data.matches)) {
    const total = k => p.rows.reduce((sum, r) => sum + r.raw[k], 0);
    assert.equal(p.stats.kills, total('Kills')); assert.equal(p.stats.deaths, total('Deaths')); assert.equal(p.stats.damage, total('Damage'));
    assert.equal(p.stats.kd, total('Kills') / total('Deaths'));
    assert.equal(p.stats.rating, total('HLTV 2.1 rating') / p.rows.length);
    assert.equal(p.stats.mvp, null); assert.equal(p.stats.clutches, null);
  }
});
test('displayed ratios are recalculated while contradictory original values are preserved', () => {
  const r = data.matches[0].rows.find(r => r.player === 'Tuvshoko');
  assert.equal(r.raw['K/D'], '0.00x'); assert.equal(C.aggregate([r]).kd, 21 / 11); assert.equal(r.rating, 1.82);
});
test('zero and absent values are handled without NaN or invented metrics', () => {
  assert.equal(C.ratio(12, 0), Infinity); assert.equal(C.ratio(0, 0), null); assert.equal(C.ratio(null, 2), null);
  const a = C.aggregate([{ kills: 0, deaths: 0, assists: 0, flashes: 0 }]);
  assert.equal(a.flashes, 0); assert.equal(a.kd, null); assert.equal(a.rating, null); assert.equal(a.mvp, null); assert.equal(a.winRate, null);
});
test('parser supports reordered columns, zero values, blanks, and explicit percentage encodings', () => {
  const rows = [headers, ['Real player', 'A', 'WIN', 0, 5, 0, 'de_mirage', 1.25, .83, 75]];
  const points = C.parseRows(rows), fractions = C.parseRows(rows, { percentMode: 'fractions' });
  assert.equal(points.matches[0].rows[0].kast, .83); assert.equal(fractions.matches[0].rows[0].kast, 83);
  assert.equal(points.matches[0].rows[0].kills, 0); assert.equal(points.matches[0].map, 'Mirage');
  const order = [6, 1, 4, 0, 5, 2, 3, 9, 8, 7], reordered = rows.map(row => order.map(i => row[i]));
  assert.equal(C.parseRows(reordered).matches[0].rows[0].rating, 1.25);
});
test('invalid rows are excluded and original extra columns are retained', () => {
  const parsed = C.parseRows([[...headers, 'Custom metric'], ['A', 'A', 'WIN', 4, 2, 3, 'Mirage', 1, 80, 70, 'original'], ['B', 'B', 'LOSS', -1, 2, 0, 'Mirage', 1, 80, 70, null]]);
  assert.equal(parsed.count, 1); assert.equal(parsed.matches[0].rows[0].raw['Custom metric'], 'original'); assert.ok(parsed.warnings.some(s => s.includes('invalid')));
});
test('same workbook cannot add duplicate matches, conflicts never overwrite silently', () => {
  assert.equal(C.merge(data.matches, data.matches).matches.length, 5); assert.equal(C.merge(data.matches, data.matches).duplicates.length, 5);
  const changed = structuredClone(data.matches[0]); changed.fingerprint = 'changed'; changed.rows[0].kills += 1;
  const rejected = C.merge(data.matches, [changed]); assert.equal(rejected.conflicts.length, 1); assert.equal(rejected.matches[0].fingerprint, data.matches[0].fingerprint);
  assert.equal(C.merge(data.matches, [changed], true).matches[0].fingerprint, 'changed');
});
test('head-to-head counts only opposing teams, never teammates', () => {
  const a = C.playerId('Juugii'), teammate = C.playerId('Tuvshoko'), opponent = C.playerId('Amka');
  assert.equal(C.headToHead(data.matches, a, teammate).games.length, 0);
  const duel = C.headToHead(data.matches, a, opponent); assert.equal(duel.games.length, 5); assert.equal(duel.a.wins, 3); assert.equal(duel.b.wins, 2);
});
test('rankings enforce sample thresholds and complete metric coverage', () => {
  const ps = C.players(data.matches); assert.equal(C.rank(ps, 'mvp', 1).length, 0); assert.equal(C.rank(ps, 'rating', 10).length, 0);
  const p = structuredClone(ps[0]); p.stats.adrSamples = p.stats.matches - 1; assert.equal(C.rank([p], 'adr', 1).length, 0);
  assert.ok(C.rank(ps, 'rating', 2).every(p => p.stats.matches >= 2));
});
test('duel sheet preserves all 76 original directional records and reciprocal scores', () => {
  assert.equal(data.duels.length, 76);
  const pairs = new Set();
  for (const r of data.duels) {
    const reverse = data.duels.find(o => o.playerId === r.opponentId && o.opponentId === r.playerId);
    assert.ok(reverse); assert.equal(r.kills, reverse.deaths); assert.equal(r.deaths, reverse.kills);
    const score = r.sourceValue.match(/^(\d+):(\d+)/);
    assert.equal(r.kills, Number(score[1])); assert.equal(r.deaths, Number(score[2]));
    pairs.add([r.playerId, r.opponentId].sort().join('/'));
  }
  assert.equal(pairs.size, 38);
  assert.equal(data.duels.reduce((n, r) => n + r.kills, 0), 749);
});
test('duel win rate uses direct encounters rather than match wins', () => {
  const standings = C.duelStandings(data.duels), p = standings.find(p => p.name === 'Juugii');
  assert.equal(standings.length, 12); assert.equal(p.kills, 98); assert.equal(p.deaths, 67);
  assert.equal(p.encounters, 165); assert.equal(p.winRate, 98 / 165 * 100);
  assert.equal(data.duels.some(r => r.player === 'Juugii' && r.opponent === 'Tuvshoko'), false);
});
test('duel parser retains sparse cells and rejects contradictory records', () => {
  const rows = [['A/B', 'Alice', 'Bob'], ['Alice', null, '11:7\n(+4)'], ['Bob', '7:11\n(-4)', null]];
  const parsed = C.parseDuelSheet(rows);
  assert.equal(parsed.length, 2); assert.equal(parsed[0].sourceValue, rows[1][2]);
  assert.equal(parsed[0].kills, 11); assert.equal(parsed[0].deaths, 7);
  assert.equal(C.parseDuelSheet([['A/B', 'Alice', 'Bob'], ['Alice', null, null]]).length, 0);
  assert.throws(() => C.parseDuelSheet([rows[0], rows[1], ['Bob', '7:12', null]]), /disagree/);
  assert.throws(() => C.parseDuelSheet([rows[0], ['Alice', null, 'unknown']]), /Invalid duel score/);
});
