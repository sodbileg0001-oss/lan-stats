const { test } = require('node:test');
const assert = require('node:assert/strict');
const X = require('../vendor/xlsx.full.min.js');
const C = require('../assets/core.js');
const W = require('../assets/workbook.js');
const P = require('../assets/publisher.js');

const headers = ['Match ID', 'Player', 'Team', 'Result', 'Kills', 'Deaths', 'Assists', 'Map', 'HLTV 2.1 rating', 'ADR', 'Date'];
function workbook(rows, duels = [['A/B', 'Alice', 'Bob'], ['Alice', null, '11:7'], ['Bob', '7:11', null]]) {
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([headers, ...rows]), 'Database');
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(duels), 'Duel sheet');
  return wb;
}
function rows() { return [['game-1', 'Alice', 'Blue', 'WIN', 11, 7, 0, 'Nuke', 1.2, 80, '2026-11-18'], ['game-1', 'Bob', 'Red', 'LOSS', 7, 11, 3, 'Nuke', .8, 60, '2026-11-18']]; }
const parse = wb => W.read(wb, { X, filename: 'Test.xlsx' });
const dataset = () => parse(workbook(rows()));
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const metadata = data => ({ sha: 'a'.repeat(40), encoding: 'base64', content: Buffer.from(W.serialize(data)).toString('base64') });

test('two-sheet import preserves raw values, matches, ratings, dates, and direct duel scores', () => {
  const original = workbook(rows());
  const saved = X.read(X.write(original, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer', cellDates: true });
  const data = parse(saved);
  assert.equal(data.matches.length, 1); assert.equal(data.matches[0].date, '2026-11-18');
  assert.equal(data.matches[0].rows[0].assists, 0); assert.equal(data.matches[0].rows[0].rating, 1.2);
  assert.equal(data.matches[0].rows[0].raw.Player, 'Alice');
  assert.equal(data.duels[0].sourceValue, '11:7'); assert.equal(data.duels[0].kills, 11);
  assert.equal(data.matches[0].rows[0].kast, null);
  const dates = rows(); dates.forEach(row => { row[10] = new Date(2026, 10, 18); });
  assert.equal(parse(workbook(dates)).matches[0].date, '2026-11-18');
});

test('incomplete or invalid workbooks cannot silently drop rows or publish', () => {
  const missing = workbook(rows()); delete missing.Sheets['Duel sheet'];
  assert.throws(() => parse(missing), /both Database and Duel sheet/);
  assert.throws(() => parse(workbook([])), /at least one match/);
  const invalid = rows(); invalid[0][4] = -1;
  assert.throws(() => parse(workbook(invalid)), /excluded/);
  const unknownResult = rows(); unknownResult[0][3] = 'WON';
  assert.throws(() => parse(workbook(unknownResult)), /unknown result/);
  assert.throws(() => parse(workbook(rows().slice(0, 1), [['A/B']])), /two teams/);
  const repeated = [...rows(), ...rows().map(r => { const next = [...r]; next[0] = 'game-2'; return next; }), ...rows()];
  assert.throws(() => parse(workbook(repeated)), /unique Match ID/);
  const textStat = rows(); textStat[0][9] = 'invalid ADR';
  assert.throws(() => parse(workbook(textStat)), /ADR must be a number/);
  const negativeUtility = workbook(rows());
  X.utils.sheet_add_aoa(negativeUtility.Sheets.Database, [['Enemies Flashed'], [-1]], { origin: 'L1' });
  assert.throws(() => parse(negativeUtility), /Invalid enemiesFlashed/);
});

test('duel imports validate reciprocal scores and resolve only real unambiguous nicknames', () => {
  assert.throws(() => parse(workbook(rows(), [['A/B', 'Alice', 'Bob'], ['Alice', null, '11:7'], ['Bob', '8:11', null]])), /disagree/);
  assert.throws(() => parse(workbook(rows(), [['A/B', 'Unknown'], ['Alice', '11:7']])), /must match one nickname/);
  const names = rows(); names[0][1] = 'Alice♥';
  const data = parse(workbook(names));
  assert.equal(data.duels[0].playerId, C.playerId('Alice♥'));
  assert.equal(data.duels[0].player, 'Alice'); assert.equal(data.playerAliases[0].to, 'Alice♥');
  assert.equal(parse(workbook(rows(), [['A/B']])).duels.length, 0);
});

test('shared data is parsed as JSON and serialized without executable spreadsheet text', () => {
  const data = dataset(); data.matches[0].rows[0].raw.Note = '<script>alert(1)</script>';
  const serialized = W.serialize(data);
  assert.equal(serialized.includes('<script>'), false);
  assert.deepEqual(W.deserialize(serialized), data);
  assert.throws(() => W.deserialize('window.LAN_DATA = (globalThis.executed = true);'), /JSON|Unexpected/);
  assert.equal(globalThis.executed, undefined);
  const mapped = C.mappings(W.templateHeaders);
  for (const field of Object.keys(C.fields).filter(f => !['sourceKd', 'sourceKda', 'score'].includes(f))) assert.ok(mapped[field] >= 0, field);
});

test('publishing writes only the shared dataset to the intended branch with a concurrency SHA', async () => {
  const data = dataset(), token = 'test-token-not-a-real-credential', calls = [];
  data.matches[0].rows[0].raw.Note = 'Unicode: ♥ Монгол';
  const saved = await P.publish(data, token, W.revision(data), async (url, options) => {
    calls.push({ url, options });
    return response(calls.length === 1 ? metadata(data) : { commit: { sha: 'b'.repeat(40) } });
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://api.github.com/repos/sodbileg0001-oss/lan-stats/contents/assets/data.js');
  assert.equal(calls[1].options.method, 'PUT');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer ' + token);
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.branch, 'main'); assert.equal(body.sha, 'a'.repeat(40));
  assert.deepEqual(W.deserialize(Buffer.from(body.content, 'base64').toString('utf8')), data);
  assert.equal(calls[1].options.body.includes(token), false);
  assert.equal(saved.url, 'https://github.com/sodbileg0001-oss/lan-stats/commit/' + 'b'.repeat(40));
});

test('publishing rejects stale data, expired credentials, concurrent changes, and uncertain writes', async () => {
  const data = dataset(), changed = dataset(); changed.matches[0].rows[0].kills++;
  let writes = 0;
  await assert.rejects(P.publish(data, 'token', W.revision(data), async (url, opts) => { if (opts.method === 'PUT') writes++; return response(metadata(changed)); }), /newer workbook/);
  assert.equal(writes, 0);
  await assert.rejects(P.publish(data, 'token', W.revision(data), async () => response({}, 401)), /did not allow/);
  await assert.rejects(P.publish(data, 'token', W.revision(data), async (url, opts) => response(opts.method === 'PUT' ? {} : metadata(data), opts.method === 'PUT' ? 409 : 200)), /shared data changed/);
  await assert.rejects(P.publish(data, 'token', W.revision(data), async (url, opts) => { if (opts.method === 'PUT') throw new Error('timeout'); return response(metadata(data)); }), /could not be confirmed/);
});

test('larger shared datasets use their exact blob SHA when GitHub omits inline content', async () => {
  const data = dataset(), urls = [];
  await P.publish(data, 'token', W.revision(data), async url => {
    urls.push(url);
    return response(urls.length === 1 ? { sha: 'a'.repeat(40), encoding: 'none' } : urls.length === 2 ? metadata(data) : { commit: { sha: 'b'.repeat(40) } });
  });
  assert.equal(urls[1], 'https://api.github.com/repos/sodbileg0001-oss/lan-stats/git/blobs/' + 'a'.repeat(40));
});
