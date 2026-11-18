(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.LANWorkbook = factory(root.LAN);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  function validate(data) {
    if (data?.version !== 1 || !Array.isArray(data.matches) || !data.matches.length || !Array.isArray(data.duels)) throw new Error('The workbook must contain at least one match.');
    const ids = new Set();
    for (const match of data.matches) {
      if (!match.id || ids.has(match.id)) throw new Error('Each match needs a unique Match ID. Keep all rows for each match together.');
      ids.add(match.id);
      if (typeof match.map !== 'string' || !Array.isArray(match.rows) || !match.rows.length || !Array.isArray(match.teams) || match.teams.length !== 2) throw new Error('Every match must contain players from two teams.');
      const players = new Set();
      for (const row of match.rows) {
        if (typeof row.player !== 'string' || !row.player.trim() || row.playerId !== C.playerId(row.player) || players.has(row.playerId) || typeof row.team !== 'string' || !match.teams.some(t => t.name === row.team) || !Number.isInteger(row.kills) || row.kills < 0 || !Number.isInteger(row.deaths) || row.deaths < 0) throw new Error('A match contains invalid or repeated player statistics.');
        players.add(row.playerId);
        for (const field of ['assists', 'damage', 'adr', 'kast', 'opening', 'trades', 'ttk', 'awpTime', 'accuracy', 'rifleHs', 'pistolHs', 'firstBullet', 'flashes', 'impactFlashes', 'enemiesFlashed', 'flashDuration', 'grenade', 'smokes', 'fire', 'he', 'mvp', 'clutches', 'rounds', 'roundsWon']) {
          if (row[field] != null && (!C.finite(row[field]) || row[field] < 0)) throw new Error('Invalid ' + field + ' for ' + row.player + '. Statistics must be non-negative numbers or blank.');
        }
      }
    }
    for (const duel of data.duels) if (typeof duel.player !== 'string' || typeof duel.opponent !== 'string' || !Number.isInteger(duel.kills) || duel.kills < 0 || !Number.isInteger(duel.deaths) || duel.deaths < 0) throw new Error('The duel sheet contains invalid scores.');
    return data;
  }
  function read(workbook, options = {}) {
    const database = workbook.Sheets.Database, duels = workbook.Sheets['Duel sheet'];
    if (!database || !duels) throw new Error('Choose an Excel file with both Database and Duel sheet. Keep these sheet names unchanged.');
    // SheetJS is supplied by the caller so the large parser can stay in a worker.
    const X = options.X;
    const rows = X.utils.sheet_to_json(database, { header: 1, defval: null, blankrows: false });
    const header = rows.findIndex(r => r.some(c => C.fields.player.includes(C.key(c))) && r.some(c => C.key(c) === 'kills'));
    if (header >= 0) {
      const mapping = C.mappings(rows[header]), column = mapping.date;
      if (column >= 0) for (const row of rows.slice(header + 1)) {
        const date = row[column];
        if (Object.prototype.toString.call(date) === '[object Date]' && Number.isFinite(date.getTime())) row[column] = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
      }
      const text = new Set(['player', 'team', 'result', 'map', 'matchId', 'date', 'sourceKd', 'sourceKda']);
      rows.slice(header + 1).forEach((row, i) => {
        if (!C.key(row[mapping.player])) return;
        for (const [field, col] of Object.entries(mapping)) {
          if (col < 0 || text.has(field)) continue;
          const value = row[col], raw = String(value ?? '').trim();
          if (!raw || /^(?:n\/?a|#|—|-)$/i.test(raw)) continue;
          if (C.number(value) === null) throw new Error('Row ' + (header + i + 2) + ': ' + rows[header][col] + ' must be a number or blank.');
        }
      });
    }
    const filename = options.filename || 'Workbook.xlsx';
    const parsed = C.parseRows(rows, { filename });
    if (!parsed.matches.length) throw new Error('The workbook must contain at least one match.');
    const invalid = parsed.warnings.filter(w => /excluded|without a player|unknown result|date left unavailable/.test(w));
    if (invalid.length) throw new Error(invalid.slice(0, 4).join(' '));
    const entries = C.parseDuelSheet(X.utils.sheet_to_json(duels, { header: 1, defval: null, blankrows: false }));
    const players = C.players(parsed.matches), playerAliases = [];
    const comparable = name => C.key(name).normalize('NFKC').replace(/[\u2661\u2665\u2764\uFE0F]+$/u, '').trim();
    function resolve(name) {
      const exact = players.find(p => C.key(p.name) === C.key(name));
      if (exact) return exact.id;
      const candidates = players.filter(p => comparable(p.name) === comparable(name));
      if (candidates.length !== 1) throw new Error('Duel player "' + name + '" must match one nickname in Database.');
      const p = candidates[0];
      if (!playerAliases.some(a => a.from === name)) playerAliases.push({ source: 'Duel sheet', from: name, to: p.name, playerId: p.id });
      return p.id;
    }
    for (const entry of entries) { entry.playerId = resolve(entry.player); entry.opponentId = resolve(entry.opponent); }
    return validate({ version: 1, source: filename, sheet: 'Database', matches: parsed.matches, duels: entries, duelSource: 'Duel sheet', playerAliases, warnings: parsed.warnings });
  }
  const revision = data => C.hash(JSON.stringify([data.matches, data.duels || []]));
  const templateHeaders = ['Match ID', 'Date', 'Map', 'Player', 'Team', 'Result', 'Total Rounds', 'Rounds Won', 'Kills', 'Deaths', 'Assists', 'Damage', 'ADR', 'HLTV 2.1 rating', 'KAST %', 'Open Kills', 'Trade Kills', 'Accuracy %', 'HS % (Rifle)', 'HS % (Pistol)', 'First Bullet Accuracy %', 'Time to Kill (s)', 'AWP Damage Time (s)', 'Flash Assists', 'Impactful Flash Assists', 'Enemies Flashed', 'Total Flash Duration (s)', 'Grenade Damage', 'Smokes Used', 'Enemies Damaged with Fire', 'Enemies Damaged with HE', 'MVP', 'Clutches'];
  const serialize = data => 'window.LAN_DATA = ' + JSON.stringify(validate(data)).replace(/</g, '\\u003c') + ';\n';
  function deserialize(text) {
    const match = text.match(/^\s*window\.LAN_DATA\s*=\s*([\s\S]+);\s*$/);
    if (!match) throw new Error('The shared dataset could not be read.');
    return validate(JSON.parse(match[1]));
  }
  return { read, validate, revision, serialize, deserialize, templateHeaders };
});
